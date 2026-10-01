-- jobs, entities, exercises, knowledge, general_questions, cover_letter_sentences:
-- add user_id nullable, backfill to the existing account, then enforce NOT NULL.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE jobs SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE jobs ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);

ALTER TABLE entities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE entities SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE entities ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON entities (user_id);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE exercises SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE exercises ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises (user_id);

ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE knowledge SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE knowledge ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON knowledge (user_id);

ALTER TABLE general_questions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE general_questions SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE general_questions ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_general_questions_user_id ON general_questions (user_id);

ALTER TABLE cover_letter_sentences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE cover_letter_sentences SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE cover_letter_sentences ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cover_letter_sentences_user_id ON cover_letter_sentences (user_id);

-- taxonomy is special: today it's a single global row (id=1). It becomes
-- one row per user instead — user_id replaces id as the logical key.
ALTER TABLE taxonomy ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE taxonomy SET user_id = '8431d8b8-018a-49b9-a57c-142ceb39ce89' WHERE user_id IS NULL;
ALTER TABLE taxonomy ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE taxonomy ADD CONSTRAINT taxonomy_user_id_key UNIQUE (user_id);
