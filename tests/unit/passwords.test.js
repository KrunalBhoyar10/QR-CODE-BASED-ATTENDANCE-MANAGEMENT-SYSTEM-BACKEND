import { hashPassword, comparePassword } from '../../src/utils/passwords.js';

describe('Password Utilities', () => {
  const plainPassword = 'SecurePassword@123';

  test('should hash a password and confirm it does not equal plain text', async () => {
    const hashed = await hashPassword(plainPassword);
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plainPassword);
    expect(hashed.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  test('should correctly compare password with its hash', async () => {
    const hashed = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword123', hashed);
    expect(isWrongMatch).toBe(false);
  });
});
