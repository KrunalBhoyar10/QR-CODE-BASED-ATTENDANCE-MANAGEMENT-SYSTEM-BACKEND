/**
 * faceVerification.service.js
 *
 * Pluggable face verification interface for attendance marking.
 *
 * Default provider: FACE_API_LOCAL
 *   - Frontend extracts a 128-d descriptor using face-api.js and sends it.
 *   - Backend compares it against the stored descriptor in Student.faceDescriptor
 *     using Euclidean distance (threshold controlled by FACE_MATCH_THRESHOLD env var).
 *
 * Other providers (AWS_REKOGNITION, AZURE_FACE, MOCK_PROVIDER) are stubs
 * and can be wired in by setting the FACE_VERIFICATION_PROVIDER env variable.
 *
 * SECURITY: The client CANNOT influence the verification result by sending any
 * flags. All decisions are made server-side against stored biometric data.
 */
import logger from '../lib/logger.js';

// Lazy import to avoid circular dependency:
// faceVerification.service → face.service → student.repository → …
// We resolve faceService on first use, not at module load time.
let _faceService = null;
const getFaceService = async () => {
  if (!_faceService) {
    const mod = await import('./face.service.js');
    _faceService = mod.default;
  }
  return _faceService;
};

class FaceVerificationService {
  /**
   * Verify face biometric payload for a student during session attendance.
   *
   * @param {object} params
   * @param {string} params.studentId  Student UUID (Student.id, not User.id)
   * @param {object} params.session    AttendanceSession object
   * @param {object} params.faceVerificationData  Payload from frontend
   * @param {object} [params.req]      Express request (for logging only)
   * @returns {Promise<{ verified: boolean, confidence: number, provider: string, metadata: object, reason?: string }>}
   */
  async verify({ studentId, session, faceVerificationData, req }) {
    try {
      if (
        !faceVerificationData ||
        typeof faceVerificationData !== 'object' ||
        Object.keys(faceVerificationData).length === 0
      ) {
        return {
          verified:   false,
          confidence: 0,
          provider:   'FACE_API_LOCAL',
          metadata:   {},
          reason:     'Face verification data was not provided in the request.',
        };
      }

      const provider = process.env.FACE_VERIFICATION_PROVIDER || 'FACE_API_LOCAL';

      if (provider === 'FACE_API_LOCAL') {
        return this._verifyLocal({ studentId, session, faceVerificationData });
      }
      if (provider === 'AWS_REKOGNITION') {
        return this._verifyAws({ studentId, session, faceVerificationData });
      }
      if (provider === 'AZURE_FACE') {
        return this._verifyAzure({ studentId, session, faceVerificationData });
      }
      if (provider === 'MOCK_PROVIDER') {
        return this._verifyMock({ session, faceVerificationData });
      }

      logger.warn(`[FaceVerification] Unknown provider "${provider}". Failing closed.`);
      return {
        verified: false, confidence: 0, provider,
        metadata: {}, reason: `Unknown face verification provider: '${provider}'.`,
      };
    } catch (error) {
      logger.error(`[FaceVerification] Exception for student ${studentId}: ${error.message}`);
      return {
        verified: false, confidence: 0, provider: 'FACE_API_LOCAL',
        metadata: {}, reason: 'Face verification failed internally. Please try again.',
      };
    }
  }

  // ── LOCAL — face-api.js Euclidean distance comparison ─────────────────────
  async _verifyLocal({ studentId, session, faceVerificationData }) {
    const faceService = await getFaceService();
    const sentDescriptor = faceVerificationData?.descriptor;

    const result = await faceService.verifyForAttendance(studentId, sentDescriptor);

    const confidence = result.verified && result.distance != null
      ? parseFloat(Math.max(0, 1 - result.distance).toFixed(4))
      : 0;

    return {
      verified:   result.verified,
      confidence,
      provider:   'FACE_API_LOCAL',
      metadata:   {
        distance:   result.distance,
        sessionId:  session?.id,
        verifiedAt: new Date().toISOString(),
      },
      reason: result.reason || null,
    };
  }

  // ── MOCK — dev/test only ───────────────────────────────────────────────────
  async _verifyMock({ session, faceVerificationData }) {
    if (process.env.NODE_ENV === 'production') {
      return {
        verified: false, confidence: 0, provider: 'MOCK_PROVIDER',
        metadata: {}, reason: 'Mock provider is not allowed in production.',
      };
    }
    if (faceVerificationData?.fail === true || faceVerificationData?.matched === false) {
      return {
        verified: false, confidence: 0.1, provider: 'MOCK_PROVIDER',
        metadata: { sessionId: session?.id }, reason: 'Mock: simulated failure.',
      };
    }
    return {
      verified: true, confidence: 0.99, provider: 'MOCK_PROVIDER',
      metadata: { sessionId: session?.id, note: 'Mock — dev/test only.' },
    };
  }

  // ── AWS Rekognition stub ───────────────────────────────────────────────────
  async _verifyAws({ studentId, session, faceVerificationData }) {
    logger.warn('[FaceVerification] AWS_REKOGNITION not yet implemented. Failing closed.');
    return {
      verified: false, confidence: 0, provider: 'AWS_REKOGNITION',
      metadata: {}, reason: 'AWS Rekognition integration is not yet implemented.',
    };
  }

  // ── Azure Face stub ────────────────────────────────────────────────────────
  async _verifyAzure({ studentId, session, faceVerificationData }) {
    logger.warn('[FaceVerification] AZURE_FACE not yet implemented. Failing closed.');
    return {
      verified: false, confidence: 0, provider: 'AZURE_FACE',
      metadata: {}, reason: 'Azure Face API integration is not yet implemented.',
    };
  }
}

export default new FaceVerificationService();
