-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "programs_departmentId_isActive_idx" ON "programs"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "subjects_departmentId_isActive_idx" ON "subjects"("departmentId", "isActive");
