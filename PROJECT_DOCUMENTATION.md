# EduVantage - Track D project documentation

**Team:** EdTech AI Dora  
**Challenge:** Personalized Tutoring & Adaptive Learning  
**Application:** https://edu-vantage-beta.vercel.app/  
**Source:** https://github.com/UltimateAIInterviewer-1610/EduVantage-hackathon

## Purpose and user journey

EduVantage brings a learner's course material, source-grounded questions, practice, and AI-guided lessons into one web application. A learner signs in, creates a profile, selects a course and learning language, imports material into Study Lab, asks a question, opens the supporting excerpt, answers practice questions, and reviews progress. Presentation Coach adds a separate rehearsal workflow for explaining what was learned.

This document describes the submitted implementation and its limits. The live site is the intended judging entry point. A connected learner-supplied AI provider is needed for generated answers, questions, and personalized feedback.

## Architecture and data flow

The interface uses React, TypeScript, and Vite and is deployed on Vercel. Supabase provides authenticated accounts and learner-scoped cloud records in the public account experience. Study sources, practice attempts, presentation attempts, and other learner records are cached locally and synchronized for the authenticated account. The deployment and data setup are described in [DEPLOYMENT.md](./DEPLOYMENT.md).

Study Lab parses text-selectable PDFs in the browser with PDF.js, reads text from PPTX slide XML, and accepts UTF-8 TXT, MD, SRT, and VTT files. Each upload is limited to 12 MB. Extracted text is split into labelled passages: PDF page, slide, text section, or supplied caption timestamp. The application stores extracted passages and can retain the original bytes in this browser. With the optional private Supabase Storage migration applied, original bytes can also sync to the signed-in learner’s private folder; without that migration, extracted passages still work and the original may remain on this device only. A learner can review and remove sources. If the learner removes a source while offline, its local source is removed immediately and deletion of a previously synced private original is queued for the next online visit on that device. Scanned PDF pages, educational figures on PDF pages or embedded in PPTX slides, and short MP4/WebM clips require an explicit Gemini-processing choice and a working Gemini key; selected media is then sent to Gemini for OCR, figure descriptions, or transcription. Figure descriptions carry their page or slide labels. Uploaded SRT/VTT captions retain supplied timestamps. Gemini-transcribed video may return AI-estimated timestamps, which are labelled as estimates rather than verified positions. Diagram interpretation has been checked with a mocked provider response, not a live key.

For AI work, the learner chooses an available provider. Common account-mode text requests use authenticated server routes; Gemini media import and some custom-provider calls depend on direct browser access. Personal provider keys are not synced to learner records. The application does not supply a centrally funded key.

## Grounding and citations

For a question, Study Lab selects up to four passages using query-term overlap with extracted source text. It sends those passages, with numbered source labels, to the selected provider and instructs it to answer only from them. If no relevant passage is found, the request stops with an explanation. A broad summary request can use the opening passages of a source.

The answer interface accepts citation numbers only when they correspond to passages supplied for that request, and it checks that the cited source and excerpt still exist in the learner's library. A valid citation opens the supporting excerpt. If the provider returns no valid citation, the answer is visibly marked as lacking a valid source citation. This checks citation references, but it is **not** an automated proof that every sentence is faithful to the cited passage. Unsupported or off-material claims should still be checked against the excerpt.

A citation opens its extracted excerpt inside EduVantage. If the original file is available, a second action opens the PDF at its labelled page or a caption/video file near its supplied or AI-estimated time. PPTX originals download for manual navigation to the labelled slide. Browser handling of file fragments varies, so the excerpt remains the authoritative citation view.

## Assessment and learner model

Study Lab generates one four-choice question at a time from retrieved passages. Each question has a foundation, application, or challenge difficulty, an answer key, an explanation, and a source excerpt. The next difficulty rises after a correct answer and falls after an incorrect answer, within those three levels. The learner can choose a topic independently of their earlier question; when none is selected, the next question suggests a weak topic represented in the uploaded sources. A separate mini assessment asks two or three source-checked questions, including multiple choice and short answer; it includes a numerical question only when the source supports one. Short answers are self-rated. Assessment reports, scores, and attempts are saved per learner. Recent prior prompts are supplied to the provider, and an exactly repeated or closely word-overlapping prompt is rejected after generation without changing progress. This is a conservative lexical safeguard, not semantic duplicate detection. The progress view shows total attempts, correct answers, recent accuracy, and weaker topics.

Topic familiarity is estimated from graded answers and learner-rated understanding after cited conversations. This is a transparent heuristic, **not** a validated Bayesian knowledge tracing or IRT model. The first practice question gives a new learner a foundation-level starting point. The topic map groups saved passages by inferred heading/topic and includes prerequisite links only when explicitly stated in the source. The app can produce source-based revision cards and a simple exam-date study plan for weaker topics. A learner can request an optional second AI check of a practice answer against the quoted source; this uses another provider request and is not independent proof of correctness. It does not perform cross-model verification or a measured semantic question-repetition check. Saved sources and attempts remain viewable when an AI request fails, although new AI output cannot be generated until the provider works again.

## Other learning flows

The course planner uses the learner's level, course, chapter, topic, language, and stated requirements to guide an AI classroom. Available study passages can also be supplied as teaching context. Presentation Coach lets learners create or import a talk brief, build a plan, rehearse opening, main points, closing, and audience questions, then review a written transcript and saved attempts. Its automatic feedback uses written text; it does not record audio or assess gestures, eye contact, or vocal tone.

## How to review the project

1. Open the [live application](https://edu-vantage-beta.vercel.app/) and sign in or create an account. Connect a supported AI provider in **AI Provider** and test the connection.
2. Open **Study Lab**. Upload a short text-selectable PDF and a PPTX or caption file on the same topic. Inspect their labelled sections.
3. Ask a question answered by the files and open its citation. Then ask an off-material question and inspect the response or missing-passage message.
4. Start practice. Answer once correctly and once incorrectly to see the difficulty change and saved progress. Try a mini assessment, topic map, and revision cards. Reopen Study Lab to inspect persistence.
5. Use **Presentation Coach** to rehearse and review a short talk. See [TRACK_D_DEMO.md](./TRACK_D_DEMO.md) for a longer presentation flow.

For local code review, use Node.js 22.13 or newer, run `npm ci`, then `npm run dev`. The live site and localhost are separate deployments. Configuration requirements are in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Evaluation status and limitations

The repository includes automated tests for source handling, citations, adaptive difficulty, assessment reports, provider failures, account routes, and presentation flows. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:api-functions` to reproduce its code-level checks. The repository also includes a small synthetic retrieval fixture and an optional DeepEval runner in [evaluation](./evaluation/README.md). On ten synthetic fixture questions, including two off-material cases, the retrieval check reports precision@4 and recall@4 of 1.00. This narrow test does not establish real-world retrieval quality or generation faithfulness.

A small synthetic set with known source locations and off-material questions is published. The optional original-file cloud path has mocked route checks but has not been validated with a live Supabase account or applied migration. A separate fixed two-profile, three-session simulation checks that saved familiarity estimates change across sessions and that its hand-authored question prompts do not repeat. In that synthetic check, familiarity changed by +79 and +3 percentage points from the first to last session, with 0/4 exact prompt repetitions for each profile. No live-provider DeepEval run or learner study has been completed, so faithfulness, answer relevancy, framework context precision/recall, actual mastery gains, and real generation repetition rate are **not reported as measured real-world results**. The current retrieval method is lexical rather than semantic, and generated question correctness is structurally checked against cited evidence text but not independently verified for meaning. These are the main areas requiring formal evaluation before claims of measured tutoring effectiveness.

## AI assistance disclosure

OpenAI Codex and ChatGPT assisted with implementation, testing, documentation, and demo preparation under the project owner's direction and review. ElevenLabs was used for demo narration, not to build the application. See the repository [README](./README.md) for the full disclosure.
