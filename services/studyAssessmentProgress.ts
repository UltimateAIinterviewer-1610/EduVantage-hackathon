import { persistLearnerData } from './cloud';
import type { AssessmentQuestion } from './studyAssessment';

export interface AssessmentDraft {
  questions: AssessmentQuestion[];
  index: number;
  response: string;
  answers: { correct: boolean; response: string }[];
  showKey: boolean;
}
const draftKey = (profileId: string) => `edu_study_assessment_session_${profileId}`;
export function readAssessmentDraft(profileId: string): AssessmentDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey(profileId)) || 'null');
    return value && Array.isArray(value.questions) && Number.isInteger(value.index) && value.index >= 0 && value.index <= value.questions.length && Array.isArray(value.answers) && typeof value.response === 'string' && typeof value.showKey === 'boolean' ? value as AssessmentDraft : null;
  } catch { return null; }
}
export function saveAssessmentDraft(profileId: string, draft: AssessmentDraft): void {
  persistLearnerData(draftKey(profileId), JSON.stringify(draft));
}

export interface SavedAssessmentReport {
  id: string;
  completedAt: number;
  topic: string;
  results: { prompt: string; topic: string; correct: boolean; sourceId: string; sourceLabel: string; explanation: string }[];
}
const key = (profileId: string) => `edu_study_assessments_${profileId}`;
export function readAssessmentReports(profileId: string): SavedAssessmentReport[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(profileId)) || '[]');
    return Array.isArray(value) ? value.filter((report): report is SavedAssessmentReport => Boolean(report && typeof report.id === 'string' && Number.isFinite(report.completedAt) && Array.isArray(report.results))) : [];
  } catch { return []; }
}
export function saveAssessmentReport(profileId: string, report: SavedAssessmentReport): SavedAssessmentReport[] {
  const next = [report, ...readAssessmentReports(profileId)].slice(0, 25);
  persistLearnerData(key(profileId), JSON.stringify(next));
  return next;
}
