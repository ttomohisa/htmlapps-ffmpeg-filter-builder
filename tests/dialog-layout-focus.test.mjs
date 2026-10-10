import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// These CSS contracts and actual-handler DOM doubles are not browser layout,
// native focus, wheel, touch, or FFmpeg execution evidence.
const source = fs.readFileSync(process.argv[2] || new URL('../src/index.template.html', import.meta.url), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing production block: ${start}`);
  return source.slice(from, to);
}
function statement(start) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `Missing production statement: ${start}`);
  return source.slice(from, source.indexOf('\n', from));
}
function rule(selector, text = source) {
  const from = text.indexOf(selector + ' {');
  assert.ok(from >= 0, `Missing CSS rule: ${selector}`);
  return text.slice(from, text.indexOf('}', from));
}

test('CSS contract: native modals alone lock root and body scrolling', () => {
  const css = rule('html:has(dialog:modal), body:has(dialog:modal)');
  assert.match(css, /overflow:\s*hidden/);
  assert.match(rule('#helpDialog[open]'), /display:\s*flex/);
  assert.match(rule('.dialog-body'), /overflow:\s*auto/);
});

test('CSS contract: narrow title and version wrap without shrinking header actions', () => {
  const narrow = block('@media (max-width: 520px)', '/* APP: FFmpeg');
  assert.match(rule('.brand-name', narrow), /flex-wrap:\s*wrap/);
  assert.match(rule('.brand-name', narrow), /white-space:\s*normal/);
  assert.match(rule('.brand-name', narrow), /overflow:\s*visible/);
  assert.match(rule('.version-badge', narrow), /flex:\s*0 0 auto/);
  assert.match(rule('.header-actions'), /flex-shrink:\s*0/);
});

test('CSS contract: Reset has a fixed header and a safe-area scrolling body', () => {
  assert.match(rule('.app-confirm-dialog[open]'), /display:\s*flex/);
  assert.match(rule('.app-confirm-dialog[open]'), /flex-direction:\s*column/);
  assert.match(rule('.app-confirm-dialog[open]'), /100dvh.*safe-area-inset-top/);
  assert.match(rule('.app-confirm-header'), /flex:\s*0 0 auto/);
  for (const pattern of [/min-height:\s*0/, /flex:\s*1 1 auto/, /overflow:\s*auto/, /overscroll-behavior:\s*contain/]) assert.match(rule('.app-confirm-body'), pattern);
  assert.match(source, /\.app-confirm-body \{ padding: 12px 18px calc\(env\(safe-area-inset-bottom\) \+ 18px\)/);
});

test('CSS contract: wrapped toolbar gives normal and floating canvases remaining height', () => {
  assert.match(rule('.graph-panel'), /display:\s*flex/);
  assert.match(rule('.graph-panel'), /flex-direction:\s*column/);
  assert.match(rule('.graph-toolbar'), /flex:\s*0 0 auto/);
  assert.match(rule('.graph-scroll'), /flex:\s*1 1 auto/);
  assert.match(rule('.graph-scroll'), /height:\s*auto/);
  assert.doesNotMatch(rule('.editor-grid.graph-expanded .graph-scroll'), /calc\(|58px/);
  const stacked = block('@media (max-width:1040px)', '@media (max-width:700px)');
  assert.match(rule('.graph-panel', stacked), /display:\s*block/);
  assert.match(rule('.editor-grid.graph-expanded .graph-panel'), /display:\s*flex/);
  assert.match(source, /\.palette-panel \.panel-body, \.inspector-panel \.panel-body \{ height:calc\(100% - 57px\); overflow:auto/);
});

function harness({mobile = true, reference = false} = {}) {
  let doc;
  class Element {
    constructor(id, tag = 'BUTTON', parent = null) {
      Object.assign(this, {id, tagName:tag, parentElement:parent, hidden:false, disabled:false, isConnected:true, open:false, dataset:{}, style:{}, attributes:{}, handlers:{}, visibility:'visible'});
      this.rect = {left:10, top:10, right:110, bottom:50, width:100, height:40};
      const classes = new Set();
      this.classList = {add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on=!classes.has(x))=>on?classes.add(x):classes.delete(x)};
    }
    addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
    dispatch(type, extra = {}) { return Promise.all((this.handlers[type] || []).map(fn => fn({target:this,preventDefault(){},stopPropagation(){},clientX:50,clientY:20,...extra}))); }
    setAttribute(k,v) { this.attributes[k] = v; }
    contains(el) { return el === this || Boolean(el?.parentElement && this.contains(el.parentElement)); }
    matches(selector) { return selector === ':disabled' ? this.disabled : selector === '.node-card' ? Boolean(this.dataset.nodeId) : false; }
    closest(selector) {
      for (let el=this;el;el=el.parentElement) {
        if (selector.includes('[hidden]') && el.hidden || selector.includes('[inert]') && el.inert) return el;
        if (selector.includes('.node-card') && el.dataset.nodeId) return el;
      }
      return null;
    }
    getClientRects() { return this.isConnected && !this.closest('[hidden],[inert]') && this.visible !== false ? [this.rect] : []; }
    getBoundingClientRect() { return this.rect; }
    focus(options) { if (!this.disabled && this.getClientRects().length && this.visibility === 'visible') {doc.activeElement=this;this.focusOptions=options;} }
    showModal() { this.open=true;this.nativeOpener=doc.activeElement; elements.get('appConfirmClose').focus(); }
    close() { this.open=false;doc.activeElement=doc.body;this.nativeOpener?.focus({preventScroll:true});this.onClose?.(); }
  }
  const elements = new Map([...source.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element(match[1])]));
  const body = new Element('body','BODY'), editor=new Element('editor','SECTION'), palette=new Element('palette','ASIDE'), inspector=new Element('inspector','ASIDE');
  doc = {body, documentElement:{lang:'en'}, activeElement:body, getElementById:id=>elements.get(id), querySelector:selector=>selector==='dialog[open]'?[...elements.values()].find(el=>el.open):query(selector),querySelectorAll:selector=>selector==='dialog[open]'?[...elements.values()].filter(el=>el.open):[]};
  const dialog=elements.get('appConfirmDialog');dialog.tagName='DIALOG';
  for (const id of ['appConfirmCancel','appConfirmClose','appConfirmOk']) elements.get(id).parentElement=dialog;
  elements.get('resetGraphButton').parentElement=elements.get('graphActionsPopover');
  for (const id of ['mobilePaletteDoneButton','closePaletteButton','paletteSearchInput']) elements.get(id).parentElement=palette;
  for (const id of ['mobileInspectorDoneButton','closeInspectorButton','inspectorBody']) elements.get(id).parentElement=inspector;
  const card=new Element('scale-card','DIV',elements.get('nodeLayer'));card.dataset.nodeId='scale-2';
  elements.get('nodeLayer').parentElement=elements.get('graphScroll');elements.get('graphScroll').rect={left:0,top:0,right:500,bottom:500,width:500,height:500};
  editor.classList.add('palette-collapsed','inspector-collapsed');
  function query(selector) {
    if (selector === '.editor-grid') return editor;
    if (selector === '.palette-panel') return palette;
    if (selector === '.inspector-panel') return inspector;
    if (selector.includes('.node-card')) return card.isConnected && selector.includes(card.dataset.nodeId)?card:null;
    return elements.get(selector.replace(/^#/,''));
  }
  const frames=[], state={rendering:false,selectedNodeId:'scale-2',selectedNodeIds:new Set(['scale-2']),workspace:{viewport:{x:1,y:2,zoom:1},positions:{'scale-2':{x:1,y:2}}}};
  let resets=0;
  const window=new Element('window');
  const ctx=vm.createContext({window,document:doc,HTMLElement:Element,navigator:{language:'en'},getComputedStyle:el=>({visibility:el.visibility}),innerWidth:800,innerHeight:600,requestAnimationFrame:fn=>frames.push(fn),$:query,state,matchMedia:()=>({matches:mobile}),CSS:{escape:x=>x},applyGraphViewport(){},ensureSelectedNodeVisible(){},syncMobileActionBar(){},setGraphFloating(){},resetGraph(){resets++;},t:x=>x,undo(){},redo(){},disconnectSelected(){}});
  const confirmCode=reference?fs.readFileSync(process.argv[3] || new URL('../components/confirm-dialog.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]:block("const dialog=document.getElementById('appConfirmDialog')", 'window.AppConfirm=Object.freeze({ask});')+'window.AppConfirm=Object.freeze({ask});';
  vm.runInContext(confirmCode,ctx);
  ctx.AppConfirm=window.AppConfirm;
  vm.runInContext(block("const MOBILE_GRAPH_MEDIA=", 'function startTouchPinch()')+block('const TOOLBAR_POPOVERS=', "$('#versionBadge').textContent="),ctx);
  for (const id of ['closePaletteButton','mobilePaletteDoneButton','closeInspectorButton','mobileInspectorDoneButton','mobileAddButton','mobileMoreButton','mobileSheetBackdrop']) vm.runInContext(statement(`$('#${id}').addEventListener`),ctx);
  vm.runInContext(statement("$('#undoButton').addEventListener"),ctx);
  vm.runInContext("const graphScroll=$('#graphScroll');let graphSpaceHeld=false;"+block("window.addEventListener('keydown'", "$('#nodeLayer').addEventListener('click'"),ctx);
  elements.get('recipePopover').hidden=elements.get('graphActionsPopover').hidden=true;
  function reflectVisibility() {
    palette.hidden=editor.classList.contains('palette-collapsed');inspector.hidden=editor.classList.contains('inspector-collapsed');
    for (const id of ['mobileAddButton','mobileMoreButton']) elements.get(id).visible=mobile;
    elements.get('graphActionsButton').visible=!mobile;
    for (const id of ['togglePaletteButton','toggleInspectorButton']) elements.get(id).visible=!mobile;
  }
  reflectVisibility();
  function run(code) { const result=vm.runInContext(code,ctx);reflectVisibility();return result; }
  async function click(id) { const promise=elements.get(id).dispatch('click');reflectVisibility();return promise; }
  function flush() { while(frames.length) frames.shift()();reflectVisibility(); }
  return {get:id=>elements.get(id),doc,state,card,editor,palette,inspector,run,click,flush,frames,window,setMobile:v=>{mobile=v;reflectVisibility();},resets:()=>resets,Element};
}

for (const mobile of [false,true]) {
  for (const dismiss of ['appConfirmCancel','appConfirmClose','cancel','backdrop']) test(`Reset ${dismiss} restores a visible ${mobile?'More':'Graph tools'} opener`, async () => {
    const h=harness({mobile});h.run("setToolbarPopover('graphActionsPopover',true)");h.get('resetGraphButton').focus();
    const pending=h.click('resetGraphButton');h.flush();
    if (dismiss==='cancel') await h.get('appConfirmDialog').dispatch('cancel');
    else if(dismiss==='backdrop') await h.get('appConfirmDialog').dispatch('click',{clientX:-5});
    else await h.click(dismiss);
    await pending;
    assert.equal(h.doc.activeElement,h.get(mobile?'mobileMoreButton':'graphActionsButton'));
    assert.equal(h.resets(),0);assert.equal(h.get('graphActionsPopover').hidden,true);
  });
}

test('Reset chooses the current breakpoint and does not steal focus from a newer editor', async()=>{
  const h=harness({mobile:false});h.run("setToolbarPopover('graphActionsPopover',true)");h.get('resetGraphButton').focus();
  const pending=h.click('resetGraphButton');h.flush();h.setMobile(true);await h.click('appConfirmCancel');await pending;
  assert.equal(h.doc.activeElement,h.get('mobileMoreButton'));
  const next=h.click('resetGraphButton');h.flush();const editor=new h.Element('new-editor','INPUT');h.get('appConfirmDialog').onClose=()=>editor.focus();await h.click('appConfirmCancel');await next;
  assert.equal(h.doc.activeElement,editor);
});

test('stale confirmation frames cannot take focus after close or from a newer modal', async()=>{
  const h=harness();const pending=h.window.AppConfirm.ask();await h.click('appConfirmCancel');h.flush();assert.equal(h.doc.activeElement,h.doc.body);await pending;
  const next=h.window.AppConfirm.ask();const help=h.get('helpDialog');help.open=true;h.get('closeHelpButton').parentElement=help;h.get('closeHelpButton').focus();h.flush();assert.equal(h.doc.activeElement,h.get('closeHelpButton'));await h.click('appConfirmCancel');await next;
  assert.equal(h.doc.activeElement,h.get('closeHelpButton'));
});

for (const side of ['palette','inspector']) for (const action of [side==='palette'?'mobilePaletteDoneButton':'mobileInspectorDoneButton',side==='palette'?'closePaletteButton':'closeInspectorButton']) test(`${action} returns focus without changing graph selection or viewport`,async()=>{
  const h=harness();h.run(`setWorkspaceSidebar('${side}',true)`);h.get(action).focus();
  const before=JSON.stringify({id:h.state.selectedNodeId,viewport:h.state.workspace.viewport});
  await h.click(action);h.flush();
  assert.equal(h.doc.activeElement,side==='palette'?h.get('mobileAddButton'):h.card);
  assert.equal(JSON.stringify({id:h.state.selectedNodeId,viewport:h.state.workspace.viewport}),before);
  assert.equal(h.doc.activeElement.focusOptions.preventScroll,true);
});

test('sheet backdrop uses the same return path and repeated dismissal is harmless',async()=>{
  const h=harness();h.run("setWorkspaceSidebar('inspector',true)");h.get('mobileInspectorDoneButton').focus();
  await h.get('mobileSheetBackdrop').dispatch('pointerdown');h.flush();assert.equal(h.doc.activeElement,h.card);
  const editor=new h.Element('editor','INPUT');editor.focus();await h.get('mobileSheetBackdrop').dispatch('pointerdown');h.flush();assert.equal(h.doc.activeElement,editor);
});

test('sheet dismissal preserves newer modal or editor ownership',async()=>{
  for (const modal of [false,true]) {const h=harness();h.run("setWorkspaceSidebar('palette',true)");const active=modal?h.get('closeHelpButton'):new h.Element('editor','INPUT');if(modal){h.get('helpDialog').open=true;active.parentElement=h.get('helpDialog');}active.focus();await h.click('mobilePaletteDoneButton');h.flush();assert.equal(h.doc.activeElement,active);}
});

test('sheet focus skips disabled Add and detached or clipped selected nodes',async()=>{
  for (const condition of ['busy','detached','clipped']) {const h=harness();const palette=condition==='busy';h.run(`setWorkspaceSidebar('${palette?'palette':'inspector'}',true)`);const action=palette?'mobilePaletteDoneButton':'mobileInspectorDoneButton';h.get(action).focus();if(palette){h.state.rendering=true;h.get('mobileAddButton').disabled=true;}else if(condition==='detached')h.card.isConnected=false;else h.card.rect={left:900,top:900,right:1000,bottom:950,width:100,height:50};await h.click(action);h.flush();assert.equal(h.doc.activeElement,h.get('graphScroll'));}
});

test('sheet dismissal resolves desktop controls after a breakpoint change',async()=>{
  const h=harness();h.run("setWorkspaceSidebar('palette',true)");h.get('mobilePaletteDoneButton').focus();h.setMobile(false);await h.click('closePaletteButton');h.flush();assert.equal(h.doc.activeElement,h.get('togglePaletteButton'));
});


test('Escape dismisses the active sheet but leaves native modal ownership unchanged',async()=>{
  for(const side of ['palette','inspector']){
    const h=harness();h.run(`setWorkspaceSidebar('${side}',true)`);h.get(side==='palette'?'mobilePaletteDoneButton':'mobileInspectorDoneButton').focus();
    await h.window.dispatch('keydown',{key:'Escape'});h.flush();assert.equal(h.doc.activeElement,side==='palette'?h.get('mobileAddButton'):h.card);
    h.run(`setWorkspaceSidebar('${side}',true)`);h.get('helpDialog').open=true;h.get('closeHelpButton').focus();await h.window.dispatch('keydown',{key:'Escape'});assert.equal(h.editor.classList.contains(side+'-collapsed'),false);
  }
});

test('switching sheets has no pending return-focus work to steal the next editor',async()=>{
  const h=harness();h.run("setWorkspaceSidebar('palette',true)");h.get('mobilePaletteDoneButton').focus();
  await h.click('mobilePaletteDoneButton');h.run("setWorkspaceSidebar('inspector',true)");h.get('mobileInspectorDoneButton').focus();h.flush();assert.equal(h.doc.activeElement,h.get('mobileInspectorDoneButton'));
});

test('repeated confirmation requests resolve only the current result and keep generic native return focus',async()=>{
  const h=harness();h.get('helpButton').focus();const first=h.window.AppConfirm.ask(),second=h.window.AppConfirm.ask();h.flush();assert.equal(await first,false);assert.equal(h.doc.activeElement,h.get('appConfirmCancel'));await h.click('appConfirmOk');assert.equal(await second,true);assert.equal(h.doc.activeElement,h.get('helpButton'));
  h.run("setToolbarPopover('graphActionsPopover',true)");h.get('resetGraphButton').focus();const reset=h.click('resetGraphButton');h.flush();await h.click('appConfirmOk');await reset;assert.equal(h.resets(),1);
});

test('Reset skips unavailable opener controls rather than focusing hidden or disabled UI',async()=>{
  for(const unavailable of ['disabled','hidden','visibility']){
    const h=harness();h.run("setToolbarPopover('graphActionsPopover',true)");h.get('resetGraphButton').focus();const pending=h.click('resetGraphButton');h.flush();
    if(unavailable==='visibility')h.get('mobileMoreButton').visibility='hidden';else h.get('mobileMoreButton')[unavailable]=true;
    await h.click('appConfirmCancel');await pending;assert.equal(h.doc.activeElement,h.get('graphScroll'));
  }
});

test('Inspector return skips a node outside the visible viewport even inside the canvas',async()=>{
  const h=harness();h.run("setWorkspaceSidebar('inspector',true)");h.get('mobileInspectorDoneButton').focus();
  h.get('graphScroll').rect={left:0,top:0,right:500,bottom:1000,width:500,height:1000};h.card.rect={left:20,top:800,right:120,bottom:850,width:100,height:50};
  await h.click('mobileInspectorDoneButton');h.flush();assert.equal(h.doc.activeElement,h.get('graphScroll'));
});


test('confirmation maintenance reference honors responsive return focus and stale-frame guards',async()=>{
  const h=harness({reference:true});h.run("setToolbarPopover('graphActionsPopover',true)");h.get('resetGraphButton').focus();const pending=h.click('resetGraphButton');h.flush();await h.click('appConfirmCancel');await pending;assert.equal(h.doc.activeElement,h.get('mobileMoreButton'));
  const next=h.window.AppConfirm.ask();await h.click('appConfirmCancel');h.flush();await next;assert.equal(h.doc.activeElement,h.get('mobileMoreButton'));
});
