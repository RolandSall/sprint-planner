ALTER TABLE "features" ADD COLUMN "color" text;
ALTER TABLE "features" DROP COLUMN IF EXISTS "priority";
