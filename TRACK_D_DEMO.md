# Track D challenge map and demo

The supplied **Problem Statements.pdf** summarizes Track D as: an AI study companion that unifies lecture videos, textbooks, and slides into a source-cited knowledge base and uses it for adaptive assessments and personalized tutoring. The PDF links a longer Track D statement, but that linked file was not available in this environment. This map covers the supplied summary only.

| Track D requirement | EduVantage implementation | Present limit |
| --- | --- | --- |
| Personalized tutoring | Existing level, course, chapter, topic, language, learner requirements, and live/text classrooms | AI provider key is supplied by the learner |
| Lecture material | Study Lab imports TXT, MD, SRT, VTT, and short MP4/WebM clips | Video transcription needs an opted-in Gemini key and provider access |
| Textbooks and slides | Study Lab extracts text from PDFs and PPTX slides, with page/slide labels | Scanned PDF pages need opted-in Gemini OCR |
| Unified, source-cited library | Imported material is stored per learner; questions retrieve relevant chunks and expose cited passages | Account mode syncs extracted material across devices; citations should be checked against the excerpt |
| Adaptive assessment | Source-based four-choice questions move among foundation, application, and challenge levels based on answers; score is shown | Adaptive loop uses answer correctness, not a validated psychometric model or persistent mastery record |

## Five-minute challenge demo

1. Create a student profile and choose a learning language. Show the existing course planner and custom learning requirements to establish personalization.
2. Open **Study Lab**. Upload a short textbook PDF, PPTX slides, and a lecture VTT/SRT transcript covering the same topic. Each file appears with its material type and indexed sections. Optionally enable Gemini media processing and try a short video or scanned PDF.
3. Connect a test AI provider key in **AI Provider**. Ask a question whose answer is present in the materials. Open the cited passage and compare the answer with its page/section.
4. Ask a question *not* covered by the uploaded materials. The tutor is instructed to say what is missing rather than invent an answer; inspect its citation behavior.
5. Enter a topic and start adaptive practice. Answer correctly to move from foundation to application. Answer incorrectly to move down a level. Open the supporting evidence below the feedback and show the live score.
6. Open a planned live or text class, keep **Teach from my materials** enabled, and show the source evidence alongside the lesson. Finish the class and review its source references in Archive.
7. Open Dashboard to show the real Study Lab practice results above the clearly labeled sample readiness profile.

## Demo preparation

Use short files and a tested provider key with browser/network access. Gemini video transcription and scanned-page OCR require the explicit checkbox and send the selected media to Google. In account mode, extracted materials and scores sync to the signed-in learner; avoid sensitive materials in a public demo. Relevant source snippets used for a question or source-grounded class are sent to the chosen provider. Only the Study Lab progress panel contains measured practice results; the rest of the dashboard is illustrative.
