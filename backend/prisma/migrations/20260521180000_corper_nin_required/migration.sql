-- Backfill legacy rows (e.g. integration-test corpers) before NOT NULL.
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Corper"
  WHERE "nin" IS NULL
)
UPDATE "Corper" AS c
SET "nin" = '8' || LPAD(n.rn::text, 10, '0')
FROM numbered AS n
WHERE c."id" = n."id";

ALTER TABLE "Corper" ALTER COLUMN "nin" SET NOT NULL;
