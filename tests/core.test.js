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
