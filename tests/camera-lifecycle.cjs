const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function fixture(getUserMedia){
  const elements = new Map(); const timers = [];
  const element = id => {
    if(!elements.has(id)) elements.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},play:async()=>{},srcObject:null});
    return elements.get(id);
  };
  const ctx = vm.createContext({document:{getElementById:element},navigator:{mediaDevices:{getUserMedia}},LANG:'ja',CAM_SUBJECTS:[{target:'x'}],Math,tx:()=>'',t:()=>'',icon:()=>'',setTimeout:fn=>timers.push(fn),clearTimeout(){}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/camera-setup.js'),'utf8'),ctx);
  return {ctx,element,timers,run:s=>vm.runInContext(s,ctx)};
}
test('late permission response after leaving releases stream',async()=>{
  let resolve,stops=0; const f=fixture(()=>new Promise(r=>resolve=r));
  const pending=f.run('startCamPreview()'); f.run('stopCamPreview()');
  resolve({getTracks:()=>[{stop:()=>stops++}]}); await pending;
  assert.equal(stops,1); assert.equal(f.element('cam-video').srcObject,null);
});
test('refusal explains photo-free sample mode',async()=>{
  const f=fixture(async()=>{throw Error('denied')}); await f.run('startCamPreview()');
  assert.match(f.element('cam-status').textContent,/写真なし/);
});
test('cancelled analysis cannot mutate rows or produce a result',()=>{
  const f=fixture(async()=>{}); f.run('camAnalyze(); stopCamPreview()');
  f.run('camResult = () => { throw Error("stale result"); }');
  while(f.timers.length) f.timers.shift()();
  assert.equal(f.timers.length,0);
});
test('stopping preview clears video source and tracks',async()=>{
  let stops=0; const f=fixture(async()=>({getTracks:()=>[{stop:()=>stops++}]}));
  await f.run('startCamPreview()'); f.run('stopCamPreview()');
  assert.equal(stops,1); assert.equal(f.element('cam-video').srcObject,null);
});
test('restarting idle invalidates older session',()=>{
  const f=fixture(()=>new Promise(()=>{})); f.run('camIdle()'); const before=f.run('camSession');
  f.run('camIdle()'); assert.equal(f.run('camSession'),before+1);
});
