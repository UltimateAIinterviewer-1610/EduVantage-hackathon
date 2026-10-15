# Public deployment setup

The public build requires Vercel and a Supabase project. Without the account settings below, the production page deliberately shows a setup error instead of offering an insecure local sign-in. Local `npm run dev` still supports the original browser-local demo when no Supabase settings are present.

## 1. Create the account service

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. The `learner_state` table has row-level security: authenticated learners may access only rows matching their own auth user ID.
   To sync original Study Lab uploads across devices and open the original PDF page or timed video location, also run [`supabase/study-originals.sql`](supabase/study-originals.sql) once. It creates a private 12 MB bucket with policies limited to each authenticated account's folder. If this optional migration is absent, extracted passages continue to work and original files may remain available only on the device that uploaded them.
2. In Supabase Auth, enable email/password sign-in and **require email confirmation**. Configure the Site URL and allowed redirect URLs for the Vercel preview and production domain. Configure a reliable SMTP sender so confirmation and reset emails arrive. Restrict test/preview account creation as appropriate.
   To enable **Continue with Google**, create a separate Google OAuth Web client for EduVantage in Google Cloud. In Google Auth Platform, configure its branding and audience, then add the exact Supabase callback URL shown on Supabase **Authentication → Providers → Google** as a Google authorized redirect URI. Enter that client's ID and secret in the same Supabase Google provider page and enable it. Do not reuse the Ultimate AI Interviewer client secret in Vercel or put it in this repository. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://edu-vantage-beta.vercel.app` and allow `https://edu-vantage-beta.vercel.app/**` (plus any deliberate preview or custom domains). Google redirects through Supabase back to EduVantage. A Google identity is an EduVantage Supabase account, not an Ultimate AI Interviewer account. Test with a disposable adult or guardian-owned account before opening public registration.
3. Record the project URL and public anon/publishable key. Never put the service-role key in source code or a variable prefixed with `VITE_`.

## 2. Configure Vercel

Import this folder as the Vercel project root. The repository may need **Root Directory** set to `online-classroom-main`. Vercel uses the included `vercel.json` to build the Vite app and serve `dist/`; the `api/` directory contains three server functions.

Set these environment variables for Preview and Production, then deploy again:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL used by browser account requests. |
| `VITE_SUPABASE_ANON_KEY` | Public anon/publishable key; access is constrained by RLS. |
| `VITE_SUPPORT_EMAIL` | Optional override for the temporary public contact `Pragyashukla504@gmail.com`. An invalid override keeps the production page closed. |
| `VITE_INTERVIEWER_URL` | Optional override for the Ultimate AI Interviewer handoff URL; defaults to `https://www.ultimateaiinterviewer.in/`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only secret** for self-service account deletion. Never prefix with `VITE_`. |

Each learner brings their own AI provider key. Do not configure a shared Gemini, OpenAI, or Anthropic key. In account mode, provider keys last only for the browser session and are not synced. Text requests to Gemini, OpenAI, and Anthropic use authenticated Vercel functions. Gemini Live receives a short-lived token from the server function. Custom OpenAI-compatible endpoints and optional Gemini media import still connect directly from the browser, so they depend on that provider's browser/CORS support; explain this limitation to users.

## 3. Test the actual preview URL

- Confirm that sign-up requires email verification, sign-in and password reset work, and signed-out visitors cannot see a profile. Confirm wrong credentials and expired sessions show a recoverable error.
- Test Continue with Google from both sign-in and sign-up, including cancellation and a return to the correct EduVantage domain. Check that a new Google user gets a new profile and that a returning user gets their saved learning data. Google-only accounts currently need support assistance to delete their account because self-service deletion requires a current password.
- Create a profile, plan a class, save notes/history, complete a Study Lab question and Presentation Coach attempt. Sign in on a second device and verify the same data loads. Confirm one account cannot see another account's data. Test the optional device-progress import only with an empty account.
- Use test BYOK keys for Gemini Live voice and whiteboard, Gemini text, OpenAI, Anthropic, custom-provider browser support, translation, and Gemini OCR/transcription. Verify microphone permissions and audio on desktop and mobile over HTTPS. Check quota and provider error states.
- Export account data. Delete a disposable test account using the typed confirmation; verify sign-in fails afterwards and the user's `learner_state` rows are removed by the foreign-key cascade.
- Check mobile layouts, keyboard access, contrast, feedback states, and browser console/network errors. Re-run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` for the exact release commit.

## 4. Parent or guardian account ownership

Online accounts are intended to be owned by adult learners or parents or guardians in India. Learner profiles can include school-age children, but the current account-owner declaration does not verify guardian status. This is **not** a completed school-age launch. The operator must select a lawful verification method, provide a child-facing notice, record and honor consent/withdrawal, and have the resulting flow reviewed for the chosen launch jurisdiction before opening broader registration. See the [Indian DPDP Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf) and [2025 Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) for primary source requirements and commencement details.

## 5. Owner decisions before opening registration worldwide

Show EduVantage as the public-facing service name. The app now includes a prelaunch Privacy Policy linked from the public home and account screens; review and finalize its retention schedule, processor details, and request/incident process before wider registration. Publish owner-specific terms and verify the support inbox. This app asks for age and is intended for school learners, so the operator must decide which regions and ages it serves and implement any required guardian/child-data consent workflow **before** admitting child learners. Set monitoring, backups, abuse controls, and Supabase/Vercel/provider spending alerts. Verify service capacity and all provider terms for the intended countries.

The current cloud sync is per account and loads on sign-in/page load. Simultaneous edits to the same item on two devices use the latest saved value; this is not a real-time collaborative editor. If a save fails, the app retains the local copy and shows a warning; the learner should retry while online before signing out.

No live Vercel/Supabase deployment or provider call can be certified by local tests alone. Promote the preview only after the checks above pass with the actual service configuration and a responsible owner has completed the policy and operations decisions.
