-- Drop any existing unconditional unique constraint/index on subjects.code if present
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_code_key";
DROP INDEX IF EXISTS "subjects_code_key";

-- Create a partial unique index: only active subjects must have unique codes.
-- This allows soft-deleted (isActive=false) subjects to be reused.
CREATE UNIQUE INDEX IF NOT EXISTS "subjects_code_active_idx"
  ON "subjects"("code")
  WHERE "isActive" = true;
