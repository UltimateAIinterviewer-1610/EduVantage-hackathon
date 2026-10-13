
export enum Segment {
  School = 'School',
  University = 'University',
  Individual = 'Individual',
  Business = 'Business'
}

export type CourseCategory = 
  | 'AI Fundamentals' 
  | 'Machine Learning' 
  | 'Prompt Engineering' 
  | 'AI Ethics' 
  | 'Domain-Specific AI' 
  | 'AI for Business'
  | 'Fashion Design'
  | 'Fashion Tech'
  | 'Creative Arts'
  | 'Mathematics'
  | 'Science'
  | 'Management'
  | 'Entrepreneurship'
  | 'Programming'
  | 'Performing Arts'
  | 'Martial Arts'
  | 'Culinary Arts'
  | 'Digital Design'
  | 'Strategic Games'
  | 'Botany & Ecology'
  | 'Advanced Photography'
  | 'Cybersecurity'
  | 'Wellness & Nature'
  | 'Music & Composition'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'History'
  | 'Geography'
  | 'Political Science'
  | 'Economics'
  | 'Social Science'
  | 'Literature'
  | 'Computer Science'
  | 'Law'
  | 'Business Strategy'
  | 'General Studies'
  | 'Commerce'
  | 'Competitive Exams'
  | 'Moral Science'
  | 'Art & Creativity'
  | 'Data Literacy'
  | 'Business Analytics'
  | 'Data Analytics'
  | 'Chess'
  | 'Sanskrit';

export type LanguageCode = 
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ru' | 'ar' | 'zh' | 'ja' | 'ko'
  | 'hi' | 'en-hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or' | 'as' | 'sa'
  | 'ur' | 'id' | 'ms' | 'th' | 'vi' | 'tr' | 'fa' | 'sw' | 'nl' | 'pl' | 'uk' | 'ne' | 'si' | 'fil';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export interface Teacher {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar: string;
  expertise: string[];
}

export interface Course {
  id: string;
  title: string;
  segment: Segment;
  description: string;
  category: CourseCategory;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  format: 'Lecture' | 'Practical' | 'Masterclass';
  classLevel?: string;
  semester?: string;
  businessSize?: 'small' | 'medium' | 'enterprise';
  subjectCode?: string;
}

export interface SessionRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherName: string;
  timestamp: number;
  duration: number;
  videoUrl: string;
  lessonPlan?: { subject: string; chapter: string; topic: string; requirements: string };
  transcript?: { user: string; ai: string }[];
  whiteboard?: WhiteboardContent[];
  sourceRefs?: { title: string; label: string; excerpt: string }[];
}

export interface Annotation {
  type: 'highlight' | 'label';
  text: string;
  color?: string;
  x?: number;
  y?: number;
}

export interface Shape {
  type: 'line' | 'rectangle' | 'circle';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  color?: string;
  strokeWidth?: number;
}

export interface WhiteboardContent {
  teachingStep?: import('./services/teachingBoard').TeachingStep;
  id: string;
  topic?: string;
  subtopic?: string;
  type: 'text' | 'code' | 'diagram' | 'math';
  content: string;
  sources?: { number: number; title: string; label: string; excerpt: string }[];
  keyPoints?: string[];
  annotations?: Annotation[];
  shapes?: Shape[];
  timestamp: number;
}

export interface EngagementMetrics {
  participationTime: number;
  questionsAsked: number;
  readinessScore: number;
  aiLiteracyScore?: number;
  subjectReadinessScore?: number;
  businessAIReadinessIndex?: number;
  languageComfortScore?: number;
  discussionParticipationScore?: number;
}

export interface ReadinessScore {
  category: string;
  score: number;
  fullMark: number;
}

export interface StudentProfile {
 id?: string;
 name: string;
 age: string;
 className: string;
 institution: string;
 address: string;
 city: string;
 state: string;
 country: string;
 language: LanguageCode;
}
