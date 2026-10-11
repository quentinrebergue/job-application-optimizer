-- The tables and columns of the modules removed from the app (#113): Q&A, coding exercises, knowledge,
-- tag taxonomy and cover letters (code removed in #100; nothing reads or writes them any more).
-- Their data can be saved first with scripts/export-removed-modules.sql.
DROP TABLE IF EXISTS cover_letter_sentences, exercises, general_questions, knowledge, taxonomy;

-- The interview questions of jobs and of library entries, and the cover letter of a job.
ALTER TABLE jobs DROP COLUMN IF EXISTS questions;
ALTER TABLE jobs DROP COLUMN IF EXISTS cover_letter;
ALTER TABLE entities DROP COLUMN IF EXISTS questions;
