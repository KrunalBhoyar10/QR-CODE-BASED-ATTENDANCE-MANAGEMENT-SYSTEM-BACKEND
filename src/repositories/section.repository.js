import { prisma } from '../lib/prisma.js';

class SectionRepository {
  async findAllByAcademicYear(academicYearId) {
    return prisma.section.findMany({
      where: { academicYearId },
      include: {
        _count: {
          select: {
            students: true,
            teachingAssignments: true,
            attendanceSessions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return prisma.section.findUnique({
      where: { id },
      include: {
        academicYear: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            teachingAssignments: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.section.create({
      data: {
        ...data,
        name: data.name.toUpperCase().trim(),
      },
    });
  }

  async update(id, data) {
    return prisma.section.update({
      where: { id },
      data: {
        ...data,
        ...(data.name && { name: data.name.toUpperCase().trim() }),
      },
    });
  }

  async delete(id) {
    return prisma.section.delete({
      where: { id },
    });
  }
}

export default new SectionRepository();
