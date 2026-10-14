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

Study Lab parses text-selectable PDFs in the browser with PDF.js, reads text from PPTX slide XML, and accepts UTF-8 TXT, MD, SRT, and VTT files. Each upload is limited to 12 MB. Extracted text is split into labelled passages: PDF page, slide, or text section. The application stores extracted passages rather than the original file bytes. A learner can review and remove sources. Scanned PDF pages and short MP4/WebM clips require an explicit Gemini-processing choice and a working Gemini key; selected media is then sent to Gemini for OCR or transcription. Video passages currently use section labels, not verified timestamps. Images or diagrams embedded in slides are not independently interpreted.

For AI work, the learner chooses an available provider. Common account-mode text requests use authenticated server routes; Gemini media import and some custom-provider calls depend on direct browser access. Personal provider keys are not synced to learner records. The application does not supply a centrally funded key.

## Grounding and citations

For a question, Study Lab selects up to four passages using query-term overlap with extracted source text. It sends those passages, with numbered source labels, to the selected provider and instructs it to answer only from them. If no relevant passage is found, the request stops with an explanation. A broad summary request can use the opening passages of a source.

The answer interface accepts citation numbers only when they correspond to passages supplied for that request, and it checks that the cited source and excerpt still exist in the learner's library. A valid citation opens the supporting excerpt. If the provider returns no valid citation, the answer is visibly marked as lacking a valid source citation. This checks citation references, but it is **not** an automated proof that every sentence is faithful to the cited passage. Unsupported or off-material claims should still be checked against the excerpt.

The current source labels identify PDF pages and slides, but the citation opens the extracted excerpt inside EduVantage rather than navigating the original PDF page or slide file. Video citation timestamps are not available in the current implementation.

## Assessment and learner model

Study Lab generates one four-choice question at a time from retrieved passages. Each question has a foundation, application, or challenge difficulty, an answer key, an explanation, and a source excerpt. The next difficulty rises after a correct answer and falls after an incorrect answer, within those three levels. Attempts are saved per learner with a topic, difficulty, correctness, and time. The progress view shows total attempts, correct answers, recent accuracy, and topic-level counts.

This is a simple correctness-based adaptive loop, **not** Bayesian knowledge tracing, IRT, or a validated mastery estimate. The app does not currently run short-answer or numerical exams, cross-model answer verification, or a measured question-repetition filter. A new learner begins at foundation level without a diagnostic quiz. Saved sources and attempts remain viewable when an AI request fails, although new AI output cannot be generated until the provider works again.

## Other learning flows

The course planner uses the learner's level, course, chapter, topic, language, and stated requirements to guide an AI classroom. Available study passages can also be supplied as teaching context. Presentation Coach lets learners create or import a talk brief, build a plan, rehearse opening, main points, closing, and audience questions, then review a written transcript and saved attempts. Its automatic feedback uses written text; it does not record audio or assess gestures, eye contact, or vocal tone.

## How to review the project

1. Open the [live application](https://edu-vantage-beta.vercel.app/) and sign in or create an account. Connect a supported AI provider in **AI Provider** and test the connection.
2. Open **Study Lab**. Upload a short text-selectable PDF and a PPTX or caption file on the same topic. Inspect their labelled sections.
3. Ask a question answered by the files and open its citation. Then ask an off-material question and inspect the response or missing-passage message.
4. Start practice. Answer once correctly and once incorrectly to see the difficulty change and saved progress. Reopen Study Lab to inspect persistence.
5. Use **Presentation Coach** to rehearse and review a short talk. See [TRACK_D_DEMO.md](./TRACK_D_DEMO.md) for a longer presentation flow.

For local code review, use Node.js 22.13 or newer, run `npm ci`, then `npm run dev`. The live site and localhost are separate deployments. Configuration requirements are in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Evaluation status and limitations

The repository includes automated tests for source handling, citations, adaptive difficulty, provider failures, account routes, and presentation flows. Run `npm run typecheck`, `npm test`, and `npm run build` to reproduce its code-level checks. These checks verify expected behavior on test inputs; they are **not** RAGAS, DeepEval, or TruLens benchmark results.

No scored test set with known source locations and off-material questions has been published with this submission. Therefore faithfulness, answer relevancy, context precision/recall, simulated mastery gain, and question-repetition rate are **not reported as measured results**. The current retrieval method is lexical rather than semantic, and generated question correctness is structurally checked but not independently verified against the source. These are the main areas requiring formal evaluation before claims of measured tutoring effectiveness.

## AI assistance disclosure

OpenAI Codex and ChatGPT assisted with implementation, testing, documentation, and demo preparation under the project owner's direction and review. ElevenLabs was used for demo narration, not to build the application. See the repository [README](./README.md) for the full disclosure.
