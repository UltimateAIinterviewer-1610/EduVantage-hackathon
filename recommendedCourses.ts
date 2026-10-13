import { Course, Segment } from './types';

// These courses live on Home and use the same planning and classroom flow as the library.
export const RECOMMENDED_COURSES: Course[] = [
  {
    id: 'rec-ai-foundations',
    title: 'Artificial Intelligence: Foundations',
    segment: Segment.Individual,
    description: 'Understand what AI is, how it learns from data, what it can do, and where it falls short.',
    category: 'AI Fundamentals', level: 'Beginner', format: 'Lecture',
  },
  {
    id: 'rec-prompt-engineering',
    title: 'Prompt Engineering',
    segment: Segment.Individual,
    description: 'Learn to ask clearly, give useful context, test responses, and improve your prompts.',
    category: 'Prompt Engineering', level: 'Beginner', format: 'Practical',
  },
  {
    id: 'rec-ai-ethics',
    title: 'AI Ethics',
    segment: Segment.Individual,
    description: 'Explore fairness, privacy, safety, and who stays responsible when AI makes mistakes.',
    category: 'AI Ethics', level: 'Beginner', format: 'Lecture',
  },
  {
    id: 'rec-ai-usage',
    title: 'Using AI: Advantages and Disadvantages',
    segment: Segment.Individual,
    description: 'See practical uses of AI alongside its limits, risks, and the need to check its answers.',
    category: 'AI Fundamentals', level: 'Beginner', format: 'Practical',
  },
  {
    id: 'rec-theory-before-practice',
    title: 'Why Theory Matters Before Practice',
    segment: Segment.Individual,
    description: 'Discover how understanding the “why” makes hands-on learning safer and more effective.',
    category: 'General Studies', level: 'Beginner', format: 'Lecture',
  },
];

const sharedTeachingApproach = 'Teach as a patient, multi-part classroom lesson in easy language suited to my level. Start with the core theory and meaning before an activity. Use a memorable short story, then a detailed real-life example. Explain benefits, limitations, and common mistakes honestly. Ask one understanding question at a time, invite my questions, and continue step by step rather than ending after one reply.';

const exampleByCourse: Record<string, string> = {
  'rec-ai-foundations': 'Use a spam filter, a recommendation system, and a made-up prediction to distinguish learning patterns from understanding.',
  'rec-prompt-engineering': 'Compare a vague prompt with a clear prompt for planning a school trip, then show how to test and revise the result.',
  'rec-ai-ethics': 'Use a fictional scholarship decision to discuss bias, privacy, transparency, and human responsibility.',
  'rec-ai-usage': 'Compare helpful uses in studying, accessibility, and daily work with errors, privacy risks, over-reliance, and misinformation.',
  'rec-theory-before-practice': 'Tell a story about building a bridge or cooking without understanding the principles, then connect theory to safe practice.',
};

export function recommendedTeachingBrief(courseId: string): string {
  const example = exampleByCourse[courseId];
  return example ? `${sharedTeachingApproach} ${example}` : '';
}
