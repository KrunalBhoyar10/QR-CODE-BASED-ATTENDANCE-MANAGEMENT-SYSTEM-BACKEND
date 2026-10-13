/**
 * face.service.js
 *
 * Business logic for:
 *  - Student face registration (first-time, no change count)
 *  - Student face update (enforces 2-change limit + teacher auth)
 *  - Student face status query
 *  - Teacher authorization grant / revoke
 *  - Teacher student face status query
 *  - Face descriptor comparison for attendance
 */
import fs from 'fs';
import path from 'path';
import faceRepository from '../repositories/face.repository.js';
import studentRepository from '../repositories/student.repository.js';
import teacherRepository from '../repositories/teacher.repository.js';
import auditService from './audit.service.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// Threshold for Euclidean distance between face descriptors.
// Lower = stricter. face-api.js typical range: 0.3 (strict) to 0.6 (lenient).
const FACE_MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.45');

// ── Helpers ──────────────────────────────────────────────────────────────────

const resolveStudentById = async (userId) => {
  const student = await studentRepository.findStudentByUserId(userId);
  if (!student) throw new ForbiddenError('No linked student profile found.');
  if (!student.user?.isActive) throw new ForbiddenError('Student account is inactive.');
  return student;
};

const resolveTeacherById = async (userId) => {
  const teacher = await teacherRepository.findTeacherByUserId(userId);
  if (!teacher) throw new ForbiddenError('No linked teacher profile found.');
  if (!teacher.user?.isActive) throw new ForbiddenError('Teacher account is inactive.');
  return teacher;
};

const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

const deletePhotoFile = (photoUrl) => {
  if (!photoUrl) return;
  try {
    // photoUrl is stored as '/uploads/faces/uuid.jpg' — resolve to absolute
    const abs = path.join(process.cwd(), photoUrl);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // Non-fatal — file might not exist on disk
  }
};

const parseDescriptor = (raw) => {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr) || arr.length !== 128) return null;
    return arr.map(Number);
  } catch {
    return null;
  }
};

// ── Service Class ─────────────────────────────────────────────────────────────

class FaceService {

  // ── STUDENT: Register face (first time) ────────────────────────────────────
  async registerFace(userId, file, rawDescriptor, req) {
    const student = await resolveStudentById(userId);

    const existing = await faceRepository.findFaceDataByStudentId(student.id);
    if (existing?.facePhotoUrl) {
      // Delete uploaded temp file
      if (file?.path) fs.unlinkSync(file.path);
      throw new ConflictError(
        'Face already registered. Use PATCH /student/face/update to change it.'
      );
    }

    const descriptor = parseDescriptor(rawDescriptor);
    if (!descriptor) {
      if (file?.path) fs.unlinkSync(file.path);
      throw new BadRequestError('Invalid face descriptor. Must be a JSON array of 128 numbers.');
    }

    // Store relative URL path (served as static file)
    const photoUrl = `/uploads/faces/${path.basename(file.path)}`;
    const result = await faceRepository.registerFace(student.id, photoUrl, descriptor);

    await auditService.log({
      userId,
      action: 'FACE_REGISTERED',
      entity: 'Student',
      entityId: student.id,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return {
      hasPhoto:         true,
      facePhotoUrl:     result.facePhotoUrl,
      changeCount:      result.faceChangeCount,
      changeLimit:      result.faceChangeLimit,
      teacherAuthorized: result.teacherFaceAuth,
    };
  }

  // ── STUDENT: Update face photo ──────────────────────────────────────────────
  async updateFace(userId, file, rawDescriptor, req) {
    const student = await resolveStudentById(userId);
    const faceData = await faceRepository.findFaceDataByStudentId(student.id);

    if (!faceData?.facePhotoUrl) {
      if (file?.path) fs.unlinkSync(file.path);
      throw new BadRequestError(
        'No face registered yet. Please use POST /student/face/register first.'
      );
    }

    const atLimit   = faceData.faceChangeCount >= faceData.faceChangeLimit;
    const hasAuth   = faceData.teacherFaceAuth;

    if (atLimit && !hasAuth) {
      if (file?.path) fs.unlinkSync(file.path);
      throw new ForbiddenError(
        `You have reached your photo change limit (${faceData.faceChangeLimit} changes). ` +
        'Please contact your teacher to authorize one additional change.'
      );
    }

    const descriptor = parseDescriptor(rawDescriptor);
    if (!descriptor) {
      if (file?.path) fs.unlinkSync(file.path);
      throw new BadRequestError('Invalid face descriptor. Must be a JSON array of 128 numbers.');
    }

    // Delete old photo file
    deletePhotoFile(faceData.facePhotoUrl);

    const photoUrl   = `/uploads/faces/${path.basename(file.path)}`;
    const consumeAuth = hasAuth; // use auth if it was granted
    const result     = await faceRepository.updateFace(student.id, photoUrl, descriptor, consumeAuth);

    await auditService.log({
      userId,
      action: 'FACE_UPDATED',
      entity: 'Student',
      entityId: student.id,
      details: { usedTeacherAuth: consumeAuth, newChangeCount: result.faceChangeCount },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return {
      hasPhoto:         true,
      facePhotoUrl:     result.facePhotoUrl,
      changeCount:      result.faceChangeCount,
      changeLimit:      result.faceChangeLimit,
      teacherAuthorized: result.teacherFaceAuth,
    };
  }

  // ── STUDENT: Get face status ────────────────────────────────────────────────
  async getFaceStatus(userId) {
    const student  = await resolveStudentById(userId);
    const faceData = await faceRepository.findFaceDataByStudentId(student.id);

    const changeCount = faceData?.faceChangeCount ?? 0;
    const changeLimit = faceData?.faceChangeLimit ?? 2;
    const teacherAuth = faceData?.teacherFaceAuth  ?? false;

    return {
      hasPhoto:          Boolean(faceData?.facePhotoUrl),
      facePhotoUrl:      faceData?.facePhotoUrl || null,
      changeCount,
      changeLimit,
      teacherAuthorized: teacherAuth,
      canChange:         !faceData?.facePhotoUrl || changeCount < changeLimit || teacherAuth,
    };
  }

  // ── TEACHER: Get a student's face status ────────────────────────────────────
  async getStudentFaceStatus(teacherUserId, studentId) {
    const teacher = await resolveTeacherById(teacherUserId);

    // Find the student
    const studentData = await faceRepository.findFaceDataByStudentId(studentId);
    if (!studentData) throw new NotFoundError('Student not found.');

    // Verify teacher is assigned to student's section
    const student = await studentRepository.findStudentById(studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const assigned = await faceRepository.isTeacherAssignedToSection(teacher.id, student.sectionId);
    if (!assigned) {
      throw new ForbiddenError('You are not assigned to this student\'s section.');
    }

    return {
      studentId,
      hasPhoto:          Boolean(studentData.facePhotoUrl),
      changeCount:       studentData.faceChangeCount,
      changeLimit:       studentData.faceChangeLimit,
      teacherAuthorized: studentData.teacherFaceAuth,
    };
  }

  // ── TEACHER: Authorize one additional change ────────────────────────────────
  async authorizeChange(teacherUserId, studentId, req) {
    const teacher = await resolveTeacherById(teacherUserId);
    const student = await studentRepository.findStudentById(studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const assigned = await faceRepository.isTeacherAssignedToSection(teacher.id, student.sectionId);
    if (!assigned) {
      throw new ForbiddenError('You are not assigned to this student\'s section.');
    }

    const faceData = await faceRepository.findFaceDataByStudentId(studentId);
    if (faceData?.teacherFaceAuth) {
      throw new ConflictError('This student already has a pending teacher authorization.');
    }

    await faceRepository.authorizeChange(studentId, teacher.id);

    await auditService.log({
      userId: teacherUserId,
      action: 'FACE_AUTH_GRANTED',
      entity: 'Student',
      entityId: studentId,
      details: { teacherId: teacher.id },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return { message: 'Student authorized for 1 additional face photo change.', studentId };
  }

  // ── TEACHER: Revoke authorization ───────────────────────────────────────────
  async revokeAuthorization(teacherUserId, studentId, req) {
    const teacher = await resolveTeacherById(teacherUserId);
    const student = await studentRepository.findStudentById(studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const assigned = await faceRepository.isTeacherAssignedToSection(teacher.id, student.sectionId);
    if (!assigned) {
      throw new ForbiddenError('You are not assigned to this student\'s section.');
    }

    await faceRepository.revokeAuthorization(studentId);

    await auditService.log({
      userId: teacherUserId,
      action: 'FACE_AUTH_REVOKED',
      entity: 'Student',
      entityId: studentId,
      details: { teacherId: teacher.id },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return { message: 'Face change authorization revoked.', studentId };
  }

  // ── ATTENDANCE: Verify face descriptor against stored ──────────────────────
  /**
   * Called from student.service.js markAttendance Step 9.
   * @param {string} studentId
   * @param {number[]} sentDescriptor  - Float[] from frontend faceVerificationData.descriptor
   * @returns {{ verified: boolean, distance: number, reason?: string }}
   */
  async verifyForAttendance(studentId, sentDescriptor) {
    if (!sentDescriptor || !Array.isArray(sentDescriptor) || sentDescriptor.length !== 128) {
      return { verified: false, reason: 'Face verification data missing or invalid.' };
    }

    const faceData = await faceRepository.findFaceDataByStudentId(studentId);
    if (!faceData?.faceDescriptor || faceData.faceDescriptor.length !== 128) {
      return {
        verified: false,
        reason: 'No face photo registered. Please register your face from your Profile before marking attendance.',
      };
    }

    const distance = euclideanDistance(faceData.faceDescriptor, sentDescriptor.map(Number));
    const verified = distance <= FACE_MATCH_THRESHOLD;

    return {
      verified,
      distance: parseFloat(distance.toFixed(4)),
      reason: verified
        ? null
        : `Face does not match registered photo (distance: ${distance.toFixed(3)}). Please ensure you are in good lighting and facing the camera directly.`,
    };
  }
}

export default new FaceService();
