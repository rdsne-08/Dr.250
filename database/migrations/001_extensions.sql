BEGIN;

-- pgcrypto provides gen_random_uuid(); vector provides the vector type and indexes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

COMMIT;
