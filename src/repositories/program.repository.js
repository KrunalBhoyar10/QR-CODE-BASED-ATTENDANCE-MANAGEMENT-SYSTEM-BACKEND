import { prisma } from '../lib/prisma.js';

class ProgramRepository {
  async findAllByDepartment(departmentId) {
    return prisma.program.findMany({
      where: { departmentId },
      include: {
        academicYears: {
          include: {
            sections: true,
          },
          orderBy: { yearNumber: 'asc' },
        },
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return prisma.program.findUnique({
      where: { id },
      include: {
        department: true,
        academicYears: {
          include: {
            sections: true,
          },
          orderBy: { yearNumber: 'asc' },
        },
      },
    });
  }

  async create(data) {
    return prisma.program.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  }

  async update(id, data) {
    return prisma.program.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
    });
  }

  async delete(id) {
    return prisma.program.delete({
      where: { id },
    });
  }
}

export default new ProgramRepository();
