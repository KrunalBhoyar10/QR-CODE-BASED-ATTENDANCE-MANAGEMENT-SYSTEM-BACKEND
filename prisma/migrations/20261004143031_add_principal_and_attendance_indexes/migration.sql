-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- CreateIndex
CREATE INDEX "attendance_records_sessionId_status_idx" ON "attendance_records"("sessionId", "status");

-- CreateIndex
CREATE INDEX "attendance_records_studentId_status_idx" ON "attendance_records"("studentId", "status");

-- CreateIndex
CREATE INDEX "attendance_sessions_subjectId_idx" ON "attendance_sessions"("subjectId");

-- CreateIndex
CREATE INDEX "attendance_sessions_status_idx" ON "attendance_sessions"("status");

-- CreateIndex
CREATE INDEX "attendance_sessions_sectionId_status_idx" ON "attendance_sessions"("sectionId", "status");

-- CreateIndex
CREATE INDEX "attendance_sessions_sessionDate_status_idx" ON "attendance_sessions"("sessionDate", "status");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
