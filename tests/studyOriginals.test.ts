// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentCloudSession } from '../services/cloud';
import { removeStudyOriginal, retryPendingStudyOriginalRemovals, studyOriginalFragment } from '../services/studyOriginals';

vi.mock('../services/cloud', () => ({ currentCloudSession: vi.fn() }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

describe('Study Lab original-file location links', () => {
  it('opens a PDF page or a timed video position without changing saved citations', () => {
    expect(studyOriginalFragment('Page 12 · section 2')).toBe('#page=12');
    expect(studyOriginalFragment('Timestamp 00:01:02.500 · section 1')).toBe('#t=62.5');
    expect(studyOriginalFragment('AI-estimated timestamp 00:00:04.000 · section 1')).toBe('#t=4');
    expect(studyOriginalFragment('Slide 3 · section 1')).toBe('');
  });
  it('lets the learner remove an offline source and retries its private file deletion later', async () => {
    vi.mocked(currentCloudSession).mockResolvedValueOnce(null).mockResolvedValueOnce({ access_token: 'token', user: { id: 'learner-one' } } as never);
    expect(await removeStudyOriginal('profile-one', 'source-one', 'learner-one/source-one.pdf')).toBe(false);
    expect(JSON.parse(localStorage.getItem('edu_study_original_deletes_profile-one') || '[]')).toEqual(['learner-one/source-one.pdf']);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await retryPendingStudyOriginalRemovals('profile-one');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('edu_study_original_deletes_profile-one') || '[]')).toEqual([]);
  });
});
