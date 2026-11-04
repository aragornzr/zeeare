(() => {
  const host = document.querySelector('#attendance-panel');
  let session, epoch=0, active=false, busy=false, rows=[], cursor=null, department='', error='', changes=[], historyCursor=null, historyId=null;
  const manager=()=>session && (DashboardPolicy.isSuper(session.user.uid,session.claims)||session.claims.role==='admin');
  const departments=()=>!session?[]:DashboardPolicy.isSuper(session.user.uid,session.claims)?Object.keys(DashboardPolicy.departments):(session.claims.departments||[]);
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const button=(text,fn)=>{const n=el('button',text);n.type='button';n.className='nav-action';n.disabled=busy;n.addEventListener('click',fn);return n;};
  const date=value=>value?new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'medium'}).format(new Date(value)):'Not reported';
  const localTime=value=>new Date(new Date(value).valueOf()+8*3600000).toISOString().slice(0,19);
  async function call(name,data){const [{auth},{getFunctions,httpsCallable}]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')]);return (await httpsCallable(getFunctions(auth.app,'asia-southeast1'),name)(data)).data;}
  async function load(append=false){if(!session||busy)return;const version=epoch;busy=true;error='';render();try{const result=await call('listAttendance',{...(manager()?{department}:{scope:'mine'}),...(append&&cursor?{cursor}:{})});if(version!==epoch)return;rows=append?[...rows,...result.records]:result.records;cursor=result.cursor;}catch(e){if(version===epoch)error=e.message||'Could not load attendance.';}finally{if(version===epoch){busy=false;render();}}}
  async function history(row,append=false){if(busy)return;const version=epoch;busy=true;error='';render();try{const result=await call('listAttendanceChanges',{department:row.department,id:row.id,...(append&&historyCursor?{cursor:historyCursor}:{})});if(version!==epoch)return;changes=append?[...changes,...result.changes]:result.changes;historyCursor=result.cursor;historyId=row.id;}catch(e){if(version===epoch)error=e.message||'Could not load correction history.';}finally{if(version===epoch){busy=false;render();}}}
  function edit(row){
    const version=epoch,dialog=el('dialog'),form=el('form');form.append(el('h2','Correct attendance'),el('p',`${row.personName} · ${row.employeeId}. Dates use Philippine time. Original device and biometric evidence are retained.`));
    const time=el('input');time.type='datetime-local';time.step='1';time.value=localTime(row.time);time.required=true;
    const timeLabel=el('label','Date and time (Philippines)');timeLabel.append(time);form.append(timeLabel);
    const action=el('select');for(const [value,label]of [['in','Time in'],['out','Time out']]){const option=el('option',label);option.value=value;action.append(option);}action.value=row.action;const actionLabel=el('label','Attendance action');actionLabel.append(action);form.append(actionLabel);
    const voided=el('input');voided.type='checkbox';voided.checked=row.voided;const voidLabel=el('label','Void this event');voidLabel.prepend(voided);form.append(voidLabel);
    const reason=el('textarea');reason.required=true;reason.minLength=5;reason.maxLength=1000;const reasonLabel=el('label','Reason for correction (required)');reasonLabel.append(reason);form.append(reasonLabel);
    const feedback=el('p');feedback.setAttribute('role','status');const save=el('button','Save correction');save.type='submit';save.className='primary-button';
    form.addEventListener('submit',async event=>{event.preventDefault();if(save.disabled||!form.reportValidity())return;save.disabled=true;feedback.textContent='Saving correction…';try{await call('editAttendance',{department:row.department,id:row.id,revision:row.revision,time:new Date(time.value+'+08:00').toISOString(),action:action.value,voided:voided.checked,reason:reason.value});if(version!==epoch)return;dialog.close();dialog.remove();changes=[];historyId=null;await load();}catch(e){if(version===epoch){feedback.textContent=e.message||'Could not save. Your draft is retained.';save.disabled=false;}}});
    form.append(feedback,save,button('Cancel',()=>{dialog.close();dialog.remove();}));dialog.append(form);host.append(dialog);dialog.showModal();
  }
  function render(){
    // A permission/session change closes editors; periodic token renewal does not.
    host.replaceChildren();host.hidden=!active||!session;if(host.hidden)return;host.className='dashboard-card';
    host.append(el('h2',manager()?'Department attendance':'My attendance'),el('p',manager()?'Review dates, times and reported device/OS details. Corrections require a reason and retain an audit trail.':'Review your time-in and time-out records. Only administrators can correct attendance.'));
    host.append(button('← Overview',()=>document.dispatchEvent(new CustomEvent('department-navigate',{detail:'overview'}))));
    if(manager()){const select=el('select');select.setAttribute('aria-label','Attendance department');select.disabled=busy;for(const key of departments()){const option=el('option',DashboardPolicy.departments[key]);option.value=key;select.append(option);}select.value=department;select.addEventListener('change',()=>{department=select.value;rows=[];cursor=null;changes=[];historyId=null;load();});host.append(select);}
    host.append(button('Refresh attendance',()=>load()),el('p',error||(busy?'Loading attendance…':'')));
    for(const row of rows){const card=el('article');card.className='communication-item';card.append(el('strong',`${manager()?row.personName+' · ':''}${row.action==='in'?'Time in':'Time out'}${row.voided?' · Voided':''}`),el('p',date(row.time)+(row.corrected?' · Corrected':'')));
      if(manager()){const d=row.device||{};card.append(el('p',`${row.employeeId} · ${d.platform||'Unknown'} · ${d.manufacturer||''} ${d.model||'Not reported'} · OS ${d.osVersion||'Not reported'}`),el('small',`Verification: ${row.method} (client-reported). Received: ${date(row.recordedAt)}. Original: ${row.original?.action||''} ${date(row.original?.time)}`),button('Edit attendance',()=>edit(row)),button('Change history',()=>history(row)));}
      host.append(card);
    }
    if(!busy&&!rows.length)host.append(el('p','No synced attendance records yet. Use the updated mobile app to verify and record attendance.'));
    if(cursor)host.append(button('Load older attendance',()=>load(true)));
    if(historyId){host.append(el('h3','Correction history'));if(!changes.length)host.append(el('p','No corrections to this record.'));for(const change of changes)host.append(el('p',`${date(change.changedAt)} · ${change.actorName} · ${change.reason}\nBefore: ${change.before.action} ${date(change.before.time)}${change.before.voided?' (voided)':''}\nAfter: ${change.after.action} ${date(change.after.time)}${change.after.voided?' (voided)':''}`));if(historyCursor)host.append(button('Older corrections',()=>history({department,id:historyId},true)));}
  }
  document.addEventListener('dashboard-ready',event=>{epoch++;session=event.detail;department=departments()[0]||'';rows=[];cursor=null;changes=[];historyId=null;busy=false;render();if(active)load();});
  document.addEventListener('dashboard-denied',()=>{epoch++;session=null;rows=[];changes=[];busy=false;render();});
  document.addEventListener('department-selected',event=>{active=event.detail==='attendance';if(active){document.querySelector('#department-panel').hidden=true;if(!rows.length)load();else render();}else host.hidden=true;});
  if(window.dashboardSession){session=window.dashboardSession;department=departments()[0]||'';}
})();
