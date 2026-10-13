import { Course } from './types';

export interface Chapter { title: string; topics: string[] }
export interface LessonPlan { subject: string; chapter: string; topic: string; requirements: string }

// Each existing course has a small, editable starting outline. The learner can
// always enter a different chapter or topic when their syllabus differs.
const outlines: Record<string, Chapter[]> = {
 'sch-pg-discovery': [{title:'Explore with the senses',topics:['Colours and textures','Sounds around us','Shapes we can touch']},{title:'Learning through play',topics:['Sorting everyday objects','Fine motor activities','Creative exploration']}],
 'sch-n-alpha': [{title:'Letter sounds',topics:['Recognising letters','Beginning sounds','Rhymes and listening']},{title:'First words',topics:['Joining sounds','Reading simple words','Writing letters']}],
 'sch-k1-num': [{title:'Numbers around us',topics:['Counting to ten','Comparing quantities','Number patterns']},{title:'Shapes and space',topics:['Basic shapes','Sorting shapes','Patterns in daily life']}],
 'sch-k2-world': [{title:'Nature and seasons',topics:['Weather and seasons','Plants and animals','Caring for nature']},{title:'People and places',topics:['Family and community','Places around us','Healthy habits']}],
 'sch-1-arith': [{title:'Number sense',topics:['Place value','Counting strategies','Comparing numbers']},{title:'Arithmetic',topics:['Addition with objects','Subtraction with objects','Word problems']}],
 'sch-5-env': [{title:'Ecosystems',topics:['Food chains','Habitats','Human impact']},{title:'Water and plants',topics:['Water cycle','Plant life cycles','Conservation']}],
 'sch-8-alg': [{title:'Algebra foundations',topics:['Variables and expressions','Simple equations','Word problems']},{title:'Rational numbers',topics:['Operations','Number line','Applications']}],
 'sch-10-board': [{title:'Science review',topics:['Physics essentials','Chemistry essentials','Biology essentials']},{title:'Maths and exam practice',topics:['Algebra and geometry','Practice questions','Revision strategy']}],
 'sch-12-pcm': [{title:'Electricity and magnetism',topics:['Electric fields','Circuits','Magnetism']},{title:'Optics and modern physics',topics:['Ray optics','Wave optics','Atomic physics']}],
 'uni-eng-civil': [{title:'Structural fundamentals',topics:['Loads and forces','Materials','Equilibrium']},{title:'Design applications',topics:['Beams and columns','Safety factors','Case studies']}],
 'uni-arts-lit': [{title:'Contemporary art',topics:['Major movements','Visual language','Critical theory']},{title:'Practice and critique',topics:['Interpreting artworks','Developing a concept','Portfolio discussion']}],
 'uni-sci-biotech': [{title:'Genetics foundations',topics:['DNA and genes','Gene expression','Lab safety']},{title:'Genetic engineering',topics:['Recombinant DNA','Gene editing','Ethics and applications']}],
 'uni-comm-finance': [{title:'International markets',topics:['Trade basics','Exchange rates','Balance of payments']},{title:'Global finance',topics:['Trade finance','Currency risk','Case studies']}],
 'uni-law-const': [{title:'Constitutional principles',topics:['Sources of constitutional law','Separation of powers','Fundamental rights']},{title:'Comparative frameworks',topics:['Judicial review','Federal systems','Constitutional cases']}],
 'exam-upsc-gs': [{title:'General studies foundations',topics:['History themes','Polity fundamentals','Geography themes']},{title:'Exam practice',topics:['Current affairs analysis','Answer writing','Revision plan']}],
 'exam-gate-cs': [{title:'Core computer science',topics:['Data structures','Algorithms','Operating systems']},{title:'GATE practice',topics:['Computer networks','Past questions','Problem solving']}],
 'exam-cat-quant': [{title:'Quantitative aptitude',topics:['Arithmetic','Algebra','Geometry']},{title:'Test strategy',topics:['Logical reasoning','Data interpretation','Timed practice']}],
 'exam-net-ugc': [{title:'Teaching aptitude',topics:['Learning theories','Teaching methods','Assessment']},{title:'Research aptitude',topics:['Research methods','Data interpretation','Practice questions']}],
 'exam-ssc-cgl': [{title:'Reasoning and maths',topics:['Number systems','Logical reasoning','Quantitative practice']},{title:'General awareness',topics:['Current affairs','English comprehension','Mock test strategy']}],
 'exam-ctet-ped': [{title:'Child development',topics:['Development stages','Learning differences','Inclusive education']},{title:'Pedagogy',topics:['Teaching approaches','Classroom assessment','Practice questions']}],
 'exam-olympiad-math': [{title:'Mathematical reasoning',topics:['Patterns','Number theory','Combinatorics']},{title:'Problem solving',topics:['Geometry challenges','Proof ideas','Past problems']}],
 'dance-kathak-steps': [{title:'Kathak foundations',topics:['Posture and rhythm','Basic tatkar','Hand movements']},{title:'Movement practice',topics:['Chakkars','Taal coordination','Short composition']}],
 'music-rhythm-mastery': [{title:'Rhythm foundations',topics:['Beat and tempo','Taal structure','Counting cycles']},{title:'Percussion practice',topics:['Basic bols','Rhythm patterns','Improvisation']}],
 'music-hindi-vocal': [{title:'Voice foundations',topics:['Breath and pitch','Swar practice','Voice care']},{title:'Raga basics',topics:['Aroha and avaroha','Simple phrases','Listening practice']}],
 'gram-eng-adv': [{title:'Advanced syntax',topics:['Clauses and phrases','Sentence structure','Common errors']},{title:'Rhetoric and writing',topics:['Tone and style','Argument structure','Editing practice']}],
 'gram-hi-vyakaran': [{title:'Hindi grammar foundations',topics:['संज्ञा और सर्वनाम','काल और क्रिया','वाक्य रचना']},{title:'Advanced grammar',topics:['संधि','समास','अभ्यास प्रश्न']}],
 'well-yoga-asana': [{title:'Yoga foundations',topics:['Breathing and safety','Alignment basics','Warm-up']},{title:'Asana practice',topics:['Standing poses','Seated poses','Gentle sequence']}],
 'well-med-dhyana': [{title:'Meditation foundations',topics:['Posture and breathing','Attention practice','Working with distraction']},{title:'Building a routine',topics:['Short guided practice','Mindful daily habits','Reflection']}],
 'sanskrit-eternal-evolution': [{title:'Sanskrit foundations',topics:['Script and sounds','Basic grammar','Early texts']},{title:'Language through time',topics:['Vedic Sanskrit','Classical Sanskrit','Modern applications']}],
 'sanskrit-om-spiritual': [{title:'Sound and meaning',topics:['Pronunciation of Om','Historical context','Breath and resonance']},{title:'Reflective practice',topics:['Listening practice','Chanting safely','Interpretations']}],
 'ai-prompt-eng': [{title:'Prompt design',topics:['Clear instructions','Context and examples','Output formats']},{title:'Professional workflows',topics:['Iteration','Evaluation','Responsible use']}],
 'ai-ethics-bias': [{title:'Algorithmic fairness',topics:['Sources of bias','Fairness measures','Real-world cases']},{title:'Governance',topics:['Privacy','Accountability','Risk assessment']}],
 'rec-ai-foundations': [
  {title:'What AI means',topics:['AI in everyday life','Rules, data and learning patterns','What AI can and cannot understand']},
  {title:'How AI learns',topics:['Training data and examples','Predictions and mistakes','Why quality data matters']},
  {title:'Using AI thoughtfully',topics:['Checking an answer','Human judgment','A real-life AI case study']},
 ],
 'rec-prompt-engineering': [
  {title:'Asking clearly',topics:['Goal, context and audience','From vague to useful prompts','Choosing a clear output format']},
  {title:'Improving a response',topics:['Examples and constraints','Testing and revising prompts','Checking facts and sources']},
  {title:'Responsible workflows',topics:['Privacy in prompts','When to ask a person instead','A school or work project']},
 ],
 'rec-ai-ethics': [
  {title:'People and AI decisions',topics:['Who is responsible?','Fairness and bias','Explaining a decision']},
  {title:'Safety and privacy',topics:['Personal data and consent','Misinformation and deepfakes','Protecting vulnerable people']},
  {title:'Real-life dilemmas',topics:['AI in education','AI in hiring or scholarships','Choosing a safer design']},
 ],
 'rec-ai-usage': [
  {title:'Helpful uses of AI',topics:['Learning and accessibility','Creative and everyday work','Saving time responsibly']},
  {title:'Limits and disadvantages',topics:['Wrong or invented answers','Privacy and security risks','Over-reliance and lost skills']},
  {title:'Better choices',topics:['Checking AI output','Deciding when AI is appropriate','A balanced real-life case']},
 ],
 'rec-theory-before-practice': [
  {title:'Understanding before doing',topics:['What theory gives us','Mental models and predictions','Why memorising steps is not enough']},
  {title:'When practice goes wrong',topics:['Spotting mistakes','Safety and ethics','Learning from a failed attempt']},
  {title:'Bringing both together',topics:['Theory to a small experiment','Reflecting on the result','A real-life learning plan']},
 ],
 'da-viz-tableau': [{title:'Visual analytics',topics:['Data preparation','Chart choice','Visual hierarchy']},{title:'Tableau workflow',topics:['Dashboards','Filters and interaction','Presenting insights']}],
 'ba-strategy-roi': [{title:'ROI foundations',topics:['Costs and benefits','Forecast assumptions','Key metrics']},{title:'Business forecasting',topics:['Scenario analysis','Risk and uncertainty','Presenting a recommendation']}],
 'prog-py-ai': [{title:'Python foundations',topics:['Variables and types','Control flow','Functions']},{title:'Data and AI practice',topics:['Lists and dictionaries','Working with data','First AI workflow']}],
 'prog-js-full': [{title:'JavaScript foundations',topics:['Syntax and functions','DOM and events','Async requests']},{title:'Full-stack workflow',topics:['Frontend components','API basics','Deployment overview']}],
};

export function chaptersFor(course: Course, subject?: string): Chapter[] {
 return (subject && subjectOutlines[course.id]?.[subject]) || outlines[course.id] || [{title:'Foundations',topics:['Introduction','Core ideas','Practical examples']}];
}

const additionalSubjects: Record<string,string[]> = {
 'sch-10-board':['Physics','Chemistry','Biology','Mathematics'],
 'exam-upsc-gs':['History','Polity','Geography','Current Affairs'],
 'exam-ssc-cgl':['Quantitative Aptitude','Reasoning','English','General Awareness'],
 'exam-ctet-ped':['Child Development','Pedagogy'],
 'exam-gate-cs':['Data Structures','Algorithms','Computer Science'],
 'uni-sci-biotech':['Genetics','Biotechnology'],
};
export function subjectsFor(course: Course): string[] {
 if (course.id.startsWith('rec-')) return [course.title];
 return [...new Set([course.category,...(additionalSubjects[course.id] || [])])];
}

const subjectOutlines: Record<string,Record<string,Chapter[]>> = {
 'sch-10-board': {
  Physics:[{title:'Motion and forces',topics:['Motion graphs','Newton’s laws','Work and energy']},{title:'Electricity and light',topics:['Circuits','Magnetism','Reflection and refraction']}],
  Chemistry:[{title:'Reactions and equations',topics:['Balancing equations','Types of reactions','Acids and bases']},{title:'Materials',topics:['Metals and non-metals','Carbon compounds','Periodic trends']}],
  Biology:[{title:'Life processes',topics:['Nutrition','Respiration','Transport']},{title:'Living systems',topics:['Reproduction','Heredity','Environment']}],
  Mathematics:[{title:'Algebra',topics:['Quadratic equations','Arithmetic progressions','Polynomials']},{title:'Geometry and statistics',topics:['Triangles','Trigonometry','Probability']}],
 },
 'exam-upsc-gs': {
  History:[{title:'Indian history',topics:['Ancient India','Medieval India','Modern India']}],
  Polity:[{title:'Indian polity',topics:['Constitution','Parliament','Judiciary']}],
  Geography:[{title:'Geography',topics:['Physical geography','Indian geography','Environment']}],
  'Current Affairs':[{title:'Current affairs',topics:['Reading sources','Issue analysis','Answer writing']}],
 },
 'exam-ssc-cgl': {
  'Quantitative Aptitude':[{title:'Quantitative aptitude',topics:['Arithmetic','Algebra','Data interpretation']}],
  Reasoning:[{title:'Reasoning',topics:['Series','Analogies','Logical puzzles']}],
  English:[{title:'English',topics:['Grammar','Vocabulary','Comprehension']}],
  'General Awareness':[{title:'General awareness',topics:['History','Science','Current affairs']}],
 },
 'exam-ctet-ped': {
  'Child Development':[{title:'Child development',topics:['Development stages','Learning differences','Inclusive education']}],
  Pedagogy:[{title:'Teaching practice',topics:['Learning theories','Classroom methods','Assessment']}],
 },
 'exam-gate-cs': {
  'Data Structures':[{title:'Data structures',topics:['Arrays and linked lists','Trees','Graphs']}],
  Algorithms:[{title:'Algorithms',topics:['Complexity','Sorting and searching','Dynamic programming']}],
  'Computer Science':[{title:'Computer science',topics:['Operating systems','Networks','Databases']}],
 },
 'uni-sci-biotech': {
  Genetics:[{title:'Genetics',topics:['Inheritance','DNA replication','Gene expression']}],
  Biotechnology:[{title:'Biotechnology',topics:['Recombinant DNA','Gene editing','Applications and ethics']}],
 },
};
