import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plaintext password with hashed password
 * @param {string} plain
 * @param {string} hashed
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};
