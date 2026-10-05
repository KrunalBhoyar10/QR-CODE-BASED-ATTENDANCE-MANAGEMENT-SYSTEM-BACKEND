-- AlterTable
ALTER TABLE "attendance_sessions" 
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "programId" TEXT,
  ADD COLUMN "academicYearId" TEXT,
  ADD COLUMN "allowedRadius" DOUBLE PRECISION,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "faceVerificationRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "attendance_sessions_departmentId_idx" ON "attendance_sessions"("departmentId");
CREATE INDEX "attendance_sessions_programId_idx" ON "attendance_sessions"("programId");
CREATE INDEX "attendance_sessions_academicYearId_idx" ON "attendance_sessions"("academicYearId");

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
