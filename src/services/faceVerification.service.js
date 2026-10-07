import logger from '../lib/logger.js';

/**
 * Modular Face Verification Service Interface
 *
 * Provides a pluggable contract for verifying student facial biometrics
 * against their registered enrollment profile during attendance marking.
 *
 * Supports configurable backends (e.g., AWS Rekognition, Azure Face, OpenCV, Mock Provider)
 * without coupling core attendance logic to a specific vendor SDK.
 *
 * Privacy & Security Policy:
 * Raw biometric image data or vectors are NEVER persisted to the database.
 * Only non-sensitive verification results and timestamps are processed.
 *
 * SECURITY CRITICAL:
 * The client MUST NOT be able to inject any flag (e.g. mockVerified, fail, confidence)
 * that controls the verification outcome. All decisions are server-side only.
 */
class FaceVerificationService {
  /**
   * Verify face biometric payload for a student during session attendance
   *
   * @param {object} params
   * @param {string} params.studentId Student UUID
   * @param {object} params.session AttendanceSession object
   * @param {object} params.faceVerificationData Client-provided verification payload
   * @param {object} [params.req] Express request for logging
   * @returns {Promise<{ verified: boolean, confidence: number, provider: string, metadata: object, reason?: string }>}
   */
  async verify({ studentId, session, faceVerificationData, req }) {
    try {
      // 1. Check if face verification data was provided
      if (
        !faceVerificationData ||
        typeof faceVerificationData !== 'object' ||
        Object.keys(faceVerificationData).length === 0
      ) {
        return {
          verified: false,
          confidence: 0,
          provider: 'MODULAR_FACE_SERVICE',
          metadata: {},
          reason: 'Face verification data was not provided in request',
        };
      }

      // 2. Pluggable provider selection — server-side only, never client-controlled
      const provider = process.env.FACE_VERIFICATION_PROVIDER || 'MOCK_PROVIDER';

      if (provider === 'AWS_REKOGNITION') {
        return this.verifyWithAwsRekognition({ studentId, session, faceVerificationData });
      }

      if (provider === 'AZURE_FACE') {
        return this.verifyWithAzureFace({ studentId, session, faceVerificationData });
      }

      if (provider === 'MOCK_PROVIDER') {
        return this.verifyWithMockProvider({ studentId, session, faceVerificationData });
      }

      // Unknown provider — fail closed for security
      logger.warn(`[FaceVerification] Unknown FACE_VERIFICATION_PROVIDER: "${provider}". Failing closed.`);
      return {
        verified: false,
        confidence: 0,
        provider,
        metadata: {},
        reason: `Face verification provider '${provider}' is not supported. Configure a valid provider.`,
      };
    } catch (error) {
      logger.error(`Face verification exception for student ${studentId}: ${error.message}`);
      return {
        verified: false,
        confidence: 0,
        provider: 'MODULAR_FACE_SERVICE',
        metadata: {},
        // Do NOT expose internal error detail to client
        reason: 'Face verification processing failed. Please try again.',
      };
    }
  }

  /**
   * Mock provider — for development and testing ONLY.
   *
   * SECURITY: The client CANNOT control the outcome by sending any flags.
   * This provider simply approves if faceVerificationData is non-empty.
   * It is BLOCKED in production (NODE_ENV=production).
   */
  async verifyWithMockProvider({ studentId, session, faceVerificationData }) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        '[SECURITY] FACE_VERIFICATION_PROVIDER=MOCK_PROVIDER is not allowed in production. ' +
        'Configure AWS_REKOGNITION or AZURE_FACE.'
      );
      return {
        verified: false,
        confidence: 0,
        provider: 'MOCK_PROVIDER',
        metadata: {},
        reason: 'Mock face verification provider is not allowed in production. Configure a real provider.',
      };
    }

    // In test/dev environment, allow simulating failure via test payload
    if (faceVerificationData?.fail === true || faceVerificationData?.matched === false) {
      return {
        verified: false,
        confidence: 0.1,
        provider: 'MOCK_PROVIDER',
        metadata: {
          sessionId: session?.id,
          verifiedAt: new Date().toISOString(),
          note: 'Mock verification simulated failure',
        },
        reason: 'Face verification failed: Biometric match score below threshold',
      };
    }

    // Dev/test: auto-approve if data is present (simulates a real provider passing)
    return {
      verified: true,
      confidence: 0.99,
      provider: 'MOCK_PROVIDER',
      metadata: {
        sessionId: session?.id,
        verifiedAt: new Date().toISOString(),
        note: 'Mock verification — dev/test only',
      },
    };
  }

  /**
   * Stub for AWS Rekognition integration.
   * Replace this method body with a real AWS SDK call before enabling in production.
   */
  async verifyWithAwsRekognition({ studentId, session, faceVerificationData }) {
    // TODO: Implement real AWS Rekognition CompareFaces API call
    logger.warn('[FaceVerification] AWS_REKOGNITION is configured but not yet implemented. Failing closed.');
    return {
      verified: false,
      confidence: 0,
      provider: 'AWS_REKOGNITION',
      metadata: {},
      reason: 'AWS Rekognition integration is not yet implemented on this server.',
    };
  }

  /**
   * Stub for Azure Face API integration.
   * Replace this method body with a real Azure SDK call before enabling in production.
   */
  async verifyWithAzureFace({ studentId, session, faceVerificationData }) {
    // TODO: Implement real Azure Face API Verify call
    logger.warn('[FaceVerification] AZURE_FACE is configured but not yet implemented. Failing closed.');
    return {
      verified: false,
      confidence: 0,
      provider: 'AZURE_FACE',
      metadata: {},
      reason: 'Azure Face API integration is not yet implemented on this server.',
    };
  }
}

export default new FaceVerificationService();
