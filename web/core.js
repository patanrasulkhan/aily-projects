/* Daylight's versioned, browser-independent data model. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const dayKey = (value = new Date()) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const validDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  const text = (s, max) => typeof s === 'string' ? s.trim().slice(0,max) : '';
  const empty = () => ({version:VERSION,sample:false,tasks:[],habits:[],notes:[],sessions:[],timer:null});
  function normalize(input) {
    if (!input || input.version !== VERSION || !['tasks','habits','notes','sessions'].every(k => Array.isArray(input[k]))) throw new Error('This is not a supported Daylight backup.');
    if (input.tasks.length > 3000 || input.habits.length > 100 || input.notes.length > 1000 || input.sessions.length > 10000) throw new Error('This backup is too large.');
    const state = empty(); state.sample=!!input.sample;
    const unique = items => { const seen = new Set(); return items.filter(x => {if(!x.id || seen.has(x.id)) return false; seen.add(x.id); return true;}); };
    state.tasks = unique(input.tasks.filter(x=>x && typeof x==='object').map(t => ({id:text(t.id,100),title:text(t.title,200),description:text(t.description,2000),project:text(t.project,60)||'Personal',priority:['high','medium','low'].includes(t.priority)?t.priority:'medium',status:['todo','doing','done'].includes(t.status)?t.status:'todo',due:validDay(t.due)?t.due:'',createdAt:text(t.createdAt,40),completedAt:t.status==='done'?text(t.completedAt,40):''})).filter(t=>t.title));
    state.habits = unique(input.habits.filter(x=>x && typeof x==='object').map(h=>({id:text(h.id,100),title:text(h.title,100),...(Number.isInteger(h.weeklyTarget)&&h.weeklyTarget>=1&&h.weeklyTarget<=7?{weeklyTarget:h.weeklyTarget}:{}),days:[...new Set((Array.isArray(h.days)?h.days:[]).filter(validDay))].sort()})).filter(h=>h.title));
    state.notes = unique(input.notes.filter(x=>x && typeof x==='object').map(n=>({id:text(n.id,100),title:text(n.title,100)||'Untitled note',body:typeof n.body==='string'?n.body.slice(0,30000):'',pinned:!!n.pinned,updatedAt:text(n.updatedAt,40),...(text(n.folder,60)?{folder:text(n.folder,60)}:{})})));
    state.sessions = unique(input.sessions.filter(x=>x && typeof x==='object' && validDay(x.day) && Number.isFinite(x.minutes) && x.minutes>0 && x.minutes<=180).map(x=>({id:text(x.id,100),day:x.day,minutes:x.minutes})));
    const t = input.timer;
    if (t && typeof t==='object' && typeof t.id==='string' && Number.isFinite(t.duration) && t.duration>0 && t.duration<=10800 && Number.isFinite(t.remaining) && t.remaining>=0 && t.remaining<=10800 && (t.endAt===null || (Number.isFinite(t.endAt)&&t.endAt>0))) state.timer = {id:t.id.slice(0,100),duration:t.duration,remaining:t.remaining,endAt:t.endAt,label:text(t.label,40)||'Focus'};
    return state;
  }
  function addTask(state, input, now = new Date()) {
    const title = text(input.title,200); if(!title) throw new Error('Give your task a title.');
    if(state.tasks.length>=3000) throw new Error('Task limit reached. Export a backup before clearing old tasks.');
    const task = normalize({...empty(),tasks:[{...input,id:uid(),title,createdAt:new Date(now).toISOString(),completedAt:input.status==='done'?new Date(now).toISOString():''}]}).tasks[0];
    return {...state,tasks:[...state.tasks,task]};
  }
  function updateTask(state,id,patch,now=new Date()) {
    return {...state,tasks:state.tasks.map(t=>{if(t.id!==id) return t; const next={...t,...patch,id:t.id,createdAt:t.createdAt}; if(!text(next.title,200)) throw new Error('Give your task a title.'); next.completedAt=next.status==='done'?(t.completedAt||new Date(now).toISOString()):''; return normalize({...empty(),tasks:[next]}).tasks[0];})};
  }
  const habitTarget = habit => Number.isInteger(habit.weeklyTarget)&&habit.weeklyTarget>=1&&habit.weeklyTarget<=7?habit.weeklyTarget:7;
  function saveHabit(state,id,input) {
    const title=text(input.title,100), weeklyTarget=Number(input.weeklyTarget);
    if(!title) throw new Error('Give your habit a name.');
    if(!Number.isInteger(weeklyTarget)||weeklyTarget<1||weeklyTarget>7) throw new Error('Choose a weekly target from 1 to 7 days.');
    if(id&&!state.habits.some(h=>h.id===id)) throw new Error('This habit no longer exists.');
    if(!id&&state.habits.length>=100) throw new Error('Habit limit reached.');
    return {...state,habits:id?state.habits.map(h=>h.id===id?{...h,title,weeklyTarget}:h):[...state.habits,{id:uid(),title,weeklyTarget,days:[]}]};
  }
  function habitWeek(habit,now=new Date()) {
    const start=new Date(now);start.setHours(12,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);
    const end=new Date(start);end.setDate(end.getDate()+6);
    const first=dayKey(start),last=dayKey(end),today=dayKey(now);
    const count=new Set(habit.days.filter(d=>validDay(d)&&d>=first&&d<=last&&d<=today)).size;
    const target=habitTarget(habit);
    return {start:first,end:last,count,target,met:count>=target};
  }
  function toggleHabit(state,id,day=dayKey()) {if(!validDay(day)) throw new Error('Invalid date.'); return {...state,habits:state.habits.map(h=>h.id!==id?h:{...h,days:h.days.includes(day)?h.days.filter(d=>d!==day):[...h.days,day].sort()})};}
  function streak(habit, now = new Date()) { const d = new Date(now); d.setHours(12,0,0,0); if(!habit.days.includes(dayKey(d))) d.setDate(d.getDate()-1); let count=0; while(habit.days.includes(dayKey(d))) {count++;d.setDate(d.getDate()-1);} return count; }
  function filterTasks(state,{query='',status='',priority='',project='',today=false,due=''}={},now=new Date()) { const key=dayKey(now), q=query.toLocaleLowerCase(); const rank={high:0,medium:1,low:2}; return state.tasks.filter(t=>(!status||t.status===status)&&(!priority||t.priority===priority)&&(!project||t.project===project)&&(!today||(t.status!=='done'&&t.due&&t.due<=key))&&(!due||!['overdue','today','attention'].includes(due)||(t.status!=='done'&&t.due&&(due==='overdue'?t.due<key:due==='today'?t.due===key:t.due<=key)))&&(`${t.title} ${t.project} ${t.description}`.toLocaleLowerCase().includes(q))).sort((a,b)=>rank[a.priority]-rank[b.priority]||(a.due||'9999').localeCompare(b.due||'9999')||a.createdAt.localeCompare(b.createdAt)); }
  function filterNotes(state,{query='',folder=''}={}) {
    const q=query.trim().toLocaleLowerCase();
    return state.notes.filter(n=>(!folder||(folder==='unfiled'?!n.folder:n.folder===folder.slice(7)))&&(`${n.title} ${n.body}`.toLocaleLowerCase().includes(q))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt));
  }
  function startTimer(state,minutes=25,now=Date.now(),label='Focus') {if(!Number.isFinite(minutes)||minutes<1||minutes>180) throw new Error('Choose 1–180 minutes.'); return {...state,timer:{id:uid(),duration:minutes*60,remaining:minutes*60,endAt:now+minutes*60000,label}};}
  function remaining(timer,now=Date.now()) {return !timer?0:timer.endAt===null?timer.remaining:Math.max(0,Math.ceil((timer.endAt-now)/1000));}
  function pauseTimer(state,now=Date.now()) {return !state.timer?state:{...state,timer:{...state.timer,remaining:remaining(state.timer,now),endAt:null}};}
  function resumeTimer(state,now=Date.now()) {return !state.timer?state:{...state,timer:{...state.timer,endAt:now+state.timer.remaining*1000}};}
  function finishTimer(state,now=new Date()) {if(!state.timer||remaining(state.timer,new Date(now).getTime())>0) return state; const timer=state.timer; const sessions=state.sessions.some(s=>s.id===timer.id)||timer.label==='Break'?state.sessions:[...state.sessions,{id:timer.id,day:dayKey(now),minutes:timer.duration/60}]; return {...state,timer:null,sessions};}
  function demo(now=new Date()) {let s=empty(); s.sample=true; const today=dayKey(now); const tomorrow=new Date(now); tomorrow.setDate(tomorrow.getDate()+1); for(const t of [{title:'Outline the next big idea',project:'Creative',priority:'high',due:today,status:'doing',description:'Start with the problem, then sketch three possible solutions.'},{title:'Plan the week ahead',project:'Personal',priority:'medium',due:today,status:'todo'},{title:'Read a chapter',project:'Learning',priority:'low',due:dayKey(tomorrow),status:'todo'},{title:'Clear the desk, clear the mind',project:'Personal',priority:'low',status:'done'}]) s=addTask(s,t,now); s.habits=[{id:uid(),title:'Move for 20 minutes',days:[]},{id:uid(),title:'Read a little',days:[today]},{id:uid(),title:'Make time to reflect',days:[]}]; s.notes=[{id:uid(),title:'A little room to think',body:'What would make today feel meaningful?\n\nUse this space for ideas, meeting notes, or a quick brain dump. Small steps count.',pinned:true,updatedAt:new Date(now).toISOString()}]; return s;}
  const api = {VERSION,uid,dayKey,validDay,empty,normalize,addTask,updateTask,saveHabit,habitTarget,habitWeek,toggleHabit,streak,filterTasks,filterNotes,startTimer,remaining,pauseTimer,resumeTimer,finishTimer,demo};
  root.Daylight = api; if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
