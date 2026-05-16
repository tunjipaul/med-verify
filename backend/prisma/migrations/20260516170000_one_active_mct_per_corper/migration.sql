CREATE UNIQUE INDEX IF NOT EXISTS "MctCase_one_active_per_corper_idx"
ON "MctCase" ("corperId")
WHERE "deletedAt" IS NULL
  AND "status" NOT IN ('APPROVED', 'REJECTED', 'CLOSED');
