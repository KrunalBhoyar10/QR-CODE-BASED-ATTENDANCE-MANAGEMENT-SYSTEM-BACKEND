import { prisma } from '../lib/prisma.js';

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        teacher: true,
        student: true,
        headedDepartment: true,
      },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithProfiles(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
        student: true,
        headedDepartment: true,
      },
    });
  }

  async create(userData) {
    return prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
      },
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

export default new UserRepository();
