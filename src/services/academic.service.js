import departmentRepository from '../repositories/department.repository.js';
import programRepository from '../repositories/program.repository.js';
import academicYearRepository from '../repositories/academicYear.repository.js';
import sectionRepository from '../repositories/section.repository.js';
import subjectRepository from '../repositories/subject.repository.js';
import auditService from './audit.service.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

class AcademicService {
  // ==========================================
  // DEPARTMENTS
  // ==========================================

  async getAllDepartments() {
    return departmentRepository.findAll();
  }

  async getDepartmentById(id) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError(`Department with ID ${id} not found`);
    }
    return department;
  }

  async createDepartment(data, reqUser) {
    const existing = await departmentRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError(`Department with code ${data.code} already exists`);
    }

    const department = await departmentRepository.create(data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'DEPARTMENT_CREATED',
      entity: 'Department',
      entityId: department.id,
      details: { name: department.name, code: department.code },
    });

    return department;
  }

  async updateDepartment(id, data, reqUser) {
    await this.getDepartmentById(id);

    if (data.code) {
      const existing = await departmentRepository.findByCode(data.code);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Department with code ${data.code} already exists`);
      }
    }

    const updated = await departmentRepository.update(id, data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'DEPARTMENT_UPDATED',
      entity: 'Department',
      entityId: id,
      details: data,
    });

    return updated;
  }

  async deleteDepartment(id, reqUser) {
    await this.getDepartmentById(id);
    const deleted = await departmentRepository.delete(id);

    await auditService.log({
      userId: reqUser?.id,
      action: 'DEPARTMENT_DELETED',
      entity: 'Department',
      entityId: id,
      details: { name: deleted.name, code: deleted.code },
    });

    return { message: `Department '${deleted.name}' deleted successfully` };
  }

  // ==========================================
  // PROGRAMS
  // ==========================================

  async getProgramsByDepartment(departmentId) {
    await this.getDepartmentById(departmentId);
    return programRepository.findAllByDepartment(departmentId);
  }

  async createProgram(data, reqUser) {
    await this.getDepartmentById(data.departmentId);

    const program = await programRepository.create(data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'PROGRAM_CREATED',
      entity: 'Program',
      entityId: program.id,
      details: { name: program.name, code: program.code, departmentId: program.departmentId },
    });

    return program;
  }

  async updateProgram(id, data, reqUser) {
    const program = await programRepository.findById(id);
    if (!program) {
      throw new NotFoundError(`Program with ID ${id} not found`);
    }

    const updated = await programRepository.update(id, data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'PROGRAM_UPDATED',
      entity: 'Program',
      entityId: id,
      details: data,
    });

    return updated;
  }

  async deleteProgram(id, reqUser) {
    const program = await programRepository.findById(id);
    if (!program) {
      throw new NotFoundError(`Program with ID ${id} not found`);
    }

    const deleted = await programRepository.delete(id);

    await auditService.log({
      userId: reqUser?.id,
      action: 'PROGRAM_DELETED',
      entity: 'Program',
      entityId: id,
      details: { name: deleted.name, code: deleted.code },
    });

    return { message: `Program '${deleted.name}' deleted successfully` };
  }

  // ==========================================
  // ACADEMIC YEARS
  // ==========================================

  async getAcademicYearsByProgram(programId) {
    const program = await programRepository.findById(programId);
    if (!program) {
      throw new NotFoundError(`Program with ID ${programId} not found`);
    }
    return academicYearRepository.findAllByProgram(programId);
  }

  async createAcademicYear(data, reqUser) {
    const program = await programRepository.findById(data.programId);
    if (!program) {
      throw new NotFoundError(`Program with ID ${data.programId} not found`);
    }

    const academicYear = await academicYearRepository.create(data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'ACADEMIC_YEAR_CREATED',
      entity: 'AcademicYear',
      entityId: academicYear.id,
      details: data,
    });

    return academicYear;
  }

  // ==========================================
  // SECTIONS
  // ==========================================

  async getSectionsByAcademicYear(academicYearId) {
    const year = await academicYearRepository.findById(academicYearId);
    if (!year) {
      throw new NotFoundError(`Academic year with ID ${academicYearId} not found`);
    }
    return sectionRepository.findAllByAcademicYear(academicYearId);
  }

  async createSection(data, reqUser) {
    const year = await academicYearRepository.findById(data.academicYearId);
    if (!year) {
      throw new NotFoundError(`Academic year with ID ${data.academicYearId} not found`);
    }

    const section = await sectionRepository.create(data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'SECTION_CREATED',
      entity: 'Section',
      entityId: section.id,
      details: data,
    });

    return section;
  }

  // ==========================================
  // SUBJECTS
  // ==========================================

  async getAllSubjects(filters) {
    return subjectRepository.findAll(filters);
  }

  async createSubject(data, reqUser) {
    await this.getDepartmentById(data.departmentId);

    const program = await programRepository.findById(data.programId);
    if (!program) {
      throw new NotFoundError(`Program with ID ${data.programId} not found`);
    }

    const existing = await subjectRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError(`Subject with code ${data.code} already exists`);
    }

    const subject = await subjectRepository.create(data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'SUBJECT_CREATED',
      entity: 'Subject',
      entityId: subject.id,
      details: { name: subject.name, code: subject.code },
    });

    return subject;
  }

  async updateSubject(id, data, reqUser) {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
      throw new NotFoundError(`Subject with ID ${id} not found`);
    }

    if (data.code) {
      const existing = await subjectRepository.findByCode(data.code);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Subject with code ${data.code} already exists`);
      }
    }

    const updated = await subjectRepository.update(id, data);

    await auditService.log({
      userId: reqUser?.id,
      action: 'SUBJECT_UPDATED',
      entity: 'Subject',
      entityId: id,
      details: data,
    });

    return updated;
  }

  async deleteSubject(id, reqUser) {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
      throw new NotFoundError(`Subject with ID ${id} not found`);
    }

    const deleted = await subjectRepository.delete(id);

    await auditService.log({
      userId: reqUser?.id,
      action: 'SUBJECT_DELETED',
      entity: 'Subject',
      entityId: id,
      details: { name: deleted.name, code: deleted.code },
    });

    return { message: `Subject '${deleted.name}' deleted successfully` };
  }
}

export default new AcademicService();
