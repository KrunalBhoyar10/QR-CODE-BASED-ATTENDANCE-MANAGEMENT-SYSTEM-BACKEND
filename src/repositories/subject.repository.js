import { prisma } from '../lib/prisma.js';

class SubjectRepository {
  async findAll({ departmentId, programId } = {}) {
    return prisma.subject.findMany({
      where: {
        ...(departmentId && { departmentId }),
        ...(programId && { programId }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
        program: true,
      },
    });
  }

  async findByCode(code) {
    return prisma.subject.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
    });
  }

  async create(data) {
    return prisma.subject.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
      include: {
        department: true,
        program: true,
      },
    });
  }

  async update(id, data) {
    return prisma.subject.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
      include: {
        department: true,
        program: true,
      },
    });
  }

  async delete(id) {
    return prisma.subject.delete({
      where: { id },
    });
  }
}

export default new SubjectRepository();
