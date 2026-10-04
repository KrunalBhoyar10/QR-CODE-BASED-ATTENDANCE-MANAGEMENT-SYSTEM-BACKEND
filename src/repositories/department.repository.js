import { prisma } from '../lib/prisma.js';

class DepartmentRepository {
  async findAll() {
    return prisma.department.findMany({
      include: {
        hod: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            programs: true,
            teachers: true,
            students: true,
            subjects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        hod: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        programs: {
          include: {
            academicYears: {
              include: {
                sections: true,
              },
            },
          },
        },
        subjects: true,
      },
    });
  }

  async findByCode(code) {
    return prisma.department.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  async create(data) {
    return prisma.department.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  }

  async update(id, data) {
    return prisma.department.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
    });
  }

  async delete(id) {
    return prisma.department.delete({
      where: { id },
    });
  }
}

export default new DepartmentRepository();
