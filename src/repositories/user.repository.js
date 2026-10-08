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

  async updatePasswordWithFlag(id, passwordHash, mustChangePassword = false) {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword,
      },
    });
  }

  async findHods({ page = 1, limit = 10, search, departmentId, isActive } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      role: 'HOD',
      ...(isActive !== undefined && { isActive }),
      ...(departmentId && {
        headedDepartment: { id: departmentId },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        headedDepartment: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countHods({ search, departmentId, isActive } = {}) {
    const where = {
      role: 'HOD',
      ...(isActive !== undefined && { isActive }),
      ...(departmentId && {
        headedDepartment: { id: departmentId },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return prisma.user.count({ where });
  }

  async findHodById(id) {
    return prisma.user.findFirst({
      where: {
        id,
        role: 'HOD',
      },
      include: {
        headedDepartment: {
          include: {
            _count: {
              select: {
                programs: true,
                teachers: true,
                students: true,
                subjects: true,
              },
            },
          },
        },
      },
    });
  }

  async createHodWithDepartment({ userData, departmentId }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the HOD user
      const user = await tx.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          role: 'HOD',
        },
      });

      // 2. Link HOD to Department
      if (departmentId) {
        // Disconnect previous HOD if any from this department
        await tx.department.update({
          where: { id: departmentId },
          data: { hodId: user.id },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          headedDepartment: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    });
  }

  async updateHod(id, { userData = {}, departmentId }) {
    return prisma.$transaction(async (tx) => {
      if (departmentId !== undefined) {
        // Remove HOD from current department
        await tx.department.updateMany({
          where: { hodId: id },
          data: { hodId: null },
        });

        // Assign to new department if not null
        if (departmentId) {
          await tx.department.update({
            where: { id: departmentId },
            data: { hodId: id },
          });
        }
      }

      // Update user details
      return tx.user.update({
        where: { id },
        data: {
          ...userData,
          ...(userData.email && { email: userData.email.toLowerCase() }),
        },
        include: {
          headedDepartment: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    });
  }

  async updateHodStatus(id, isActive) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        headedDepartment: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async deleteHod(id) {
    return prisma.user.delete({
      where: { id },
    });
  }
}

export default new UserRepository();

