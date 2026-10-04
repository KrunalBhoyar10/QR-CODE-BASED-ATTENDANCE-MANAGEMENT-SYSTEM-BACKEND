import { prisma } from '../lib/prisma.js';

class AcademicYearRepository {
  async findAllByProgram(programId) {
    return prisma.academicYear.findMany({
      where: { programId },
      include: {
        sections: true,
        _count: {
          select: {
            students: true,
            teachingAssignments: true,
          },
        },
      },
      orderBy: { yearNumber: 'asc' },
    });
  }

  async findById(id) {
    return prisma.academicYear.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            department: true,
          },
        },
        sections: true,
      },
    });
  }

  async create(data) {
    return prisma.academicYear.create({
      data,
    });
  }

  async delete(id) {
    return prisma.academicYear.delete({
      where: { id },
    });
  }
}

export default new AcademicYearRepository();
