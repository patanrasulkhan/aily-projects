/* Runs unchanged in Node (CI) and JavaScriptCore (macOS). */
var C = typeof require==='function' ? require('../web/core.js') : (load('web/core.js'), Daylight);
var log = typeof print==='function'?print:console.log;
var passed=0;
function assert(value,message){if(!value)throw new Error(message||'Assertion failed');}
function eq(a,b){assert(JSON.stringify(a)===JSON.stringify(b),JSON.stringify(a)+' != '+JSON.stringify(b));}
function test(name,fn){fn();passed++;log('PASS '+name);}
function throws(fn){var caught=false;try{fn();}catch{caught=true;}assert(caught,'Expected error');}
const fixed=new Date('2026-10-26T12:00:00');
test('empty state has stable schema',()=>{eq(C.empty().version,1);eq(C.normalize(C.empty()),C.empty());});
test('unknown schemas are rejected',()=>{throws(()=>C.normalize({version:2}));throws(()=>C.normalize(null));});
test('task creation does not mutate input',()=>{const s=C.empty(),n=C.addTask(s,{title:'  Ship the app  '},fixed);eq(s.tasks.length,0);eq(n.tasks[0].title,'Ship the app');eq(n.tasks[0].project,'Personal');});
test('empty task is rejected',()=>{throws(()=>C.addTask(C.empty(),{title:'   '}));});
test('task titles are bounded',()=>{eq(C.addTask(C.empty(),{title:'x'.repeat(500)}).tasks[0].title.length,200);});
test('completion stamps time, reopening clears it',()=>{let s=C.addTask(C.empty(),{title:'Write tests'},fixed);const id=s.tasks[0].id;s=C.updateTask(s,id,{status:'done'},fixed);eq(s.tasks[0].completedAt,fixed.toISOString());s=C.updateTask(s,id,{status:'todo'},fixed);eq(s.tasks[0].completedAt,'');});
test('editing cannot replace a task identity',()=>{let s=C.addTask(C.empty(),{title:'Task'},fixed),id=s.tasks[0].id;s=C.updateTask(s,id,{id:'hijacked',createdAt:'changed',title:'Better'});eq(s.tasks[0].id,id);eq(s.tasks[0].createdAt,fixed.toISOString());});
test('priority and status are normalized',()=>{const t=C.addTask(C.empty(),{title:'Task',status:'invalid',priority:'bad'}).tasks[0];eq(t.status,'todo');eq(t.priority,'medium');});
test('dates reject impossible calendar dates',()=>{assert(C.validDay('2028-02-29'));assert(!C.validDay('2026-02-29'));assert(!C.validDay('2026-13-01'));assert(!C.validDay('today'));});
test('search includes project and description',()=>{let s=C.addTask(C.empty(),{title:'Read',project:'Learning',description:'Chapter four'});eq(C.filterTasks(s,{query:'LEARNING'}).length,1);eq(C.filterTasks(s,{query:'chapter'}).length,1);eq(C.filterTasks(s,{query:'missing'}).length,0);});
test('task filters combine and prioritize',()=>{let s=C.addTask(C.empty(),{title:'Low',priority:'low',project:'A'});s=C.addTask(s,{title:'High',priority:'high',project:'B'});eq(C.filterTasks(s)[0].title,'High');eq(C.filterTasks(s,{project:'A',priority:'high'}).length,0);});
test('today includes overdue and excludes done',()=>{let s=C.addTask(C.empty(),{title:'Overdue',due:'2026-10-25'},fixed);s=C.addTask(s,{title:'Later',due:'2026-10-27'},fixed);s=C.addTask(s,{title:'Done',due:'2026-10-26',status:'done'},fixed);eq(C.filterTasks(s,{today:true},fixed).map(t=>t.title),['Overdue']);});
test('habit toggle is reversible and immutable',()=>{const s={...C.empty(),habits:[{id:'h',title:'Read',days:[]}]};const n=C.toggleHabit(s,'h','2026-10-26');eq(s.habits[0].days,[]);eq(n.habits[0].days,['2026-10-26']);eq(C.toggleHabit(n,'h','2026-10-26').habits[0].days,[]);throws(()=>C.toggleHabit(s,'h','bad'));});
test('streak accepts today or yesterday as latest',()=>{eq(C.streak({days:['2026-10-25','2026-10-26']},fixed),2);eq(C.streak({days:['2026-10-24','2026-10-25']},fixed),2);eq(C.streak({days:['2026-10-24']},fixed),0);});
test('streak crosses month boundary',()=>{eq(C.streak({days:['2026-09-30','2026-10-01']},new Date('2026-10-01T12:00:00')),2);});
test('timer uses a wall clock deadline',()=>{const s=C.startTimer(C.empty(),25,1000);eq(C.remaining(s.timer,61000),1440);eq(C.remaining(s.timer,999999999),0);});
test('timer pause and resume preserve remaining time',()=>{let s=C.startTimer(C.empty(),25,1000);s=C.pauseTimer(s,61000);eq(s.timer.remaining,1440);eq(C.remaining(s.timer,999999),1440);s=C.resumeTimer(s,100000);eq(s.timer.endAt,1540000);});
test('finishing records focus exactly once',()=>{let s=C.startTimer(C.empty(),1,fixed.getTime());const end=new Date(fixed.getTime()+60000);s=C.finishTimer(s,end);eq(s.sessions.length,1);eq(s.sessions[0].minutes,1);eq(C.finishTimer(s,end).sessions.length,1);});
test('breaks are not counted as focused minutes',()=>{const s=C.startTimer(C.empty(),5,fixed.getTime(),'Break');eq(C.finishTimer(s,new Date(fixed.getTime()+300000)).sessions.length,0);});
test('premature completion does not change state',()=>{const s=C.startTimer(C.empty(),25,fixed.getTime());assert(C.finishTimer(s,fixed)===s);});
test('invalid timer lengths are rejected',()=>{for(const m of [0,-5,181,NaN,Infinity])throws(()=>C.startTimer(C.empty(),m));});
test('backup round trip preserves text',()=>{let s=C.demo(fixed);s.notes[0].body='<script>alert("x")</script>\nUnicode: café ✦';eq(C.normalize(JSON.parse(JSON.stringify(s))),s);});
test('malformed records and duplicate IDs are dropped',()=>{const s={...C.empty(),tasks:[null,{id:'one',title:'First'},{id:'one',title:'Duplicate'},{id:'',title:'No identity'}]};eq(C.normalize(s).tasks.length,1);});
test('backup rejects excessive record counts',()=>{const s=C.empty();s.habits=Array(101).fill({id:'x',title:'Read',days:[]});throws(()=>C.normalize(s));});
test('invalid timer from backup is discarded',()=>{const s=C.empty();s.timer={id:'bad',duration:1,remaining:-1,endAt:null};eq(C.normalize(s).timer,null);});
log('DAYLIGHT_TESTS_PASSED='+passed);

// Task views use the same calendar-aware selection without changing stored data.
function dueFixture(){
  let s=C.empty();
  for(const t of [
    {title:'Earlier',due:'2026-10-26',priority:'high',project:'Work',status:'doing'},
    {title:'Today',due:'2026-10-27',priority:'medium',project:'Work'},
    {title:'Tomorrow',due:'2026-10-28'},
    {title:'Unscheduled'},
    {title:'Finished earlier',due:'2026-10-26',status:'done'},
    {title:'Finished today',due:'2026-10-27',status:'done'}
  ])s=C.addTask(s,t,fixed);
  return s;
}
const taskDay=new Date(2026,9,27,0,5);
test('overdue and today are distinct and exclude completed and undated tasks',()=>{
  const s=dueFixture();
  eq(C.filterTasks(s,{due:'overdue'},taskDay).map(t=>t.title),['Earlier']);
  eq(C.filterTasks(s,{due:'today'},taskDay).map(t=>t.title),['Today']);
  eq(C.filterTasks(s,{due:'attention'},taskDay).map(t=>t.title),['Earlier','Today']);
  eq(C.filterTasks(s,{due:''},taskDay).length,6);
});
test('due filters intersect search, priority, project and status',()=>{
  const s=dueFixture();
  eq(C.filterTasks(s,{due:'attention',query:'EAR',priority:'high',project:'Work',status:'doing'},taskDay).map(t=>t.title),['Earlier']);
  eq(C.filterTasks(s,{due:'today',priority:'high'},taskDay),[]);
  eq(C.filterTasks(s,{due:'overdue',project:'Personal'},taskDay),[]);
  eq(C.filterTasks(s,{due:'attention',status:'done'},taskDay),[]);
});
test('due filtering respects local calendar boundaries including leap days',()=>{
  let s=C.addTask(C.empty(),{title:'Leap day',due:'2028-02-29'},fixed);
  eq(C.filterTasks(s,{due:'today'},new Date(2028,1,29,23,59)).length,1);
  eq(C.filterTasks(s,{due:'overdue'},new Date(2028,2,1,0,0)).length,1);
  eq(C.filterTasks(s,{due:'today'},new Date(2028,2,1,0,0)).length,0);
  s=C.addTask(s,{title:'Year end',due:'2027-12-31'},fixed);
  eq(C.filterTasks(s,{due:'overdue'},new Date(2028,0,1)).map(t=>t.title),['Year end']);
});
test('completing and reopening a filtered task updates membership',()=>{
  let s=dueFixture(),id=s.tasks[0].id;
  s=C.updateTask(s,id,{status:'done'},taskDay);
  eq(C.filterTasks(s,{due:'overdue'},taskDay).length,0);
  s=C.updateTask(s,id,{status:'todo'},taskDay);
  eq(C.filterTasks(s,{due:'overdue'},taskDay)[0].id,id);
});
test('filtering is immutable and version one backups retain all tasks',()=>{
  const s=dueFixture(),before=JSON.stringify(s);
  C.filterTasks(s,{due:'attention'},taskDay).reverse();
  eq(JSON.stringify(s),before);
  eq(C.normalize(JSON.parse(before)),s);
  eq(C.filterTasks(s,{today:true},taskDay),C.filterTasks(s,{due:'attention'},taskDay));
});

// Minimal browser boundary: exercise actual UI events without a DOM dependency.
function taskBrowser(){
  const source=typeof require==='function'?require('fs').readFileSync('web/app.js','utf8'):readFile('web/app.js');
  const handlers={},nodes={};let saved=0;
  const node=selector=>nodes[selector]||(nodes[selector]={value:'',textContent:'',innerHTML:'',focus(){},classList:{add(){},remove(){},toggle(){}}});
  const doc={querySelector:node,querySelectorAll(){return [];},addEventListener(name,fn){handlers[name]=fn;}};
  const loc={hash:'#tasks'},workspace=dueFixture();
  workspace.tasks[0].title='<img src=x onerror=bad>';
  workspace.tasks[0].description='<script>bad</script>';
  new Function('window','document','localStorage','location','setInterval','setTimeout','clearTimeout',source)(
    {Daylight:C,addEventListener(){}},doc,{getItem(){return JSON.stringify(workspace);},setItem(){saved++;}},loc,()=>{},()=>{},()=>{});
  return {html:()=>node('#main').innerHTML,saves:()=>saved,
    click(dataset){handlers.click({target:{closest(selector){return selector==='[data-action]'?{dataset}:null;}}});},
    change(target){handlers.change({target});}};
}
test('task view switching retains filters, escapes content, and never saves workspace',()=>{
  const b=taskBrowser();assert(b.html().includes('class="board"'));
  b.change({id:'priority-filter',value:'high',dataset:{}});
  b.click({action:'task-view',taskView:'list'});
  assert(b.html().includes('aria-label="Task list"'));
  assert(b.html().includes('1 of 6 tasks'));
  assert(b.html().includes('&lt;img src=x onerror=bad&gt;'));
  assert(b.html().includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert(!b.html().includes('<img'));
  assert(b.html().includes('data-task-check='));assert(b.html().includes('data-task-status='));
  b.click({action:'task-view',taskView:'board'});
  assert(b.html().includes('draggable="true"'));assert(b.html().includes('data-drop="doing"'));
  assert(b.html().includes('1 of 6 tasks'));eq(b.saves(),0);
});
test('due filter persists across board and list including empty results',()=>{
  const b=taskBrowser();
  b.change({id:'due-filter',value:'today',dataset:{}});
  b.change({id:'project-filter',value:'Missing project',dataset:{}});
  b.click({action:'task-view',taskView:'list'});
  assert(b.html().includes('No tasks match'));assert(b.html().includes('0 of 6 tasks'));
  assert(b.html().includes('value="today" selected'));
  b.click({action:'task-view',taskView:'board'});
  assert(b.html().includes('value="today" selected'));eq(b.saves(),0);
});
log('DAYLIGHT_EXTENDED_TESTS_PASSED='+passed);

// Habit goals extend version 1 without rewriting legacy check-in history.
test('legacy habits keep their backup shape and default to seven days',()=>{
  const s={...C.empty(),habits:[{id:'h',title:'Read',days:['2026-10-26']}]};
  eq(C.normalize(s),s);eq(C.habitTarget(s.habits[0]),7);
});
test('habit editing preserves identity and every check-in without mutating input',()=>{
  const s={...C.empty(),habits:[{id:'h',title:'Read',days:['2025-01-01','2026-10-26']}]},before=JSON.stringify(s);
  const n=C.saveHabit(s,'h',{title:'  Read a chapter  ',weeklyTarget:'3',id:'other',days:[]});
  eq(n.habits[0],{id:'h',title:'Read a chapter',days:s.habits[0].days,weeklyTarget:3});
  eq(JSON.stringify(s),before);const restored=C.normalize(JSON.parse(JSON.stringify(n)));eq(restored.habits[0].weeklyTarget,3);eq(restored.habits[0].days,n.habits[0].days);
});
test('habit creation validates names, targets and limits',()=>{
  for(const weeklyTarget of [0,8,1.5,'no',null,Infinity])throws(()=>C.saveHabit(C.empty(),'',{title:'Read',weeklyTarget}));
  throws(()=>C.saveHabit(C.empty(),'',{title:' ',weeklyTarget:3}));
  throws(()=>C.saveHabit(C.empty(),'missing',{title:'Read',weeklyTarget:3}));
  throws(()=>C.saveHabit({...C.empty(),habits:Array(100).fill({id:'h'})},'',{title:'Read',weeklyTarget:3}));
  const h=C.saveHabit(C.empty(),'',{title:'x'.repeat(110),weeklyTarget:1}).habits[0];eq(h.title.length,100);eq(h.days,[]);eq(h.weeklyTarget,1);
});
test('backup targets are bounded and malformed targets fall back safely',()=>{
  for(const target of [1,7,0,8,2.5,'3',null]){
    const s=C.normalize({...C.empty(),habits:[{id:'h',title:'Read',days:['2026-10-26'],weeklyTarget:target}]});
    eq(C.habitTarget(s.habits[0]),target===1?1:7);eq(s.habits[0].days,['2026-10-26']);
  }
});
test('weekly goals use Monday through Sunday and exclude future check-ins',()=>{
  const h={weeklyTarget:2,days:['2026-10-25','2026-10-26','2026-10-28','2026-10-28','2026-10-29','2026-11-01','bad']};
  eq(C.habitWeek(h,new Date(2026,9,28,0,1)),{start:'2026-10-26',end:'2026-11-01',count:2,target:2,met:true});
  eq(C.habitWeek(h,new Date(2026,10,1,23,59)).count,4);
  eq(C.habitWeek(h,new Date(2026,10,2)).count,0);
});
test('weekly boundaries cross years and leap days using local dates',()=>{
  eq(C.habitWeek({days:['2027-12-31','2028-01-01']},new Date(2028,0,2)).start,'2027-12-27');
  eq(C.habitWeek({days:['2028-02-29'],weeklyTarget:1},new Date(2028,2,1)).count,1);
  eq(C.habitWeek({days:['2028-02-29']},new Date(2028,2,6)).count,0);
});
test('check-in toggles change weekly progress and retain daily streak semantics',()=>{
  let s=C.saveHabit(C.empty(),'',{title:'Read',weeklyTarget:1}),id=s.habits[0].id;
  s=C.toggleHabit(s,id,'2026-10-28');assert(C.habitWeek(s.habits[0],new Date(2026,9,28)).met);
  eq(C.streak(s.habits[0],new Date(2026,9,28)),1);
  s=C.toggleHabit(s,id,'2026-10-28');eq(C.habitWeek(s.habits[0],new Date(2026,9,28)).count,0);
});
function habitBrowser(){
  const source=typeof require==='function'?require('fs').readFileSync('web/app.js','utf8'):readFile('web/app.js');
  const handlers={},nodes={};let stored={...C.empty(),habits:[{id:'h',title:'<Read & reflect>',days:['2026-10-26'],weeklyTarget:3}]},saves=0,fail=false;
  const node=s=>nodes[s]||(nodes[s]={value:'',textContent:'',innerHTML:'',focus(){},showModal(){this.open=true;},close(){this.open=false;},classList:{add(){},remove(){},toggle(){}}});
  new Function('window','document','localStorage','location','setInterval','setTimeout','clearTimeout','FormData',source)(
    {Daylight:C,addEventListener(){}},{querySelector:node,querySelectorAll(){return [];},addEventListener(k,fn){handlers[k]=fn;}},
    {getItem(){return JSON.stringify(stored);},setItem(k,v){if(fail)throw new Error('Full');stored=JSON.parse(v);saves++;}},
    {hash:'#habits'},()=>{},()=>{},()=>{},function(form){return Object.entries(form.values);});
  return {node,state:()=>stored,saves:()=>saves,fail(){fail=true;},click(dataset){handlers.click({target:{closest(s){return s==='[data-action]'?{dataset}:null;}}});},submit(values){handlers.submit({preventDefault(){},target:{id:'editor-form',values}});}};
}
test('habit editor prefills escaped names and saves goals without losing history',()=>{
  const b=habitBrowser();assert(b.node('#main').innerHTML.includes('<progress'));assert(b.node('#main').innerHTML.includes('Monday–Sunday'));
  b.click({action:'edit-habit',id:'h'});assert(b.node('#editor-fields').innerHTML.includes('&lt;Read &amp; reflect&gt;'));
  assert(b.node('#editor-fields').innerHTML.includes('value="3" selected'));eq(b.saves(),0);
  b.submit({title:'Reflect',weeklyTarget:'2'});eq(b.state().habits[0].title,'Reflect');eq(b.state().habits[0].weeklyTarget,2);
  eq(b.state().habits[0].days,['2026-10-26']);eq(b.node('#editor').open,false);
  b.click({action:'habit'});b.submit({title:'Walk',weeklyTarget:'4'});eq(b.state().habits.length,2);
});
test('cancelled, invalid and failed habit edits preserve stored data',()=>{
  const b=habitBrowser(),before=JSON.stringify(b.state());b.click({action:'edit-habit',id:'h'});b.click({action:'close-dialog'});eq(b.saves(),0);
  b.click({action:'edit-habit',id:'h'});b.submit({title:' ',weeklyTarget:'3'});eq(b.saves(),0);eq(b.node('#editor').open,true);
  b.fail();b.submit({title:'Changed',weeklyTarget:'2'});eq(JSON.stringify(b.state()),before);eq(b.node('#editor').open,true);
});
log('DAYLIGHT_HABIT_TESTS_PASSED='+passed);

// Keyboard shortcuts exercise the shipped event handler and modal boundaries.
function shortcutBrowser(initial){
  const source=typeof require==='function'?require('fs').readFileSync('web/app.js','utf8'):readFile('web/app.js');
  const handlers={},nodes={},loc={hash:'#overview'};let stored=initial||C.empty(),saves=0,focused='',prevented=0,fail=false;
  const node=s=>nodes[s]||(nodes[s]={value:'',innerHTML:'',textContent:'',open:false,
    focus(){focused=s;doc.activeElement=this;},select(){this.selected=true;},
    showModal(){this.open=true;},close(){this.open=false;if(this.onclose)this.onclose();},
    addEventListener(k,fn){this['on'+k]=fn;},classList:{add(){},remove(){},toggle(){}}});
  const doc={activeElement:null,querySelector(s){if(s==='dialog[open]')return node('#editor').open||node('#shortcuts').open?{}:null;if(s==='#note-body')return null;return node(s);},querySelectorAll(){return [];},addEventListener(k,fn){handlers[k]=fn;}};
  new Function('window','document','localStorage','location','setInterval','setTimeout','clearTimeout','FormData',source)(
    {Daylight:C,addEventListener(){}},doc,{getItem(){return JSON.stringify(stored);},setItem(k,v){if(fail)throw new Error('Full');stored=JSON.parse(v);saves++;}},loc,()=>{},()=>{},()=>{},function(form){return Object.entries(form.values);});
  return {node,loc,fail(){fail=true;},focus:()=>focused,saves:()=>saves,state:()=>stored,prevented:()=>prevented,
    key(code,extra){handlers.keydown(Object.assign({code,altKey:true,shiftKey:true,target:{closest(){return null;}},preventDefault(){prevented++;}},extra||{}));},
    click(action){handlers.click({target:{closest(s){return s==='[data-action]'?{dataset:{action}}:null;}}});},
    submit(values){handlers.submit({preventDefault(){},target:{id:'editor-form',values}});}};
}
test('shortcuts navigate every view, focus main, and leave persistence untouched',()=>{
  const b=shortcutBrowser();['overview','tasks','habits','notes','focus'].forEach((view,i)=>{b.key('Digit'+(i+1));eq(b.loc.hash,view);eq(b.focus(),'#main');});
  eq(b.saves(),0);eq(b.prevented(),5);
});
test('search shortcut focuses and selects the existing search without saving',()=>{
  const b=shortcutBrowser();b.node('#global-search').value='Previous query';b.key('KeyS');eq(b.focus(),'#global-search');assert(b.node('#global-search').selected);eq(b.node('#global-search').value,'Previous query');eq(b.saves(),0);
});
test('creation shortcuts use existing editors and normal version one saves',()=>{
  const b=shortcutBrowser();b.key('KeyT');assert(b.node('#editor').open);b.submit({title:'Keyboard task'});eq(b.state().tasks[0].title,'Keyboard task');
  b.key('KeyH');assert(b.node('#editor-fields').innerHTML.includes('weeklyTarget'));b.submit({title:'Keyboard habit',weeklyTarget:'2'});eq(b.state().habits[0].weeklyTarget,2);
  b.key('KeyN');eq(b.loc.hash,'notes');eq(b.state().notes.length,1);eq(b.focus(),'#note-title');eq(C.normalize(b.state()),b.state());eq(b.saves(),3);
});
test('typing, composition, repeats, reserved modifiers and open dialogs suppress shortcuts',()=>{
  const b=shortcutBrowser();
  for(const extra of [{altKey:false},{shiftKey:false},{ctrlKey:true},{metaKey:true},{repeat:true},{isComposing:true},{defaultPrevented:true},{target:{isContentEditable:true}},{target:{closest(){return {};}}}])b.key('KeyN',extra);
  b.key('KeyX');eq(b.prevented(),0);eq(b.saves(),0);
  b.click('task');b.key('KeyN');b.key('Digit2');eq(b.loc.hash,'#overview');eq(b.saves(),0);assert(b.node('#editor').open);
  b.click('close-dialog');b.key('KeyN');eq(b.state().notes.length,1);
});
test('guide opens from help or shortcut, blocks actions, and restores opener focus',()=>{
  const b=shortcutBrowser();b.node('help-button').focus();b.click('shortcuts');assert(b.node('#shortcuts').open);b.key('KeyN');eq(b.saves(),0);
  b.click('close-shortcuts');eq(b.focus(),'help-button');b.key('KeyK');assert(b.node('#shortcuts').open);
  // Native Escape emits close, using the same focus-restoration path.
  b.node('#shortcuts').close();eq(b.focus(),'help-button');eq(b.saves(),0);
});
test('guide markup exposes its name, description, key reference and visible entry point',()=>{
  const html=typeof require==='function'?require('fs').readFileSync('web/index.html','utf8'):readFile('web/index.html');
  assert(html.includes('data-action="shortcuts"'));assert(html.includes('aria-keyshortcuts="Alt+Shift+K"'));
  assert(html.includes('aria-labelledby="shortcuts-title" aria-describedby="shortcuts-description"'));
  for(const key of ['S','T','H','N','K'])assert(html.includes('<kbd>'+key+'</kbd>'));
  assert(html.includes('Escape to close'));assert(html.includes('Option + Shift on Mac'));
});
log('DAYLIGHT_SHORTCUT_TESTS_PASSED='+passed);
test('shortcut creation failures preserve workspace and keep editors available',()=>{
  const b=shortcutBrowser(),before=JSON.stringify(b.state());b.fail();b.key('KeyN');eq(JSON.stringify(b.state()),before);eq(b.loc.hash,'#overview');
  b.key('KeyT');b.submit({title:'Unsaved task'});assert(b.node('#editor').open);eq(JSON.stringify(b.state()),before);eq(b.saves(),0);
});
log('DAYLIGHT_SHORTCUT_FAILURE_TESTS_PASSED='+passed);

// Optional note folders preserve legacy version 1 backups.
function noteFixture(){return {...C.empty(),notes:[
  {id:'a',title:'Garden plan',body:'Plant café herbs',pinned:false,updatedAt:'2026-10-30T12:00:00Z',folder:'Home'},
  {id:'b',title:'Reading',body:'Garden essays',pinned:true,updatedAt:'2026-10-29T12:00:00Z',folder:'Ideas'},
  {id:'c',title:'Loose thought',body:'A quiet walk',pinned:false,updatedAt:'2026-10-28T12:00:00Z'}]};}
test('note folders round trip while old backups retain their shape',()=>{
  const legacy={...C.empty(),notes:[noteFixture().notes[2]]};eq(C.normalize(legacy),legacy);
  const s=noteFixture();eq(C.normalize(JSON.parse(JSON.stringify(s))),s);eq(s.version,1);
});
test('note folder normalization trims bounds and discards malformed values',()=>{
  for(const value of [null,[],{},42,'   ']){const s=noteFixture();s.notes[0].folder=value;assert(!('folder' in C.normalize(s).notes[0]));}
  const s=noteFixture();s.notes[0].folder='  '+'x'.repeat(90)+'  ';eq(C.normalize(s).notes[0].folder,'x'.repeat(60));
});
test('note search combines title and body with exact folders and Unfiled',()=>{
  const s=noteFixture(),before=JSON.stringify(s);
  eq(C.filterNotes(s,{query:' GARDEN '}).map(n=>n.id),['b','a']);
  eq(C.filterNotes(s,{query:'CAFÉ',folder:'folder:Home'}).map(n=>n.id),['a']);
  eq(C.filterNotes(s,{query:'garden',folder:'folder:Ideas'}).map(n=>n.id),['b']);
  eq(C.filterNotes(s,{folder:'unfiled'}).map(n=>n.id),['c']);
  eq(C.filterNotes(s,{query:'garden',folder:'unfiled'}),[]);
  s.notes[0].folder='unfiled';eq(C.filterNotes(s,{folder:'folder:unfiled'}).map(n=>n.id),['a']);
  s.notes[0].folder='Home';C.filterNotes(s).reverse();eq(JSON.stringify(s),before);
});
function noteBrowser(initial){
  const source=typeof require==='function'?require('fs').readFileSync('web/app.js','utf8'):readFile('web/app.js');
  let stored=initial||noteFixture(),saves=0,fail=false,focused='',html='',pending;
  const handlers={},nodes={};let hash='#notes';const loc={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;}};
  const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  const node=s=>nodes[s]||(nodes[s]={value:'',textContent:'',innerHTML:'',selectionStart:0,focus(){focused=s;},setSelectionRange(a){this.selectionStart=a;},classList:{add(){},remove(){},toggle(){}}});
  Object.defineProperty(node('#main'),'innerHTML',{get(){return html;},set(value){html=value;for(const id of ['note-title','note-body','note-folder','note-search']){const input=new RegExp('<input[^>]*id="'+id+'"[^>]*value="([^"]*)"').exec(html);const area=new RegExp('<textarea[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</textarea>').exec(html);node('#'+id).value=decode(input?input[1]:area?area[1]:'');}}});
  const doc={querySelector(s){if(['#note-title','#note-body','#note-folder'].includes(s)&&!html.includes('id="'+s.slice(1)+'"'))return null;return node(s);},querySelectorAll(){return [];},addEventListener(k,fn){handlers[k]=fn;}};
  new Function('window','document','localStorage','location','setInterval','setTimeout','clearTimeout',source)(
    {Daylight:C,addEventListener(){}},doc,{getItem(){return JSON.stringify(stored);},setItem(k,v){if(fail)throw new Error('Full');stored=JSON.parse(v);saves++;}},loc,()=>{},fn=>{pending=fn;},()=>{pending=null;});
  return {node,loc,html:()=>html,state:()=>stored,saves:()=>saves,focus:()=>focused,fail(value){fail=value;},tick(){if(pending)pending();},
    input(id,value){node('#'+id).value=value;handlers.input({target:Object.assign(node('#'+id),{id})});},
    folder(value){const t={id:'note-folder-filter',value,dataset:{}};handlers.change({target:t});return t.value;},
    click(action,id){handlers.click({target:{closest(s){return s==='[data-action]'?{dataset:{action,id}}:null;}}});}};
}
test('notes expose labeled filters, escaped folders and selected states without writes',()=>{
  const s=noteFixture();s.notes[1].folder='<Ideas & "plans">';const b=noteBrowser(s);
  assert(b.html().includes('for="note-search"'));assert(b.html().includes('for="note-folder-filter"'));
  assert(b.html().includes('&lt;Ideas &amp; &quot;plans&quot;&gt;'));assert(!b.html().includes('<Ideas'));
  assert(b.html().includes('aria-pressed="true"'));assert(b.html().includes('3 of 3 notes'));eq(b.saves(),0);
  b.input('note-search','garden');assert(b.html().includes('2 of 3 notes'));eq(b.focus(),'#note-search');
  b.folder('folder:Home');assert(b.html().includes('1 of 3 notes'));eq(b.focus(),'#note-folder-filter');eq(b.saves(),0);
  b.folder('unfiled');assert(b.html().includes('No notes match'));assert(!b.html().includes('id="note-body"'));
  b.click('clear-note-filters');assert(b.html().includes('3 of 3 notes'));eq(b.focus(),'#note-search');eq(b.saves(),0);
});
test('note autosave retains folder text body identity and pinning through backup',()=>{
  const b=noteBrowser();b.input('note-folder','  Work & ideas  ');b.input('note-body','Changed text');b.tick();
  const n=b.state().notes.find(n=>n.id==='b');eq(n.folder,'Work & ideas');eq(n.body,'Changed text');assert(n.pinned);eq(n.title,'Reading');eq(C.normalize(b.state()),b.state());
  b.input('note-folder','');b.tick();assert(!('folder' in b.state().notes.find(n=>n.id==='b')));
});
test('filtering flushes pending edits before switching the selected note',()=>{
  const b=noteBrowser();b.input('note-body','Pending words');b.folder('folder:Home');
  eq(b.state().notes.find(n=>n.id==='b').body,'Pending words');eq(b.node('#note-title').value,'Garden plan');
  b.input('note-body','Herbs and flowers');b.input('note-search','no matches');
  eq(b.state().notes.find(n=>n.id==='a').body,'Herbs and flowers');assert(b.html().includes('No notes match'));
});
test('failed note saves retain the editor and block folder changes selection and creation',()=>{
  const b=noteBrowser(),before=JSON.stringify(b.state());b.fail(true);b.input('note-body','Keep this draft');b.tick();
  assert(b.node('#note-save').textContent.includes('Could not save'));eq(b.folder('folder:Home'),'');
  b.click('select-note','a');eq(b.node('#note-body').value,'Keep this draft');b.click('note');eq(JSON.stringify(b.state()),before);eq(b.saves(),0);
  b.fail(false);b.folder('folder:Home');eq(b.state().notes.find(n=>n.id==='b').body,'Keep this draft');
});
test('new notes and global note links reveal their note despite active filters',()=>{
  const b=noteBrowser();b.folder('unfiled');b.input('note-search','missing');b.click('note');
  assert(b.html().includes('4 of 4 notes'));eq(b.node('#note-title').value,'Untitled note');eq(b.focus(),'#note-title');
  b.folder('unfiled');b.click('open-note','a');eq(b.node('#note-title').value,'Garden plan');assert(b.html().includes('4 of 4 notes'));
});
log('DAYLIGHT_NOTE_TESTS_PASSED='+passed);
test('saved folders become available immediately in the filter and suggestions',()=>{
  const b=noteBrowser();b.input('note-folder','New folder');b.tick();
  assert(b.node('#note-folder-filter').innerHTML.includes('value="folder:New folder"'));
  assert(b.node('#note-folders').innerHTML.includes('value="New folder"'));
  b.folder('folder:New folder');assert(b.html().includes('1 of 3 notes'));
});
log('DAYLIGHT_NOTE_FOLDER_TESTS_PASSED='+passed);

// Weekly focus history is derived without changing version 1 session records.
test('focus weeks aggregate every session and include seven zero-filled local days',()=>{
  const s={...C.empty(),sessions:[{id:'a',day:'2026-10-26',minutes:25},{id:'b',day:'2026-10-26',minutes:12.5},{id:'c',day:'2026-10-31',minutes:50},{id:'d',day:'2026-10-25',minutes:10},{id:'future',day:'2026-11-01',minutes:25}]};
  const before=JSON.stringify(s),w=C.focusWeek(s,new Date(2026,9,31,23,59));
  eq(w.start,'2026-10-26');eq(w.end,'2026-11-01');eq(w.days.length,7);eq(w.minutes,87.5);eq(w.count,3);
  eq(w.days[0],{day:'2026-10-26',minutes:37.5,count:2});eq(w.days[1].minutes,0);eq(w.days[6].count,0);
  w.days[0].minutes=0;eq(JSON.stringify(s),before);eq(C.normalize(JSON.parse(before)),s);
});
test('focus week navigation crosses years leap days and daylight saving boundaries',()=>{
  eq(C.focusWeek(C.empty(),new Date(2028,0,2)).start,'2027-12-27');
  eq(C.focusWeek(C.empty(),new Date(2028,2,5)).days.map(d=>d.day),['2028-02-28','2028-02-29','2028-03-01','2028-03-02','2028-03-03','2028-03-04','2028-03-05']);
  const w=C.focusWeek(C.empty(),new Date(2026,10,2),-1);eq(w.start,'2026-10-26');eq(w.end,'2026-11-01');
  eq(C.focusWeek(C.empty(),new Date(2026,10,2),1).start,'2026-11-02');
});
test('completed focus contributes once and breaks contribute nothing to weekly history',()=>{
  let s=C.startTimer(C.empty(),25,fixed.getTime());const end=new Date(fixed.getTime()+25*60000);
  s=C.finishTimer(s,end);s=C.finishTimer(s,end);eq(C.focusWeek(s,end).count,1);eq(C.focusWeek(s,end).minutes,25);
  s=C.startTimer(s,5,end.getTime(),'Break');s=C.finishTimer(s,new Date(end.getTime()+5*60000));eq(C.focusWeek(s,end).count,1);
});
function focusBrowser(initial){
  const source=typeof require==='function'?require('fs').readFileSync('web/app.js','utf8'):readFile('web/app.js');
  const nodes={},handlers={};let saves=0,focused='';
  const node=s=>nodes[s]||(nodes[s]={value:'',textContent:'',innerHTML:'',focus(){focused=s;},classList:{add(){},remove(){},toggle(){}}});
  new Function('window','document','localStorage','location','setInterval','setTimeout','clearTimeout',source)(
    {Daylight:C,addEventListener(){}},{querySelector:node,querySelectorAll(){return [];},addEventListener(k,fn){handlers[k]=fn;}},
    {getItem(){return JSON.stringify(initial);},setItem(){saves++;}},{hash:'#focus'},()=>{},()=>{},()=>{});
  return {html:()=>node('#main').innerHTML,saves:()=>saves,focus:()=>focused,click(direction){handlers.click({target:{closest(s){return s==='[data-action]'?{dataset:{action:'focus-week',direction}}:null;}}});}};
}
test('weekly history exposes named controls table headers totals and an empty state',()=>{
  const b=focusBrowser(C.empty()),html=b.html();assert(html.includes('aria-labelledby="focus-history-title"'));
  assert(html.includes('aria-label="Previous week" disabled'));assert(html.includes('aria-label="Next week" disabled'));
  assert(html.includes('Daily focus totals for'));assert(html.includes('scope="col">Minutes'));assert(html.includes('scope="row"'));
  assert(html.includes('0 minutes · 0 sessions'));assert(html.includes('No completed focus sessions this week'));
  assert(html.includes('aria-hidden="true"'));eq(b.saves(),0);
});
test('weekly browsing retains timer recent sessions and avoids persistence writes',()=>{
  const today=new Date(),thisWeek=C.focusWeek(C.empty(),today),older=new Date(thisWeek.start+'T12:00:00');older.setDate(older.getDate()-14);
  const s={...C.empty(),sessions:[{id:'old',day:C.dayKey(older),minutes:45},{id:'today',day:C.dayKey(today),minutes:25}]};
  const b=focusBrowser(s);assert(b.html().includes('25 minutes · 1 session'));assert(b.html().includes('Begin session'));assert(b.html().includes('Your time, well spent'));
  b.click('previous');assert(b.html().includes('0 minutes · 0 sessions'));eq(b.focus(),'[data-direction="previous"]');
  b.click('previous');assert(b.html().includes('45 minutes · 1 session'));assert(b.html().includes('aria-label="Previous week" disabled'));
  b.click('previous');assert(b.html().includes('45 minutes · 1 session'));
  b.click('next');assert(b.html().includes('0 minutes · 0 sessions'));b.click('current');assert(b.html().includes('25 minutes · 1 session'));
  b.click('next');assert(b.html().includes('25 minutes · 1 session'));eq(b.saves(),0);
});
log('DAYLIGHT_FOCUS_WEEK_TESTS_PASSED='+passed);
