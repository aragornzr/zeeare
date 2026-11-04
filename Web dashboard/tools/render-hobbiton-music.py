#!/usr/bin/env python3
"""Original composition, 'By the Garden Gate'. Deterministic PCM synthesis; no samples."""
import math, random, wave, array, json
from pathlib import Path
RATE=44100; DURATION=40; N=RATE*DURATION
left=array.array('f',[0])*N; right=array.array('f',[0])*N
rng=random.Random(1874)
def freq(midi): return 440*2**((midi-69)/12)
def note(midi,start,duration,level,kind='flute',pan=0):
    hz=freq(midi); count=int(duration*RATE); begin=int(start*RATE)
    phase=rng.random()*math.tau; vibr=rng.random()*math.tau
    lp=0.; pluck=[]
    if kind=='pluck':
        size=max(2,int(RATE/hz)); pluck=[rng.uniform(-1,1) for _ in range(size)]
    gl=math.sqrt((1-pan)/2); gr=math.sqrt((1+pan)/2)
    for i in range(min(count,N-begin)):
        t=i/RATE; release=min(1,(duration-t)/(.25 if kind=='flute' else .5))
        if kind=='pluck':
            k=i%len(pluck); s=pluck[k]; pluck[k]=.497*(s+pluck[(k+1)%len(pluck)])
            env=min(1,t/.004)*math.exp(-t/2.2)*release
        else:
            v=math.sin(math.tau*5.1*t+vibr)*.0025*min(1,t/.4)
            p=math.tau*hz*t+phase+v*hz/5.1
            if kind=='flute':
                lp=.84*lp+.16*rng.uniform(-1,1)
                s=math.sin(p)+.17*math.sin(2*p)+.065*math.sin(3*p)+.05*lp
                env=min(1,t/.075)*release*(.94+.06*math.sin(math.tau*1.9*t))
            else:
                s=sum(math.sin(p*h+(.002*h*t))*a for h,a in [(1,.65),(2,.18),(3,.09),(4,.04)])
                env=min(1,t/.48)*release*(.92+.08*math.sin(math.tau*4.7*t))
        value=s*env*level
        left[begin+i]+=value*gl;right[begin+i]+=value*gr
# 6/8, dotted-quarter = 72. Six eighth notes per bar; 20 bars then breathing tail.
eighth=60/72/3; bar=6*eighth
chords=[(50,57,62,66),(55,59,62,67),(50,57,62,66),(57,61,64,69),
        (59,62,66,71),(55,59,62,67),(52,59,64,67),(57,61,64,69),
        (50,57,62,66),(55,59,62,67),(59,62,66,71),(57,61,64,69),
        (55,59,62,67),(50,57,62,66),(52,59,64,67),(57,61,64,69),
        (55,59,62,67),(57,61,64,69),(50,57,62,66),(50,57,62,66)]
for b,chord in enumerate(chords):
    t=.45+b*bar
    for step,idx in enumerate([0,2,3,1,2,3]):
        note(chord[idx],t+step*eighth+rng.uniform(-.009,.009),2.1,.15 if step%3==0 else .105,'pluck',-.37)
    if b%2==0:
        note(chord[0]-12,t,bar*1.9,.09,'bow',.26)
        note(chord[1]-12,t+.035,bar*1.85,.035,'bow',.48)
# Original two strains with ornaments and deliberate breaths; no borrowed melody.
melody=[[(74,2),(78,1),(76,2),(69,1)],[(71,2),(74,1),(79,2),(78,1)],
[(76,1),(74,2),(69,1),(66,2)],[(73,3),(76,2),(None,1)],
[(78,2),(81,1),(78,1),(76,2)],[(74,2),(71,1),(67,2),(71,1)],
[(76,2),(79,1),(78,2),(74,1)],[(73,3),(69,2),(None,1)],
[(74,1),(78,1),(81,1),(83,2),(81,1)],[(79,2),(78,1),(74,2),(71,1)],
[(78,2),(76,1),(74,1),(71,2)],[(73,3),(76,2),(None,1)],
[(79,2),(78,1),(74,2),(71,1)],[(78,1),(76,1),(74,2),(69,2)],
[(71,2),(76,1),(79,2),(78,1)],[(76,2),(73,1),(69,2),(None,1)],
[(71,1),(74,2),(79,1),(78,2)],[(76,2),(73,1),(69,2),(73,1)],
[(74,6)],[(None,6)]]
for b,phrase in enumerate(melody):
    step=0
    for pitch,length in phrase:
        if pitch is not None: note(pitch,.48+b*bar+step*eighth,length*eighth*.91,.16,'flute',.15)
        step+=length
# Short stereo early reflections plus a restrained diffuse tail; no synthetic outdoor hiss.
for channel in [left,right]:
    dry=array.array('f',channel)
    for delay,gain in [(.037,.075),(.067,.055),(.113,.043),(.173,.033),(.257,.027),(.379,.021),(.541,.014),(.733,.009)]:
        offset=int((delay+(0 if channel is left else .011))*RATE)
        for i in range(offset,N): channel[i]+=dry[i-offset]*gain
peak=max(max(abs(v) for v in left),max(abs(v) for v in right)); scale=.83/peak
pcm=array.array('h')
energy=0
for i in range(N):
    fade=min(1,i/(RATE*.45),(N-i)/(RATE*2.1))
    for ch in [left,right]:
        v=ch[i]*scale*fade;energy+=v*v;pcm.append(round(v*32767))
out=Path(__file__).resolve().parents[1]/'assets/hobbiton/hobbiton-pastoral.wav'
with wave.open(str(out),'wb') as f:
    f.setparams((2,2,RATE,0,'NONE','not compressed'));f.writeframes(pcm.tobytes())
print(json.dumps({'file':str(out),'seconds':DURATION,'peak':.83,'rms':math.sqrt(energy/(2*N)),'sampleRate':RATE,'channels':2}))
