/**
 * face.repository.js
 * All Prisma queries for face verification — student photo, descriptor,
 * change count, teacher authorization, and audit logs.
 */
import { prisma } from '../lib/prisma.js';

class FaceRepository {

  // ── Student face data ────────────────────────────────────────────────────

  /**
   * Get a student's face fields by their Student.id
   */
  async findFaceDataByStudentId(studentId) {
    return prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id:             true,
        facePhotoUrl:   true,
        faceDescriptor: true,
        faceChangeCount: true,
        faceChangeLimit: true,
        teacherFaceAuth: true,
      },
    });
  }

  /**
   * Save face photo URL + descriptor for first-time registration.
   * Does NOT increment change count.
   */
  async registerFace(studentId, photoUrl, descriptor) {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        facePhotoUrl:   photoUrl,
        faceDescriptor: descriptor, // Float[]
      },
      select: {
        id: true,
        facePhotoUrl: true,
        faceChangeCount: true,
        faceChangeLimit: true,
        teacherFaceAuth: true,
      },
    });
  }

  /**
   * Update face photo + descriptor (change).
   * Increments faceChangeCount.
   * If teacherFaceAuth was true, resets it to false (consumed).
   */
  async updateFace(studentId, photoUrl, descriptor, consumeAuth) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          facePhotoUrl:    photoUrl,
          faceDescriptor:  descriptor,
          faceChangeCount: { increment: 1 },
          ...(consumeAuth ? { teacherFaceAuth: false } : {}),
        },
        select: {
          id: true,
          facePhotoUrl: true,
          faceChangeCount: true,
          faceChangeLimit: true,
          teacherFaceAuth: true,
        },
      });

      // Audit log
      await tx.faceChangeLog.create({
        data: { studentId, changedBy: 'SELF' },
      });

      // Consume teacher auth log if used
      if (consumeAuth) {
        await tx.faceAuthLog.updateMany({
          where: { studentId, consumedAt: null, revoked: false },
          data:  { consumedAt: new Date() },
        });
      }

      return updated;
    });
  }

  // ── Teacher authorization ────────────────────────────────────────────────

  /**
   * Grant one extra face change to a student.
   */
  async authorizeChange(studentId, teacherId) {
    return prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data:  { teacherFaceAuth: true },
      });
      await tx.faceAuthLog.create({
        data: { studentId, authorizedBy: teacherId },
      });
    });
  }

  /**
   * Revoke teacher authorization.
   */
  async revokeAuthorization(studentId) {
    return prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data:  { teacherFaceAuth: false },
      });
      await tx.faceAuthLog.updateMany({
        where: { studentId, consumedAt: null, revoked: false },
        data:  { revoked: true },
      });
    });
  }

  // ── Teacher section ownership check ─────────────────────────────────────

  /**
   * Returns true if this teacher has at least one ACTIVE TeachingAssignment
   * in the given section.
   */
  async isTeacherAssignedToSection(teacherId, sectionId) {
    const count = await prisma.teachingAssignment.count({
      where: {
        teacherId,
        sectionId,
        status: 'ACTIVE',
      },
    });
    return count > 0;
  }
}

export default new FaceRepository();
