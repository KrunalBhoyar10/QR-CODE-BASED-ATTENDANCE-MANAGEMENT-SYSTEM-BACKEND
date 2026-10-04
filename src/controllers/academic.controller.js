import academicService from '../services/academic.service.js';
import { successResponse } from '../utils/response.js';

// Departments
export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await academicService.getAllDepartments();
    return successResponse(res, 200, 'Departments retrieved successfully', departments);
  } catch (error) { next(error); }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await academicService.getDepartmentById(req.params.id);
    return successResponse(res, 200, 'Department details retrieved', department);
  } catch (error) { next(error); }
};

export const createDepartment = async (req, res, next) => {
  try {
    const department = await academicService.createDepartment(req.body, req.user);
    return successResponse(res, 201, 'Department created successfully', department);
  } catch (error) { next(error); }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await academicService.updateDepartment(req.params.id, req.body, req.user);
    return successResponse(res, 200, 'Department updated successfully', department);
  } catch (error) { next(error); }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const result = await academicService.deleteDepartment(req.params.id, req.user);
    return successResponse(res, 200, result.message);
  } catch (error) { next(error); }
};

// Programs
export const getProgramsByDepartment = async (req, res, next) => {
  try {
    const programs = await academicService.getProgramsByDepartment(req.params.departmentId);
    return successResponse(res, 200, 'Programs retrieved successfully', programs);
  } catch (error) { next(error); }
};

export const createProgram = async (req, res, next) => {
  try {
    const program = await academicService.createProgram(req.body, req.user);
    return successResponse(res, 201, 'Program created successfully', program);
  } catch (error) { next(error); }
};

export const updateProgram = async (req, res, next) => {
  try {
    const program = await academicService.updateProgram(req.params.id, req.body, req.user);
    return successResponse(res, 200, 'Program updated successfully', program);
  } catch (error) { next(error); }
};

export const deleteProgram = async (req, res, next) => {
  try {
    const result = await academicService.deleteProgram(req.params.id, req.user);
    return successResponse(res, 200, result.message);
  } catch (error) { next(error); }
};

// Academic Years
export const getAcademicYearsByProgram = async (req, res, next) => {
  try {
    const years = await academicService.getAcademicYearsByProgram(req.params.programId);
    return successResponse(res, 200, 'Academic years retrieved successfully', years);
  } catch (error) { next(error); }
};

export const createAcademicYear = async (req, res, next) => {
  try {
    const year = await academicService.createAcademicYear(req.body, req.user);
    return successResponse(res, 201, 'Academic year created successfully', year);
  } catch (error) { next(error); }
};

// Sections
export const getSectionsByAcademicYear = async (req, res, next) => {
  try {
    const sections = await academicService.getSectionsByAcademicYear(req.params.academicYearId);
    return successResponse(res, 200, 'Sections retrieved successfully', sections);
  } catch (error) { next(error); }
};

export const createSection = async (req, res, next) => {
  try {
    const section = await academicService.createSection(req.body, req.user);
    return successResponse(res, 201, 'Section created successfully', section);
  } catch (error) { next(error); }
};

// Subjects
export const getAllSubjects = async (req, res, next) => {
  try {
    const { departmentId, programId } = req.query;
    const subjects = await academicService.getAllSubjects({ departmentId, programId });
    return successResponse(res, 200, 'Subjects retrieved successfully', subjects);
  } catch (error) { next(error); }
};

export const createSubject = async (req, res, next) => {
  try {
    const subject = await academicService.createSubject(req.body, req.user);
    return successResponse(res, 201, 'Subject created successfully', subject);
  } catch (error) { next(error); }
};

export const updateSubject = async (req, res, next) => {
  try {
    const subject = await academicService.updateSubject(req.params.id, req.body, req.user);
    return successResponse(res, 200, 'Subject updated successfully', subject);
  } catch (error) { next(error); }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const result = await academicService.deleteSubject(req.params.id, req.user);
    return successResponse(res, 200, result.message);
  } catch (error) { next(error); }
};
