// Development-only visual fixture. No real AI requests or credentials.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TextClassroom from '../../components/TextClassroom';
import { COURSES, TEACHERS } from '../../constants';
import '../../styles.css';

const steps = [
 {title:'Learning through experience',narration:'Think about learning to ride a bicycle. You try, notice what happened, and adjust. This cycle is one way we learn through experience. On the board, follow the steps from trying to improving.',question:'What feedback helps someone improve their balance?',blocks:[{kind:'definition',title:'Learning',items:['A lasting change in knowledge or skill through experience.','Practice gives us something to reflect on.']},{kind:'diagram',title:'The learning cycle',nodes:['Try an activity','Notice the result','Reflect and adjust','Try again']}]},
 {title:'Two ways to learn',narration:'You can learn by trying a skill yourself, or by watching someone demonstrate it. Both approaches are useful. Which would you choose before trying something unfamiliar?',question:'How could you combine observation and practice?',blocks:[{kind:'table',title:'Practice and observation',columns:['Approach','What the learner does','Example'],rows:[['Practice','Tries and adjusts','Rides a bicycle'],['Observation','Watches a model','Watches a demonstration']]},{kind:'chart',title:'Illustrative practice sessions (not research data)',labels:['Week 1','Week 2','Week 3'],values:[2,4,6],unit:'sessions'}]},
 {title:'A labelled sketch: solar energy',narration:'This is a visual rendering test. The sun supplies light, and the solar panel converts some of that energy into electricity.',question:'What supplies the energy in this sketch?',blocks:[{kind:'drawing',title:'From sunlight to a solar panel',shapes:[{type:'circle',x:30,y:60,width:100,height:100,label:'Sun'},{type:'line',x:150,y:110,width:100,height:0,label:'Light'},{type:'rectangle',x:290,y:70,width:110,height:100,label:'Solar panel'}]}]}
];
let turn=0;
window.addEventListener('pagehide',()=>{
  try {
    const history=JSON.parse(localStorage.getItem('edu_history')||'[]');
    if(Array.isArray(history))localStorage.setItem('edu_history',JSON.stringify(history.filter(item=>item?.courseId!=='board-visual-test')));
    localStorage.removeItem('edu_notes_board-visual-test');
  } catch { /* Preserve any unreadable data rather than replacing it. */ }
});
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>String(input).includes('/visual-test/v1/chat/completions')?new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(steps[turn++%steps.length])}}]}),{status:200,headers:{'Content-Type':'application/json'}}):nativeFetch(input,init);
createRoot(document.getElementById('root')!).render(<TextClassroom course={{...COURSES[0],id:'board-visual-test',title:'Teaching methods'}} teacher={TEACHERS[0]} language="en" lessonPlan={{subject:'Education',chapter:'Teaching aptitude',topic:'Learning theories',requirements:'Visual test with simulated responses; no AI provider is contacted.'}} student={{id:'board-visual-test',name:'Test learner',age:'18',className:'University',institution:'',address:'',city:'',state:'',country:'India',language:'en'}} connection={{provider:'custom',key:'non-secret-test-value',baseUrl:'http://127.0.0.1:3001/visual-test/v1',model:'test',source:'session'}} onExit={()=>window.location.reload()} onOpenProvider={()=>{}}/>);
