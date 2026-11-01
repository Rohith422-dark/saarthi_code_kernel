# Saarthi: adaptive learning for Class 8 Maths

React 18 + Vite + Tailwind client (Clinical Teal design system) and an Express API with a BKT mastery engine,
a prerequisite concept graph, a diagnostic that traces root gaps, adaptive practice, a retrieval-grounded tutor
with synchronised citations, and a teacher dashboard.

```bash
npm run install:all   # once
npm run dev           # API on :4000, web on :5173 (proxies /api)
```

- Switch between learners and the teacher view from the profile menu at the bottom of the sidebar.
- Data persists in `server/data/db.json` (created on first run). `POST /api/reset` restores the seed.
- Design tokens: `client/src/index.css` (CSS variables) and `client/tailwind.config.js`.

## Tutor: Ollama agent + RAG

The tutor retrieves from the approved notes (BM25, blended with embeddings when available) and asks a local
Ollama model to solve the question, citing notes as [1], [2]. Without a matching note it still answers, shown in
the amber "Outside approved material" card. If Ollama is off, it falls back to notes-only answers.

```bash
ollama pull llama3.2
ollama pull nomic-embed-text   # optional: semantic retrieval
```

Env overrides: `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`. Status: `GET /api/llm/status`.

## Practice levels, contests and the leaderboard

- Practice: every concept has Easy / Medium / Hard blocks. Problems are generated on the server
  (`server/src/gen.js`), so the answer is computed, never guessed, and each question can be answered once.
- Contests: one live paper for the whole class (4 easy, 4 medium, 2 hard = 180 points, 20 minutes, one attempt).
  The paper is seeded by contest id so every learner gets identical questions.
- Leaderboard: ranked by total contest points, ties broken by total problems solved (practice + contest).

## Sign-in, messaging and the teacher view

- Sign in at `/login` (separate learner and teacher pages). Sessions use random bearer tokens; passwords are scrypt-hashed;
  the server enforces roles, so learners can never call teacher endpoints. Five wrong attempts lock a username for a minute.
- Local demo accounts are defined in `server/src/seed.js` (`DEMO`) and listed on the login page unless `NODE_ENV=production`.
- Messages: one class group chat plus a private chat between each learner and the teacher (polled every 3 seconds).
- Teacher pages: Class overview, Students (every learner's mastery, contests and activity), Messages, Alerts, Leaderboard.

## Homework

- Teachers assign homework (topic, difficulty, questions, total points, deadline, late penalty per day, optional approved worksheet).
  The class chat gets an announcement automatically, and "Remind" posts who is still to hand in.
- Every learner gets the same generated questions and can hand in once.
- Late rule: each day (or part of a day) after the deadline costs the penalty, taken from the points earned. Late work is accepted for
  3 days; after that the homework closes and an unsubmitted one scores 0.
- Homework points appear on the leaderboard; correct homework answers count towards "problems solved" (the tie-break).

## Classes 6 to 10, Class 10 exam prep, and languages

- Every learner belongs to a class (6 to 10). Concepts, practice, diagnostics, contests, homework, leaderboards and group chats are
  separate per class; teachers pick the class they are looking at in the top bar. The concept pool is shared and tagged per class
  (`GRADE_MAP` in `server/src/seed.js`), so grade-specific curricula can be added there.
- Class 10 gets an Exam centre: exam countdowns (teachers set the dates), timed mock papers with section and topic analysis,
  a weekly study plan that adapts to the days left, an exam-readiness indicator, and a private stress check-in that flags the
  teacher when a learner is struggling.
- Languages: English, Hindi and Telugu (switcher on the login page and in the top bar). Translations live in
  `client/src/i18n/hi.js` and `te.js`, keyed by the English text, so untranslated screens fall back to English.
  The tutor also replies in the chosen language when Ollama is running.

## Resources, study material, exam prep for every class, activity map

- Teachers add resources per class (worksheets, notes, talking points, parent summaries) with an uploaded file (PDF, Word, image or text,
  up to 3 MB, stored in `server/data/uploads`), a link, or a description. Learners of that class see approved ones under Study material;
  files are only downloadable with sign-in, and only approved resources of the learner's own class.
- Exam prep (countdowns, mock papers, study plan, readiness, stress check-in) is available in every class, with exam dates set per class.
- The learning-activity heatmap (a year of daily activity) is on the learner dashboard, the class overview and each learner's detail panel.

## Tutor chat history

Every tutor conversation is saved per learner (up to 30 chats, 100 messages each). Opening the Tutor restores the latest chat; the history
panel lists past chats, starts a new one, and deletes any. Only the learner who had a chat can read, continue or delete it.
