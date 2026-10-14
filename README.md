# EduVantage AI Live

**Live demo:** [edu-vantage-beta.vercel.app](https://edu-vantage-beta.vercel.app/). This is the deployed EduVantage website for judges and visitors. The source files in this repository are inspected or run with the development steps below; `localhost` addresses are only available on the computer running a local server.

New visitors first see the public EduVantage home page. Its **Privacy Policy** link works before sign-in or profile creation. In the local version, choose **Try the local demo** to create or continue a device-only profile; in account mode, choose **Sign in or create account**. The policy is marked prelaunch because the final retention schedule and operator processes still need review before wider public registration.

For an account-backed Vercel deployment, follow [DEPLOYMENT.md](./DEPLOYMENT.md). Public builds require Supabase email accounts and per-user cloud storage; local development without that configuration still supports the original browser-local demo.

Online accounts are intended to be owned by adult learners or by parents or guardians for child learners in India. Learner profiles can cover school-age courses, but the current parent/guardian declaration is not verified; complete guardian verification and consent before a broader public launch.

For the Track D challenge, open **Study Lab** after sign-in. Import a readable PDF, PPTX slides, notes (TXT/MD), lecture captions (SRT/VTT), or a short MP4/WebM video. Scanned PDF pages and videos need an opted-in Gemini key for OCR/transcription. Ask questions with cited passages, take adaptive practice questions, then enable your materials in a planned class. Actual practice results appear on Dashboard and cited classroom passages in Archive. See [TRACK_D_DEMO.md](./TRACK_D_DEMO.md) for the requirement map and presentation flow.

**Presentation Coach** lets a student enter an assignment, audience, time limit and key points; build a talking-point plan; rehearse the opening, main ideas, closing and audience Q&A; and review timing, transcript-based cues and optional AI feedback. Microphone dictation depends on browser support, and typing works without it. Text and practice results sync to the account in public mode; audio is not recorded. A connected AI provider supplies personalized plans and feedback, while a starter plan and local review work without a key.

**Interview practice handoff** connects the learning journey to [Ultimate AI Interviewer](https://www.ultimateaiinterviewer.in/). After a class, use **Practice this in interviews** in Archive (or open Interview practice from navigation), copy the topic brief, then open the other site and choose an appropriate practice mode. Use the brief in a suitable text field or AI Chat when relevant. The other site does not import the brief automatically; its Pitch Practice is for business or startup pitches. The brief contains the selected subject, chapter and topic, not the learner's profile, notes, transcript or API key. The platforms have separate accounts and do not automatically sync progress. The destination defaults to the supplied public URL and can be changed locally or with `VITE_INTERVIEWER_URL`.

For a tour, choose **How to use EduVantage** on the sign-in screen or in the navigation. The 12-step guide explains profile setup, language, AI provider, course search, custom courses, lesson planning, classroom controls, Study Lab, Presentation Coach, saved sessions, interview practice, and the sample dashboard. You can revisit any step and open the relevant section without changing your current lesson settings.

For local development, run `npm ci` and `npm run dev` in this repository, then open the address shown in Terminal. From the public home, create or sign in to an account for the account-backed experience, or use the local mode if it is available in your configuration.

The subject library also has **Create your own course** for School, University, Individual and Business learning levels. Enter any subject or course name, then type its chapter, topic and learning requirements in the planner. Those exact choices guide the AI lesson and appear in the session archive.

English, Hindi and Bengali interface text is bundled with the app. For every other language in the selector, the app translates interface labels and built-in course outlines using the connected AI provider, or the browser's built-in Translator API if available. This first translation can take a little time and may use provider quota. Progress and errors appear beside the language selector; use **Retry translation** if it stops. Completed translations are cached in this browser for later visits. Without a provider key or built-in browser translator, lesson language selection still works but the interface remains in English. Student-entered course names and notes are displayed as entered.

Open **AI Provider** from the main navigation or lesson planner. Select Google Gemini Live, OpenAI, Anthropic Claude, or **Other OpenAI-compatible platform**. Enter the API key, choose a model (and HTTPS base URL for a custom platform), then **Save provider** and **Test connection**. A custom platform must support OpenAI-style `/chat/completions` requests from a browser; a key alone does not make an arbitrary API compatible. In account mode, common text requests use authenticated server routes and Gemini Live uses a short-lived token. Custom endpoints and Gemini media import still depend on direct browser access.

Gemini retains the existing realtime voice classroom. OpenAI, Anthropic and compatible custom platforms use an interactive text classroom where the learner can ask questions, keep notes, and review the session later. Browser speech output and microphone dictation are optional where supported. The selected lesson plan, country, education level and teaching language guide responses. Exact name, age, address, city, state and institution are saved to the account in public mode but are not included in the AI lesson instructions.

A personal key is scoped to the student profile. In public account mode it stays in browser session storage and is never synced; in local demo mode a student may choose to remember it on this device. Browser storage remains accessible to scripts on this site, so use a trusted device. Public accounts sync profile, notes, history, Study Lab and coach progress. Learners can export or delete their account data from Profile. A centrally funded provider key must never be placed in the frontend build.

Checks: `npm run typecheck`, `npm test`, `npm run build`.

The local development server and the live demo are separate. Running another project on the same port may show that project's page; use the live demo link above when reviewing the submitted application.


## AI assistance disclosure

OpenAI Codex and ChatGPT assisted with AI-provider integrations, Study Lab, Presentation Coach, responsive interface work, deployment fixes, tests, documentation, and demo planning. The project owner directed and reviewed this work and remains responsible for the submitted code and claims. ElevenLabs was used for the demo narration, not to build the application.
