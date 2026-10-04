import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
} from '../../src/utils/tokens.js';

describe('Token Utilities', () => {
  const samplePayload = {
    id: 'user-uuid-1234',
    email: 'teacher@college.edu',
    role: 'TEACHER',
  };

  test('should generate and verify an access token', () => {
    const token = generateAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(samplePayload.id);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.role).toBe(samplePayload.role);
  });

  test('should generate and verify a refresh token', () => {
    const refreshToken = generateRefreshToken({ id: samplePayload.id });
    expect(typeof refreshToken).toBe('string');

    const decoded = verifyRefreshToken(refreshToken);
    expect(decoded.id).toBe(samplePayload.id);
  });

  test('should generate a SHA-256 hash of a token', () => {
    const token = 'sample-random-jwt-token-string';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  test('should generate random crypto tokens of specified byte length', () => {
    const randomHex = generateRandomToken(32);
    expect(randomHex.length).toBe(64); // 32 bytes * 2 hex chars
  });
});
