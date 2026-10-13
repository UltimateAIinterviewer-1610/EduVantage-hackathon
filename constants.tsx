
import { Segment, Teacher, Course, LanguageOption } from './types';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'zh', label: 'Mandarin', nativeLabel: '普通话' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'en-hi', label: 'Hinglish', nativeLabel: 'Hinglish' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'ಮराठी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমीয়া' },
  { code: 'sa', label: 'Sanskrit', nativeLabel: 'संस्कृतम्' },
];

export const TEACHERS: Teacher[] = [
  {
    id: 'visualist-victor',
    name: 'Visualist Victor',
    role: 'Master of Light & Optics',
    personality: 'Highly visual, observant, and technical. He explains photography through the physics of light and the psychology of composition.',
    avatar: 'https://picsum.photos/seed/victor/200',
    expertise: ['Advanced Photography', 'Studio Lighting', 'Visual Storytelling', 'Cinematic Composition', 'Post-Processing']
  },
  {
    id: 'analyst-maya',
    name: 'Analyst Maya',
    role: 'Lead Data & BI Specialist',
    personality: 'Insightful, methodical, and data-driven. She explains complex patterns through clear, real-world business scenarios.',
    avatar: 'https://picsum.photos/seed/maya/200',
    expertise: ['Business Analytics', 'Data Analytics', 'Tableau', 'Power BI', 'SQL', 'Predictive Modeling']
  },
  {
    id: 'ms-spark',
    name: 'Ms. Spark',
    role: 'K-12 Creative Educator',
    personality: 'Story-driven, curiosity-based, very patient and encouraging. Uses lots of metaphors and simple examples.',
    avatar: 'https://picsum.photos/seed/spark/200',
    expertise: ['Basic AI', 'Creative Arts', 'Ethics for Kids', 'K-12 Core', 'Kids Fashion Art', 'Mathematics', 'English', 'Moral Science', 'Art & Creativity']
  },
  {
    id: 'prof-aurora',
    name: 'Professor Aurora',
    role: 'University Academic Lead',
    personality: 'Structured, deep-dive academic, analytical and exam-focused. High emphasis on theory and research.',
    avatar: 'https://picsum.photos/seed/aurora/200',
    expertise: ['Machine Learning', 'Data Science', 'Academic Research', 'Engineering', 'Fashion Theory', 'Mathematics', 'Physics', 'Science', 'GATE']
  },
  {
    id: 'coach-zen',
    name: 'Coach Zen',
    role: 'Personal Growth Partner',
    personality: 'Practical, productivity-oriented, empathetic and results-driven. Focuses on tools and career transition.',
    avatar: 'https://picsum.photos/seed/zen/200',
    expertise: ['Prompt Engineering', 'AI Productivity', 'Career Guidance', 'Domain AI', 'Digital Fashion']
  },
  {
    id: 'strategist-max',
    name: 'Strategist Maxwell',
    role: 'Enterprise Consultant',
    personality: 'High-level strategy, ROI-focused, authoritative but collaborative. Excellent for business stakeholders.',
    avatar: 'https://picsum.photos/seed/max/200',
    expertise: ['Enterprise Strategy', 'AI Governance', 'Scalability', 'B2B Automation', 'Fashion Supply Chain', 'MBA', 'Economics', 'Commerce', 'BBA', 'CAT']
  },
  {
    id: 'dev-ravi',
    name: 'Dev Ravi',
    role: 'Lead Systems Architect',
    personality: 'Logical, concise, focuses on clean code and algorithmic thinking. Loves live debugging.',
    avatar: 'https://picsum.photos/seed/ravi/200',
    expertise: ['Programming', 'Python', 'React', 'Cybersecurity', 'System Design', 'Computer Science', 'BCA', 'MCA', 'B.Tech']
  },
  {
    id: 'maestro-elena',
    name: 'Maestro Elena',
    role: 'Arts & Performance Director',
    personality: 'Passionate, expressive, focuses on rhythm, emotion, and technical precision.',
    avatar: 'https://picsum.photos/seed/elena/200',
    expertise: ['Dance', 'Music Theory', 'Digital Arts', 'Piano', 'Contemporary Dance', 'Music & Composition', 'Digital Design']
  },
  {
    id: 'sensei-lee',
    name: 'Sensei Lee',
    role: 'Master of Discipline',
    personality: 'Calm, philosophical, focuses on mental focus, strategy, and physical control.',
    avatar: 'https://picsum.photos/seed/lee/200',
    expertise: ['Martial Arts', 'Kung-Fu', 'Chess Strategy', 'Strategic Thinking', 'Jiu-Jitsu', 'Muay Thai', 'Chess Openings', 'Endgame Theory']
  },
  {
    id: 'chef-flora',
    name: 'Chef & Botanist Flora',
    role: 'Nature & Culinary Expert',
    personality: 'Nurturing, sensory-focused, combines science with art. Expert on seasonal cycles.',
    avatar: 'https://picsum.photos/seed/flora/200',
    expertise: ['Botany', 'Culinary Arts', 'Gardening', 'Plant Nutrition', 'Organic Cooking', 'Environmental Studies', 'Pastry', 'Gastronomy']
  },
  {
    id: 'historian-henry',
    name: 'Historian Henry',
    role: 'World History & Law Guide',
    personality: 'Captivating storyteller, focuses on historical context, legal reasoning, and societal evolution.',
    avatar: 'https://picsum.photos/seed/henry/200',
    expertise: ['History', 'Law', 'Political Science', 'Social Science', 'Philosophy', 'UPSC', 'Economics', 'Geography', 'Sanskrit Origins', 'Spiritual Acoustics']
  },
  {
    id: 'scientist-sarah',
    name: 'Scientist Sarah',
    role: 'Bio-Chem Research Expert',
    personality: 'Precise, experiment-driven, loves explaining the "why" behind molecular interactions.',
    avatar: 'https://picsum.photos/seed/sarah/200',
    expertise: ['Biology', 'Chemistry', 'Physics', 'Medicine', 'Lab Practicals']
  }
];

export const COURSES: Course[] = [
  // --- SCHOOL LEVEL: PLAY GROUP TO CLASS 12 ---
  { id: 'sch-pg-discovery', title: 'Play Group: Sensory Discovery', segment: Segment.School, description: 'Developing fine motor skills and sensory awareness through play-led learning.', category: 'General Studies', level: 'Beginner', format: 'Practical', classLevel: 'Primary' },
  { id: 'sch-n-alpha', title: 'Nursery: Alphabet & Phonetics', segment: Segment.School, description: 'First steps into reading and letter recognition through song and story.', category: 'Literature', level: 'Beginner', format: 'Lecture', classLevel: 'Primary' },
  { id: 'sch-k1-num', title: 'KG-1: Numbers & Shapes', segment: Segment.School, description: 'Building mathematical intuition through visual counting and geometric play.', category: 'Mathematics', level: 'Beginner', format: 'Practical', classLevel: 'Primary' },
  { id: 'sch-k2-world', title: 'KG-2: The World Around Us', segment: Segment.School, description: 'Introduction to nature, seasons, and social interactions.', category: 'General Studies', level: 'Beginner', format: 'Lecture', classLevel: 'Primary' },
  { id: 'sch-1-arith', title: 'Class 1: Arithmetic Foundations', segment: Segment.School, description: 'Mastering basic addition and subtraction with real-world objects.', category: 'Mathematics', level: 'Beginner', format: 'Lecture', classLevel: 'Primary' },
  { id: 'sch-5-env', title: 'Class 5: Environmental Science', segment: Segment.School, description: 'Studying ecosystems, water cycles, and basic botany.', category: 'Science', level: 'Beginner', format: 'Practical', classLevel: 'Primary' },
  { id: 'sch-8-alg', title: 'Class 8: Algebra & Rational Numbers', segment: Segment.School, description: 'Introduction to variables, equations, and rational operations.', category: 'Mathematics', level: 'Intermediate', format: 'Lecture', classLevel: 'Middle' },
  { id: 'sch-10-board', title: 'Class 10: Board Exam Preparation', segment: Segment.School, description: 'Comprehensive review of Physics, Chemistry, Biology, and Math for final boards.', category: 'General Studies', level: 'Intermediate', format: 'Masterclass', classLevel: 'Secondary' },
  { id: 'sch-12-pcm', title: 'Class 12: Advanced Physics (PCM)', segment: Segment.School, description: 'Electromagnetism, Optics, and Modern Physics for senior secondary levels.', category: 'Physics', level: 'Advanced', format: 'Lecture', classLevel: 'Senior Secondary' },

  // --- UNIVERSITY LEVEL: ALL DEPARTMENTS ---
  { id: 'uni-eng-civil', title: 'Civil Engineering: Structural Design', segment: Segment.University, description: 'Department of Engineering. Mastery of load-bearing structures and material science.', category: 'Management', level: 'Advanced', format: 'Practical' },
  { id: 'uni-arts-lit', title: 'Fine Arts: Contemporary Aesthetics', segment: Segment.University, description: 'Department of Arts. Exploring postmodern theory and visual expression.', category: 'Management', level: 'Intermediate', format: 'Lecture' },
  { id: 'uni-sci-biotech', title: 'Biotechnology: Genetic Engineering', segment: Segment.University, description: 'Department of Science. Practical gene splicing and lab protocols.', category: 'Biology', level: 'Advanced', format: 'Practical' },
  { id: 'uni-comm-finance', title: 'Commerce: International Finance', segment: Segment.University, description: 'Department of Commerce. Analyzing global markets and trade finance.', category: 'Commerce', level: 'Advanced', format: 'Lecture' },
  { id: 'uni-law-const', title: 'Law: Constitutional Frameworks', segment: Segment.University, description: 'Department of Law. Comparative study of global legal systems.', category: 'Law', level: 'Advanced', format: 'Lecture' },

  // --- COMPETITIVE EXAMS ---
  { id: 'exam-upsc-gs', title: 'UPSC/IAS: General Studies Strategy', segment: Segment.Individual, description: 'Comprehensive preparation for Civil Services. Polities, History, and Current Affairs.', category: 'Competitive Exams', level: 'Advanced', format: 'Masterclass' },
  { id: 'exam-gate-cs', title: 'GATE: Computer Science & IT', segment: Segment.University, description: 'Rigorous preparation for engineering entrance. Data structures and algorithms focus.', category: 'Competitive Exams', level: 'Advanced', format: 'Practical' },
  { id: 'exam-cat-quant', title: 'CAT/XAT: Quantitative Aptitude Mastery', segment: Segment.Individual, description: 'Mastering the logical reasoning and math required for top MBA programs.', category: 'Competitive Exams', level: 'Advanced', format: 'Practical' },
  { id: 'exam-net-ugc', title: 'NET UGC: Teaching & Research Aptitude', segment: Segment.University, description: 'Preparing for JRF and Assistant Professorship. Paper 1 and specialized electives.', category: 'Competitive Exams', level: 'Advanced', format: 'Lecture' },
  { id: 'exam-ssc-cgl', title: 'SSC CGL: Tier 1 & 2 Blueprint', segment: Segment.Individual, description: 'Focused preparation for government staff selection. Reasoning and General Awareness.', category: 'Competitive Exams', level: 'Intermediate', format: 'Practical' },
  { id: 'exam-ctet-ped', title: 'CTET: Pedagogy & Child Development', segment: Segment.Individual, description: 'Preparing for the Central Teacher Eligibility Test. Child psychology and methodology.', category: 'Competitive Exams', level: 'Intermediate', format: 'Lecture' },
  { id: 'exam-olympiad-math', title: 'Olympiad: Mathematical Excellence', segment: Segment.School, description: 'Advanced problem-solving for school-level global olympiads.', category: 'Competitive Exams', level: 'Advanced', format: 'Practical' },

  // --- DANCE & MUSIC (KATHAK, RHYTHM, ETC.) ---
  { id: 'dance-kathak-steps', title: 'Kathak: Essential Steps & Chakkars', segment: Segment.Individual, description: 'Mastering the fundamental footwork (Tatkar) and spins of Classical Indian Dance.', category: 'Performing Arts', level: 'Beginner', format: 'Practical' },
  { id: 'music-rhythm-mastery', title: 'The Science of Rhythm: Tabla & Percussion', segment: Segment.Individual, description: 'Exploring complex time signatures (Taal) and rhythmic cycles for all instruments.', category: 'Performing Arts', level: 'Intermediate', format: 'Practical' },
  { id: 'music-hindi-vocal', title: 'Hindustani Classical: Raga Basics', segment: Segment.Individual, description: 'Voice culture and exploration of the basic Ragas in Indian music.', category: 'Performing Arts', level: 'Beginner', format: 'Practical' },

  // --- GRAMMAR (HINDI & ENGLISH) ---
  { id: 'gram-eng-adv', title: 'English Grammar: Syntax & Rhetoric', segment: Segment.Individual, description: 'Mastering complex sentence structures and persuasive writing techniques.', category: 'Literature', level: 'Advanced', format: 'Lecture' },
  { id: 'gram-hi-vyakaran', title: 'Hindi Vyakaran: Sampurna Bodh', segment: Segment.Individual, description: 'Comprehensive study of Hindi grammar from Sandhi to Samas.', category: 'Literature', level: 'Intermediate', format: 'Lecture' },

  // --- MEDITATION & YOGA ---
  { id: 'well-yoga-asana', title: 'Yoga: Asana & Alignment', segment: Segment.Individual, description: 'Practical session on postures, flexibility, and physical discipline.', category: 'Wellness & Nature', level: 'Beginner', format: 'Practical' },
  { id: 'well-med-dhyana', title: 'Dhyana: Mastering Internal Silence', segment: Segment.Individual, description: 'Guided meditation techniques for focus and mental clarity.', category: 'Wellness & Nature', level: 'Intermediate', format: 'Practical' },

  // --- SANSKRIT & SPIRITUAL ---
  { id: 'sanskrit-eternal-evolution', title: 'Sanskrit: The Eternal Evolution', segment: Segment.Individual, description: 'A longitudinal study from Vedic roots to modern AI applications.', category: 'Sanskrit', level: 'Advanced', format: 'Masterclass' },
  { id: 'sanskrit-om-spiritual', title: 'The Sacred Sound: Mastering OM', segment: Segment.Individual, description: 'Exploring the cosmic vibration and spiritual acoustics of OM.', category: 'Sanskrit', level: 'Advanced', format: 'Practical' },

  // --- AI & TECH ---
  { id: 'ai-prompt-eng', title: 'Prompt Engineering for Professionals', segment: Segment.Business, description: 'Optimizing LLM workflows for enterprise productivity.', category: 'AI Fundamentals', level: 'Intermediate', format: 'Practical', businessSize: 'medium' },
  { id: 'ai-ethics-bias', title: 'AI Ethics: Navigating Algorithmic Bias', segment: Segment.Business, description: 'Ensuring fairness and governance in automated systems.', category: 'AI Ethics', level: 'Advanced', format: 'Lecture', businessSize: 'enterprise' },

  // --- ANALYTICS ---
  { id: 'da-viz-tableau', title: 'Data Analytics: Tableau Visuals', segment: Segment.Business, description: 'Turning complex datasets into actionable business dashboards.', category: 'Data Analytics', level: 'Intermediate', format: 'Practical', businessSize: 'small' },
  { id: 'ba-strategy-roi', title: 'Business Analytics: ROI Forecasting', segment: Segment.Business, description: 'Using statistical models to predict business growth and risk.', category: 'Business Analytics', level: 'Advanced', format: 'Masterclass', businessSize: 'medium' },

  // --- PROGRAMMING ---
  { id: 'prog-py-ai', title: 'Python for AI & Data Science', segment: Segment.Individual, description: 'Mastering the language of the modern AI revolution.', category: 'Programming', level: 'Beginner', format: 'Practical' },
  { id: 'prog-js-full', title: 'Full-Stack JavaScript Mastery', segment: Segment.Individual, description: 'Building scalable web apps from frontend to backend.', category: 'Programming', level: 'Intermediate', format: 'Practical' },
];
