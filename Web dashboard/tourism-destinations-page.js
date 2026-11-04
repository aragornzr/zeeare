(() => {
  const host = document.querySelector('#tourism-destinations-panel');
  let session, epoch=0, busy=false, loaded=false, error='', message='', destinations=[], personnel=[], pageToken=null;
  let version=0, canEdit=false, canDelegate=false, id='', draft='', active=true;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const button=(label,action)=>{const n=el('button',label);n.type='button';n.className='nav-action';n.disabled=busy;n.addEventListener('click',action);return n;};
  const permitted=()=>session && DashboardPolicy.hasAccess(session.user.uid,session.claims,'dashboard') && DashboardPolicy.hasAccess(session.user.uid,session.claims,'tourism');
  async function call(name,data){const [{auth},{getFunctions,httpsCallable}]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js')]);return (await httpsCallable(getFunctions(auth.app,'asia-southeast1'),name)(data)).data;}
  async function load(){
    if(!permitted()||busy)return;
    const generation=epoch;busy=true;error='';render();
    try{const data=await call('getTourismDestinations',{});if(generation!==epoch)return;
      destinations=data.destinations.slice().sort((a,b)=>a.name.localeCompare(b.name));version=data.version;canEdit=data.canEdit;canDelegate=data.canDelegate;loaded=true;
    }catch(e){if(generation===epoch)error=e.message||'Could not load destinations. Please reload the list.';}
    finally{if(generation===epoch){busy=false;render();}}
  }
  async function save(event){
    event.preventDefault();if(!canEdit||!loaded||busy||!draft.trim())return;
    const generation=epoch;busy=true;error='';message='';render();
    try{await call('saveTourismDestination',{name:draft.trim(),active,version,...(id?{id}:{})});if(generation!==epoch)return;
      draft='';id='';active=true;message='Destination saved.';busy=false;await load();
    }catch(e){if(generation===epoch)error=e.message||'Could not save. Your draft is retained; reload the list before retrying.';}
    finally{if(generation===epoch){busy=false;render();}}
  }
  async function loadPersonnel(append=false){
    if(!canDelegate||busy)return;
    const generation=epoch;busy=true;error='';render();
    try{const data=await call('listTourismDestinationPersonnel',append&&pageToken?{pageToken}:{});if(generation!==epoch)return;
      personnel=append?[...personnel,...data.users]:data.users;pageToken=data.pageToken;
    }catch(e){if(generation===epoch)error=e.message||'Could not load Tourism personnel.';}
    finally{if(generation===epoch){busy=false;render();}}
  }
  async function delegate(user,enabled){
    if(!canDelegate||busy)return;
    const generation=epoch;busy=true;error='';message='';render();
    try{await call('setTourismDestinationEditor',{uid:user.uid,enabled});if(generation!==epoch)return;user.delegated=enabled;message=enabled?'Destination management delegated.':'Destination management removed.';}
    catch(e){if(generation===epoch)error=e.message||'Could not update delegation.';}
    finally{if(generation===epoch){busy=false;render();}}
  }
  function render(){
    host.replaceChildren();host.hidden=!permitted();if(host.hidden)return;
    host.className='dashboard-card communications-card';host.append(el('p','TOURISM'),el('h2','Destinations & resorts'),el('p','Maintain the destination list offered in mobile tourist registration. Inactive entries are hidden from new selections; existing records keep their saved destination.'));
    host.append(button('Reload destinations',load));
    const status=el('p',error||(busy?'Loading…':message));status.setAttribute('role','status');host.append(status);
    if(canEdit){
      const form=el('form');form.addEventListener('submit',save);form.append(el('h3',id?'Edit destination':'Add destination'));
      const label=el('label','Resort / destination name');const field=el('input');field.type='text';field.value=draft;field.maxLength=160;field.required=true;field.disabled=busy;field.addEventListener('input',()=>{draft=field.value;});label.append(field);
      const availability=el('label','Available for new registrations');const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=active;checkbox.disabled=busy;checkbox.addEventListener('change',()=>{active=checkbox.checked;});availability.prepend(checkbox);
      const submit=el('button','Save destination');submit.type='submit';submit.className='primary-button';submit.disabled=busy||!loaded;
      form.append(label,availability,submit);if(id)form.append(button('Cancel edit',()=>{id='';draft='';active=true;render();}));host.append(form);
    }
    const feed=el('div');feed.className='communication-feed';feed.tabIndex=0;feed.setAttribute('aria-label','Saved destinations');
    for(const destination of destinations){const row=el('article');row.className='communication-item';row.append(el('strong',destination.name),el('p',destination.active?'Available':'Inactive'));
      if(canEdit)row.append(button('Edit '+destination.name,()=>{id=destination.id;draft=destination.name;active=destination.active;render();host.querySelector('input[type=text]')?.focus();}));feed.append(row);
    }
    host.append(feed);if(loaded&&!destinations.length)host.append(el('p','No destinations yet. Your Tourism admin can add resorts and usual destinations.'));
    if(canDelegate){
      const panel=el('section');panel.append(el('h3','Delegate destination management'),el('p','Selected Tourism personnel can add, rename and deactivate destinations. Only Tourism admins can delegate. App and dashboard access are assigned separately in Users & permissions.'),button('Load Tourism personnel',()=>loadPersonnel()));
      for(const user of personnel){const row=el('article');row.className='communication-item';row.append(el('strong',user.username||user.email),el('p',user.email+(user.eligible?'':' · Approved Tourism access required')));
        const action=button(user.delegated?'Remove delegation':'Delegate management',()=>delegate(user,!user.delegated));action.disabled=busy||!user.eligible&&!user.delegated;row.append(action);panel.append(row);
      }
      if(pageToken)panel.append(button('Load more personnel',()=>loadPersonnel(true)));host.append(panel);
    }
  }
  function initialize(detail){if(JSON.stringify([session?.user.uid,session?.claims])===JSON.stringify([detail?.user.uid,detail?.claims]))return;
    epoch++;session=detail;busy=false;loaded=false;error='';message='';destinations=[];personnel=[];pageToken=null;canEdit=false;canDelegate=false;version=0;id='';draft='';active=true;render();if(permitted())load();
  }
  document.addEventListener('dashboard-ready',event=>initialize(event.detail));document.addEventListener('dashboard-denied',()=>initialize(null));
  window.addEventListener('pagehide',()=>initialize(null));if(window.dashboardSession)initialize(window.dashboardSession);
})();
