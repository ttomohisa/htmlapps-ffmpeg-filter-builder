import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual production handlers in a small DOM boundary. No browser,
// layout, touch-device, or FFmpeg runtime coverage is implied by these tests.
const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing application block: ${start}`);
  return source.slice(from, to);
}
function line(start) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `Missing application statement: ${start}`);
  return source.slice(from, source.indexOf('\n', from));
}
class Element {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.hidden = false;
    this.disabled = false;
    this.attributes = {};
    this.handlers = new Map();
    this.style = {};
    this.children = [];
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name)
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) {
    this.handlers.set(name, [...(this.handlers.get(name) || []), handler]);
  }
  dispatch(name, extra = {}) {
    const event = {type:name, target:this, button:0, pointerId:1, clientX:100,
      clientY:100, preventDefault() {}, stopPropagation() {}, ...extra};
    for (const handler of this.handlers.get(name) || []) handler(event);
  }
  closest(selector) {
    if (this.dataset.port && ['.node-port', '[data-port]'].includes(selector)) return this;
    if (!this.dataset.port && this.dataset.nodeId && ['.node-card', '[data-node-id]'].includes(selector)) return this;
    return null;
  }
  matches(selector) { return Boolean(this.closest(selector)); }
}
function harness({mobile = true} = {}) {
  const elements = new Map();
  for (const id of source.matchAll(/\bid="([^"]+)"/g)) elements.set('#' + id[1], new Element());
  const editor = new Element();
  editor.classList.add('palette-collapsed', 'inspector-collapsed');
  elements.set('.editor-grid', editor);
  const card = new Element({nodeId:'scale-2'});
  const state = {rendering:false, selectedNodeId:'input-1', selectedNodeIds:new Set(['input-1']),
    selectedEdgeId:'', pendingConnection:null, history:{past:[],future:[]},
    graph:{nodes:[{id:'input-1',type:'input'},{id:'scale-2',type:'scale'},{id:'output-1',type:'output'}],
      edges:[{id:'e1',from:'input-1',to:'scale-2'},{id:'e2',from:'scale-2',to:'output-1'}]},
    workspace:{positions:{'scale-2':{x:100,y:100}},viewport:{zoom:1},nodeDrag:null}};
  let historyPushes = 0;
  const context = vm.createContext({
    state, $: selector => elements.get(selector), performance:{now:()=>100},
    document:{body:new Element(), querySelector:()=>null, querySelectorAll:()=>[card], createElement:()=>new Element()},
    matchMedia:()=>({matches:mobile}), requestAnimationFrame:callback=>callback(),
    applyGraphViewport() {}, ensureSelectedNodeVisible() {}, renderMiniMap() {},
    renderInspector() {}, redrawGraphEdges() {}, refreshGraph() {}, renderGraph() {},
    markPreviewStale() {}, showToast() {}, t:key=>key, scheduleAutosave() {},
    pushHistory:()=>historyPushes++, CSS:{escape:value=>value},
    graphPositionBounds:()=>({width:500,height:500}),
    nodeInputPorts:node=>node.type==='input'?[]:['in'],
    nodeById:id=>state.graph.nodes.find(node=>node.id===id),
    incomingEdges:id=>state.graph.edges.filter(edge=>edge.to===id),
    finishConnectionDrag:()=>false, startConnectionDrag:()=>{state.workspace.connectionDrag={};},
    portStreamType:()=> 'video',
    selectConnectedNodes:()=>{throw new Error('Unexpected connected selection');}
  });
  vm.runInContext([
    block('function renderMobileRecipeGrid()', 'function syncRecipeUi()'),
    line('function syncMobileActionBar()'),
    line('function updateDisconnectButton()'),
    line('function disconnectSelected()'),
    line('function selectNode('),
    block('function syncGraphSizeButton()', 'function toggleGraphSize()'),
    block("const MOBILE_GRAPH_MEDIA=", 'function startTouchPinch()'),
    block('const TOOLBAR_POPOVERS=', "$('#versionBadge').textContent="),
    block("$('#nodeLayer').addEventListener('click'", "$('#edgeLayer').addEventListener('pointerdown'"),
    ...['mobileDisconnectAction', 'mobileRecipeButton', 'mobileMoreButton', 'mobileAddButton',
      'mobileInspectorDoneButton', 'mobilePaletteDoneButton', 'mobilePopoverBackdrop', 'mobileSheetBackdrop']
      .filter(id=>source.includes(`$('#${id}').addEventListener`))
      .map(id=>line(`$('#${id}').addEventListener`))
  ].join('\n'), context);
  const get = id => elements.get('#' + id);
  get('recipePopover').hidden = get('graphActionsPopover').hidden = true;
  function gesture({cancel=false, move=false, target=card} = {}) {
    const layer = get('nodeLayer');
    layer.dispatch('pointerdown', {target});
    if (move) layer.dispatch('pointermove', {target, clientX:125});
    layer.dispatch(cancel?'pointercancel':'pointerup', {target});
    if (!cancel) layer.dispatch('click', {target});
  }
  return {context, state, get, editor, card, gesture, setMobile:value=>mobile=value, historyPushes:()=>historyPushes,
    run:code=>vm.runInContext(code, context)};
}

test('first plain mobile tap opens the newly selected node Inspector', () => {
  const h = harness();
  h.gesture();
  assert.equal(h.state.selectedNodeId, 'scale-2');
  assert.equal(h.editor.classList.contains('inspector-collapsed'), false);
  h.get('mobileInspectorDoneButton').dispatch('click');
  assert.equal(h.editor.classList.contains('inspector-collapsed'), true);
  h.gesture();
  assert.equal(h.editor.classList.contains('inspector-collapsed'), false);
});

test('drag, cancelled pointer, port connection, and desktop selection do not open mobile Inspector', () => {
  for (const options of [{move:true}, {cancel:true}, {target:new Element({nodeId:'scale-2',port:'output',portKey:'out'})}]) {
    const h = harness();
    h.gesture(options);
    assert.equal(h.editor.classList.contains('inspector-collapsed'), true);
  }
  const desktop = harness({mobile:false});
  desktop.gesture();
  assert.equal(desktop.editor.classList.contains('inspector-collapsed'), true);
});

test('a fresh tap after pointer cancellation still opens Inspector', () => {
  const h = harness();
  h.gesture({cancel:true});
  h.gesture();
  assert.equal(h.editor.classList.contains('inspector-collapsed'), false);
});

test('More exposes a labeled touch action for disconnecting inputs', () => {
  const more = block('<div class="graph-popover actions-popover"', '<div class="graph-scroll"');
  assert.match(more, /id="mobileDisconnectAction"[^>]*type="button"[^>]*disabled[^>]*data-i18n="disconnectInput"/);
});

test('mobile Disconnect mirrors selection and busy state and preserves nodes', () => {
  const h = harness();
  const button = h.get('mobileDisconnectAction');
  assert.ok(button, 'Mobile Disconnect control is missing');
  h.run('updateDisconnectButton()');
  assert.equal(button.disabled, true, 'Input source has no incoming edges');
  h.state.selectedNodeId = 'scale-2';
  h.run('updateDisconnectButton()');
  assert.equal(button.disabled, false);
  h.state.rendering = true;
  h.run('syncMobileActionBar()');
  assert.equal(button.disabled, true);
  h.state.rendering = false;
  h.run('updateDisconnectButton()');
  h.get('mobileMoreButton').dispatch('click');
  button.dispatch('click');
  assert.equal(h.get('graphActionsPopover').hidden, true);
  assert.deepEqual(h.state.graph.nodes.map(node=>node.id), ['input-1','scale-2','output-1']);
  assert.deepEqual(h.state.graph.edges.map(edge=>edge.id), ['e2']);
  assert.equal(h.historyPushes(), 1);
  h.run('updateDisconnectButton()');
  assert.equal(button.disabled, true);
});

test('switching and dismissing mobile sheets clears the matching backdrops', () => {
  const h = harness();
  h.get('mobileRecipeButton').dispatch('click');
  assert.equal(h.get('recipePopover').hidden, false);
  h.get('mobileMoreButton').dispatch('click');
  assert.equal(h.get('recipePopover').hidden, true);
  assert.equal(h.get('graphActionsPopover').hidden, false);
  h.get('mobilePopoverBackdrop').dispatch('pointerdown');
  assert.equal(h.get('graphActionsPopover').hidden, true);
  h.get('mobileAddButton').dispatch('click');
  assert.equal(h.editor.classList.contains('palette-collapsed'), false);
  h.get('mobileSheetBackdrop').dispatch('pointerdown');
  assert.equal(h.editor.classList.contains('palette-collapsed'), true);
  assert.equal(h.get('mobileSheetBackdrop').attributes['aria-hidden'], 'true');
});


test('mobile Enter and Space open Inspector without changing desktop activation', () => {
  for (const key of ['Enter', ' ']) {
    for (const mobile of [true, false]) {
      const h = harness({mobile});
      h.get('nodeLayer').dispatch('keydown', {target:h.card, key});
      assert.equal(h.state.selectedNodeId, 'scale-2');
      assert.equal(h.editor.classList.contains('inspector-collapsed'), !mobile);
    }
  }
});

test('entering mobile exits floating mode and returning to desktop resets sheets', () => {
  const h = harness({mobile:false});
  h.run('setGraphFloating(true)');
  assert.equal(h.editor.classList.contains('graph-expanded'), true);
  h.setMobile(true);
  h.run('syncMobileWorkspaceMode()');
  assert.equal(h.editor.classList.contains('graph-expanded'), false);
  h.get('mobileRecipeButton').dispatch('click');
  assert.equal(h.get('recipePopover').hidden, false);
  h.setMobile(false);
  h.run('syncMobileWorkspaceMode()');
  assert.equal(h.get('recipePopover').hidden, true);
  assert.equal(h.get('mobilePopoverBackdrop').attributes['aria-hidden'], 'true');
  assert.equal(h.editor.classList.contains('palette-collapsed'), false);
  assert.equal(h.editor.classList.contains('inspector-collapsed'), false);
});

test('desktop-only CSS does not expose the mobile More duplicates', () => {
  const desktopCss = source.slice(0, source.indexOf('@media (max-width:700px)'));
  const actionDisplay = desktopCss.lastIndexOf('.graph-action-item { display:flex;');
  const mobileDisplay = desktopCss.lastIndexOf('.mobile-action-bar,.mobile-sheet-close-x,.mobile-sheet-done,.mobile-only-action { display:none; }');
  assert.ok(mobileDisplay > actionDisplay, 'Mobile-only display:none must override the shared action display at desktop widths');
});


test('Recipe cards preserve all 24 canonical options and current selection on repeated render', () => {
  const h = harness(), select = h.get('recipeSelect');
  const markup = block('<select class="recipe-select"', '</select>');
  const groups = [...markup.matchAll(/<optgroup[^>]* label="([^"]+)"[^>]*>([\s\S]*?)<\/optgroup>/g)].map(match => ({
    label:match[1], querySelectorAll:()=>[...match[2].matchAll(/<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g)]
      .map(option=>({value:option[1],textContent:option[2]}))
  }));
  assert.equal(groups.length, 3);
  select.querySelectorAll = () => groups;
  for (const selected of ['resize720', 'bgm', 'replaceAudio']) {
    select.value = selected;
    h.run('renderMobileRecipeGrid()');
    const sections = h.get('mobileRecipeGrid').children;
    const cards = sections.flatMap(section=>section.children[1].children);
    assert.equal(sections.length, 3);
    assert.equal(cards.length, 24);
    assert.equal(new Set(cards.map(card=>card.dataset.recipeId)).size, 24);
    assert.deepEqual(cards.filter(card=>card.classList.contains('is-selected')).map(card=>card.dataset.recipeId), [selected]);
  }
});

test('pinch in progress does not start a node drag or change selection', () => {
  const h = harness();
  h.state.workspace.pinch = {ids:[1,2]};
  h.get('nodeLayer').dispatch('pointerdown', {target:h.card});
  assert.equal(h.state.workspace.nodeDrag, null);
  assert.equal(h.state.selectedNodeId, 'input-1');
  assert.equal(h.editor.classList.contains('inspector-collapsed'), true);
});


test('cancel without a synthetic click does not swallow the next port tap', () => {
  const h = harness();
  h.state.selectedNodeId = 'scale-2';
  h.state.selectedNodeIds = new Set(['scale-2']);
  h.gesture({cancel:true});
  assert.equal(h.editor.classList.contains('inspector-collapsed'), true);
  h.gesture({target:new Element({nodeId:'scale-2',port:'output',portKey:'out'})});
  assert.equal(h.state.pendingConnection?.nodeId, 'scale-2');
  assert.equal(h.state.pendingConnection?.portKey, 'out');
  assert.equal(h.editor.classList.contains('inspector-collapsed'), true);
});
