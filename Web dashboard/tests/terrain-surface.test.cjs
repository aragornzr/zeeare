const test=require('node:test'),assert=require('node:assert/strict');
test('near terrain vertices follow the distant tile edge without cracks',async()=>{
 const{terrainGeometry}=await import('../terrain-surface.js');const terrain={height:(x,z)=>Math.sin(x*.13)*7+Math.cos(z*.27)*4};
 const g=terrainGeometry(terrain,{size:100,segments:40,edgeStep:10}),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);assert.ok(Number.isFinite(p.getY(i)));if(Math.abs(x)!==50&&Math.abs(z)!==50)continue;const onX=Math.abs(x)===50,t=onX?z:x,a=Math.floor(t/10)*10,f=(t-a)/10,expected=onX?terrain.height(x,a)*(1-f)+terrain.height(x,a+10)*f:terrain.height(a,z)*(1-f)+terrain.height(a+10,z)*f;assert.ok(Math.abs(p.getY(i)-expected)<.00001);}
 g.dispose();
});
test('distant terrain leaves the detailed center open and has finite upward normals',async()=>{
 const{terrainGeometry}=await import('../terrain-surface.js');const g=terrainGeometry({height:()=>3},{size:1800,segments:180,cutout:300}),p=g.attributes.position,n=g.attributes.normal,idx=g.index;
 for(let i=0;i<idx.count;i+=3){let x=0,z=0;for(let j=0;j<3;j++){const k=idx.getX(i+j);x+=p.getX(k)/3;z+=p.getZ(k)/3;}assert.ok(Math.abs(x)>=300-1e-6||Math.abs(z)>=300-1e-6);}
 for(let i=0;i<n.count;i++)assert.ok(Number.isFinite(n.getY(i))&&n.getY(i)>=0);g.dispose();
});
