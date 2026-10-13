/**
 * face.controller.js
 * Thin controllers — extract from req, delegate to faceService, return response.
 */
import faceService from '../services/face.service.js';
import { successResponse } from '../utils/response.js';

// ── Student controllers ───────────────────────────────────────────────────────

export const registerFace = async (req, res, next) => {
  try {
    const result = await faceService.registerFace(
      req.user.id,
      req.file,
      req.body.faceDescriptor,
      req
    );
    return successResponse(res, 201, 'Face registered successfully.', result);
  } catch (err) {
    next(err);
  }
};

export const updateFace = async (req, res, next) => {
  try {
    const result = await faceService.updateFace(
      req.user.id,
      req.file,
      req.body.faceDescriptor,
      req
    );
    return successResponse(res, 200, 'Face photo updated successfully.', result);
  } catch (err) {
    next(err);
  }
};

export const getFaceStatus = async (req, res, next) => {
  try {
    const result = await faceService.getFaceStatus(req.user.id);
    return successResponse(res, 200, 'Face status retrieved.', result);
  } catch (err) {
    next(err);
  }
};

// ── Teacher controllers ───────────────────────────────────────────────────────

export const getStudentFaceStatus = async (req, res, next) => {
  try {
    const result = await faceService.getStudentFaceStatus(
      req.user.id,
      req.params.studentId
    );
    return successResponse(res, 200, 'Student face status retrieved.', result);
  } catch (err) {
    next(err);
  }
};

export const authorizeStudentFaceChange = async (req, res, next) => {
  try {
    const result = await faceService.authorizeChange(
      req.user.id,
      req.params.studentId,
      req
    );
    return successResponse(res, 200, result.message, result);
  } catch (err) {
    next(err);
  }
};

export const revokeStudentFaceAuth = async (req, res, next) => {
  try {
    const result = await faceService.revokeAuthorization(
      req.user.id,
      req.params.studentId,
      req
    );
    return successResponse(res, 200, result.message, result);
  } catch (err) {
    next(err);
  }
};
