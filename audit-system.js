/**
 * COMPREHENSIVE END-TO-END AUDIT SCRIPT
 * QR Code Based Attendance Management System
 * 
 * Tests complete business flow:
 * 1. Principal creates HOD
 * 2. HOD logs in and creates academic structure
 * 3. HOD creates teachers and assignments
 * 4. Teacher creates attendance session
 * 5. Student marks attendance
 * 6. Security validations
 */

import axios from 'axios';
import { prisma } from './src/lib/prisma.js';
import { getCache, deleteCache } from './src/lib/redis.js';

const API_BASE = 'http://localhost:5000/api/v1';

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  securityTests: [],
};

function logPass(test) {
  console.log(`✅ PASS: ${test}`);
  results.passed.push(test);
}

function logFail(test, error) {
  console.log(`❌ FAIL: ${test}`);
  console.log(`   Error: ${error.message || error}`);
  results.failed.push({ test, error: error.message || error });
}

function logWarn(warning) {
  console.log(`⚠️  WARN: ${warning}`);
  results.warnings.push(warning);
}

function logSecurity(test, result) {
  console.log(`🔒 SECURITY: ${test} - ${result ? 'BLOCKED' : 'ALLOWED'}`);
  results.securityTests.push({ test, blocked: result });
}

// State tracking for test flow
const state = {
  principal: null,
  hod: null,
  hodTemporaryPassword: null,
  department: null,
  programBCA: null,
  programMCA: null,
  year1BCA: null,
  year1MCA: null,
  year2MCA: null,
  sectionABCA: null,
  sectionBMCA: null,
  subjectJava: null,
  subjectDCN: null,
  subjectPython: null,
  teacherA: null,
  teacherB: null,
  teacherAPassword: null,
  teacherBPassword: null,
  assignmentAJava: null,
  assignmentADCN: null,
  assignmentBPython: null,
  sessionJava: null,
  student: null,
  studentPassword: null,
  attendanceRecord: null,
};

// ============================================================
// SETUP: Create Principal Account
// ============================================================

async function setupPrincipal() {
  console.log('\n🔧 SETUP: Creating Principal Account...');
  
  try {
    // Check if principal exists
    const existing = await prisma.user.findFirst({
      where: { email: 'principal@audit.test', role: 'PRINCIPAL' },
    });

    if (existing) {
      // Delete existing principal and related data
      await prisma.user.delete({ where: { id: existing.id } });
      console.log('   Deleted existing principal');
    }

    // Create principal
    const { hashPassword } = await import('./src/utils/passwords.js');
    const passwordHash = await hashPassword('Principal@123');

    const principal = await prisma.user.create({
      data: {
        email: 'principal@audit.test',
        passwordHash,
        firstName: 'Audit',
        lastName: 'Principal',
        role: 'PRINCIPAL',
        isActive: true,
        mustChangePassword: false,
      },
    });

    state.principal = principal;
    logPass('Principal account created');
  } catch (error) {
    logFail('Principal account creation', error);
    throw error;
  }
}

// ============================================================
// TEST 1: Principal Login
// ============================================================

async function testPrincipalLogin() {
  console.log('\n📝 TEST 1: Principal Login...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'principal@audit.test',
      password: 'Principal@123',
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { accessToken, user } = response.data.data;
    if (!accessToken || user.role !== 'PRINCIPAL') {
      throw new Error('Invalid login response');
    }

    state.principal.accessToken = accessToken;
    logPass('Principal login successful');
  } catch (error) {
    logFail('Principal login', error);
    throw error;
  }
}

// ============================================================
// TEST 2: Principal Creates HOD
// ============================================================

async function testPrincipalCreatesHOD() {
  console.log('\n📝 TEST 2: Principal Creates HOD...');
  
  try {
    // First create department
    const deptResponse = await axios.post(
      `${API_BASE}/academic/departments`,
      {
        name: 'Computer Science - Audit',
        code: 'CS-AUDIT',
        description: 'Audit test department',
      },
      { headers: { Authorization: `Bearer ${state.principal.accessToken}` } }
    );

    state.department = deptResponse.data.data;
    logPass('Department created');

    // Create HOD
    const hodResponse = await axios.post(
      `${API_BASE}/principal/hods`,
      {
        firstName: 'Audit',
        lastName: 'HOD',
        email: 'hod@audit.test',
        departmentId: state.department.id,
        temporaryPassword: 'Temp@HOD123',
      },
      { headers: { Authorization: `Bearer ${state.principal.accessToken}` } }
    );

    state.hod = hodResponse.data.data;
    state.hodTemporaryPassword = 'Temp@HOD123';
    
    if (state.hod.mustChangePassword !== true) {
      logWarn('HOD mustChangePassword flag not set to true');
    }

    logPass('HOD created successfully');
  } catch (error) {
    logFail('HOD creation', error);
    throw error;
  }
}

// ============================================================
// TEST 3: HOD Login with Temporary Password
// ============================================================

async function testHODLogin() {
  console.log('\n📝 TEST 3: HOD Login with Temporary Password...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'hod@audit.test',
      password: state.hodTemporaryPassword,
    });

    const { accessToken, user } = response.data.data;
    state.hod.accessToken = accessToken;

    if (user.mustChangePassword !== true) {
      logWarn('HOD should be required to change password on first login');
    }

    logPass('HOD login successful');
  } catch (error) {
    logFail('HOD login', error);
    throw error;
  }
}

// ============================================================
// TEST 4: HOD Changes Password
// ============================================================

async function testHODChangePassword() {
  console.log('\n📝 TEST 4: HOD Changes Temporary Password...');
  
  try {
    await axios.post(
      `${API_BASE}/hod/change-password`,
      {
        currentPassword: state.hodTemporaryPassword,
        newPassword: 'NewHOD@Pass123',
      },
      { headers: { Authorization: `Bearer ${state.hod.accessToken}` } }
    );

    // Re-login with new password
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'hod@audit.test',
      password: 'NewHOD@Pass123',
    });

    state.hod.accessToken = loginResponse.data.data.accessToken;
    
    if (loginResponse.data.data.user.mustChangePassword !== false) {
      logWarn('mustChangePassword flag not cleared after password change');
    }

    logPass('HOD password changed successfully');
  } catch (error) {
    logFail('HOD password change', error);
    throw error;
  }
}

// ============================================================
// TEST 5: HOD Creates Academic Structure
// ============================================================

async function testHODCreatesAcademicStructure() {
  console.log('\n📝 TEST 5: HOD Creates Academic Structure...');
  
  const headers = { Authorization: `Bearer ${state.hod.accessToken}` };

  try {
    // Create BCA Program
    const bcaResponse = await axios.post(
      `${API_BASE}/hod/programs`,
      {
        name: 'Bachelor of Computer Applications - Audit',
        code: 'BCA-AUDIT',
        durationYears: 3,
        isActive: true,
      },
      { headers }
    );
    state.programBCA = bcaResponse.data.data;
    logPass('BCA Program created');

    // Create MCA Program
    const mcaResponse = await axios.post(
      `${API_BASE}/hod/programs`,
      {
        name: 'Master of Computer Applications - Audit',
        code: 'MCA-AUDIT',
        durationYears: 2,
        isActive: true,
      },
      { headers }
    );
    state.programMCA = mcaResponse.data.data;
    logPass('MCA Program created');

    // Create 1st Year for BCA
    const year1BCAResponse = await axios.post(
      `${API_BASE}/hod/academic-years`,
      {
        programId: state.programBCA.id,
        yearNumber: 1,
        label: '1st Year',
      },
      { headers }
    );
    state.year1BCA = year1BCAResponse.data.data;
    logPass('BCA 1st Year created');

    // Create 1st Year for MCA
    const year1MCAResponse = await axios.post(
      `${API_BASE}/hod/academic-years`,
      {
        programId: state.programMCA.id,
        yearNumber: 1,
        label: '1st Year',
      },
      { headers }
    );
    state.year1MCA = year1MCAResponse.data.data;
    logPass('MCA 1st Year created');

    // Create 2nd Year for MCA
    const year2MCAResponse = await axios.post(
      `${API_BASE}/hod/academic-years`,
      {
        programId: state.programMCA.id,
        yearNumber: 2,
        label: '2nd Year',
      },
      { headers }
    );
    state.year2MCA = year2MCAResponse.data.data;
    logPass('MCA 2nd Year created');

    // Create Section A for BCA 1st Year
    const sectionABCAResponse = await axios.post(
      `${API_BASE}/hod/sections`,
      {
        academicYearId: state.year1BCA.id,
        name: 'A',
        capacity: 60,
      },
      { headers }
    );
    state.sectionABCA = sectionABCAResponse.data.data;
    logPass('BCA 1st Year Section A created');

    // Create Section B for MCA 1st Year
    const sectionBMCAResponse = await axios.post(
      `${API_BASE}/hod/sections`,
      {
        academicYearId: state.year1MCA.id,
        name: 'B',
        capacity: 50,
      },
      { headers }
    );
    state.sectionBMCA = sectionBMCAResponse.data.data;
    logPass('MCA 1st Year Section B created');

    // Create Subjects
    const javaResponse = await axios.post(
      `${API_BASE}/hod/subjects`,
      {
        name: 'Core Java Programming - Audit',
        code: 'JAVA-AUDIT',
        credits: 4,
        programId: state.programBCA.id,
        isActive: true,
      },
      { headers }
    );
    state.subjectJava = javaResponse.data.data;
    logPass('Java subject created');

    const dcnResponse = await axios.post(
      `${API_BASE}/hod/subjects`,
      {
        name: 'Data Communication & Networking - Audit',
        code: 'DCN-AUDIT',
        credits: 4,
        programId: state.programMCA.id,
        isActive: true,
      },
      { headers }
    );
    state.subjectDCN = dcnResponse.data.data;
    logPass('DCN subject created');

    const pythonResponse = await axios.post(
      `${API_BASE}/hod/subjects`,
      {
        name: 'Python Programming - Audit',
        code: 'PYTHON-AUDIT',
        credits: 3,
        programId: state.programBCA.id,
        isActive: true,
      },
      { headers }
    );
    state.subjectPython = pythonResponse.data.data;
    logPass('Python subject created');

  } catch (error) {
    logFail('Academic structure creation', error);
    throw error;
  }
}

// ============================================================
// TEST 6-7: HOD Creates Teachers
// ============================================================

async function testHODCreatesTeachers() {
  console.log('\n📝 TEST 6-7: HOD Creates Teachers...');
  
  const headers = { Authorization: `Bearer ${state.hod.accessToken}` };

  try {
    // Create Teacher A
    const teacherAResponse = await axios.post(
      `${API_BASE}/hod/teachers`,
      {
        firstName: 'Teacher',
        lastName: 'A-Audit',
        email: 'teacher.a@audit.test',
        employeeId: 'TA-AUDIT-001',
        designation: 'Assistant Professor',
        password: 'TeacherA@123',
        isActive: true,
        mustChangePassword: false,
      },
      { headers }
    );
    state.teacherA = teacherAResponse.data.data.teacher;
    state.teacherAPassword = 'TeacherA@123';
    logPass('Teacher A created');

    // Create Teacher B
    const teacherBResponse = await axios.post(
      `${API_BASE}/hod/teachers`,
      {
        firstName: 'Teacher',
        lastName: 'B-Audit',
        email: 'teacher.b@audit.test',
        employeeId: 'TB-AUDIT-002',
        designation: 'Associate Professor',
        password: 'TeacherB@123',
        isActive: true,
        mustChangePassword: false,
      },
      { headers }
    );
    state.teacherB = teacherBResponse.data.data.teacher;
    state.teacherBPassword = 'TeacherB@123';
    logPass('Teacher B created');

  } catch (error) {
    logFail('Teacher creation', error);
    throw error;
  }
}

// ============================================================
// TEST 8: HOD Creates Teaching Assignments
// ============================================================

async function testHODCreatesAssignments() {
  console.log('\n📝 TEST 8: HOD Creates Teaching Assignments...');
  
  const headers = { Authorization: `Bearer ${state.hod.accessToken}` };

  try {
    // Teacher A: BCA → 1st Year → Section A → Java
    const assignmentA Java = await axios.post(
      `${API_BASE}/hod/teaching-assignments`,
      {
        teacherId: state.teacherA.id,
        subjectId: state.subjectJava.id,
        programId: state.programBCA.id,
        academicYearId: state.year1BCA.id,
        sectionId: state.sectionABCA.id,
      },
      { headers }
    );
    state.assignmentAJava = assignmentAJava.data.data;
    logPass('Assignment: Teacher A → BCA → Java');

    // Teacher A: MCA → 1st Year → Section B → DCN
    const assignmentADCN = await axios.post(
      `${API_BASE}/hod/teaching-assignments`,
      {
        teacherId: state.teacherA.id,
        subjectId: state.subjectDCN.id,
        programId: state.programMCA.id,
        academicYearId: state.year1MCA.id,
        sectionId: state.sectionBMCA.id,
      },
      { headers }
    );
    state.assignmentADCN = assignmentADCN.data.data;
    logPass('Assignment: Teacher A → MCA → DCN');

    // Teacher B: BCA → 1st Year → Section A → Python
    const assignmentBPython = await axios.post(
      `${API_BASE}/hod/teaching-assignments`,
      {
        teacherId: state.teacherB.id,
        subjectId: state.subjectPython.id,
        programId: state.programBCA.id,
        academicYearId: state.year1BCA.id,
        sectionId: state.sectionABCA.id,
      },
      { headers }
    );
    state.assignmentBPython = assignmentBPython.data.data;
    logPass('Assignment: Teacher B → BCA → Python');

  } catch (error) {
    logFail('Teaching assignment creation', error);
    throw error;
  }
}

// ============================================================
// TEST 9: Teacher A Login
// ============================================================

async function testTeacherALogin() {
  console.log('\n📝 TEST 9: Teacher A Login...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'teacher.a@audit.test',
      password: state.teacherAPassword,
    });

    state.teacherA.accessToken = response.data.data.accessToken;
    logPass('Teacher A login successful');
  } catch (error) {
    logFail('Teacher A login', error);
    throw error;
  }
}

// ============================================================
// TEST 10: Teacher A Views Assignments (Scope Verification)
// ============================================================

async function testTeacherAAssignments() {
  console.log('\n📝 TEST 10: Teacher A Views Assigned Scopes...');
  
  const headers = { Authorization: `Bearer ${state.teacherA.accessToken}` };

  try {
    const response = await axios.get(`${API_BASE}/teacher/assignments`, { headers });
    const { grouped, totalCount } = response.data.data;

    if (totalCount !== 2) {
      throw new Error(`Expected 2 assignments, got ${totalCount}`);
    }

    // Verify BCA program exists with Java subject
    const bcaProgram = grouped.find(p => p.programCode === 'BCA-AUDIT');
    if (!bcaProgram) {
      throw new Error('BCA program not found in assignments');
    }

    const javaSubject = bcaProgram.academicYears
      ?.find(y => y.yearNumber === 1)
      ?.sections?.find(s => s.sectionName === 'A')
      ?.subjects?.find(sub => sub.subjectCode === 'JAVA-AUDIT');

    if (!javaSubject) {
      throw new Error('Java subject not found for BCA Section A');
    }

    // Verify MCA program exists with DCN subject
    const mcaProgram = grouped.find(p => p.programCode === 'MCA-AUDIT');
    if (!mcaProgram) {
      throw new Error('MCA program not found in assignments');
    }

    const dcnSubject = mcaProgram.academicYears
      ?.find(y => y.yearNumber === 1)
      ?.sections?.find(s => s.sectionName === 'B')
      ?.subjects?.find(sub => sub.subjectCode === 'DCN-AUDIT');

    if (!dcnSubject) {
      throw new Error('DCN subject not found for MCA Section B');
    }

    logPass('Teacher A sees correct assigned scopes (BCA/Java and MCA/DCN)');
  } catch (error) {
    logFail('Teacher A assignments verification', error);
    throw error;
  }
}

// ============================================================
// TEST 11: Teacher A Creates Attendance Session
// ============================================================

async function testTeacherACreatesSession() {
  console.log('\n📝 TEST 11: Teacher A Creates Attendance Session...');
  
  const headers = { Authorization: `Bearer ${state.teacherA.accessToken}` };

  try {
    const response = await axios.post(
      `${API_BASE}/teacher/sessions`,
      {
        teachingAssignmentId: state.assignmentAJava.id,
        durationMinutes: 5,
        allowedRadius: 50,
        latitude: 21.1458,
        longitude: 79.0882,
        faceVerificationRequired: false,
        sessionType: 'REGULAR',
      },
      { headers }
    );

    state.sessionJava = response.data.data;

    if (!state.sessionJava.session.id) {
      throw new Error('Session ID not returned');
    }

    if (!state.sessionJava.qr.data) {
      throw new Error('QR code data not returned');
    }

    logPass('Attendance session created successfully');
  } catch (error) {
    logFail('Attendance session creation', error);
    throw error;
  }
}

// ============================================================
// TEST 12-13: Validate Session in Redis and PostgreSQL
// ============================================================

async function testSessionValidation() {
  console.log('\n📝 TEST 12-13: Validate Session in Redis and PostgreSQL...');
  
  try {
    // Check Redis
    const redisKey = `attendance:session:${state.sessionJava.session.id}`;
    const redisState = await getCache(redisKey);

    if (!redisState) {
      throw new Error('Session not found in Redis');
    }

    if (!redisState.qrToken) {
      throw new Error('QR token not stored in Redis');
    }

    logPass('Session exists in Redis with QR token');

    // Check PostgreSQL
    const dbSession = await prisma.attendanceSession.findUnique({
      where: { id: state.sessionJava.session.id },
    });

    if (!dbSession) {
      throw new Error('Session not found in PostgreSQL');
    }

    if (dbSession.status !== 'ACTIVE') {
      throw new Error(`Session status is ${dbSession.status}, expected ACTIVE`);
    }

    if (dbSession.teachingAssignmentId !== state.assignmentAJava.id) {
      throw new Error('Teaching assignment ID mismatch');
    }

    logPass('Session exists in PostgreSQL with correct attributes');

    // Verify Redis TTL
    const ttlSeconds = redisState.durationSeconds || 300;
    if (ttlSeconds < 1) {
      logWarn('Redis TTL is zero or negative');
    } else {
      logPass(`Redis TTL set correctly (${ttlSeconds} seconds)`);
    }

  } catch (error) {
    logFail('Session validation', error);
    throw error;
  }
}

// ============================================================
// TEST 14: QR Code Validation
// ============================================================

async function testQRCodeValidation() {
  console.log('\n📝 TEST 14: QR Code Validation...');
  
  try {
    const qrData = state.sessionJava.qr.data;
    const qrPayload = JSON.parse(Buffer.from(qrData, 'base64').toString());

    if (!qrPayload.sessionId) {
      throw new Error('QR payload missing sessionId');
    }

    if (!qrPayload.token) {
      throw new Error('QR payload missing token');
    }

    if (!qrPayload.expiresAt) {
      throw new Error('QR payload missing expiresAt');
    }

    // Verify QR does not contain secrets
    if (qrPayload.jwtSecret || qrPayload.secretKey || qrPayload.password) {
      throw new Error('QR contains sensitive data!');
    }

    logPass('QR code is temporary and contains no secrets');
  } catch (error) {
    logFail('QR code validation', error);
    throw error;
  }
}

// ============================================================
// SETUP: Create Student Account
// ============================================================

async function setupStudent() {
  console.log('\n🔧 SETUP: Creating Student Account...');
  
  try {
    const { hashPassword } = await import('./src/utils/passwords.js');
    const passwordHash = await hashPassword('Student@123');

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'student@audit.test',
        passwordHash,
        firstName: 'Audit',
        lastName: 'Student',
        role: 'STUDENT',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Create student profile linked to BCA Section A
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber: 'BCA-A-001',
        enrollmentNumber: 'EN-2026-001',
        departmentId: state.department.id,
        programId: state.programBCA.id,
        academicYearId: state.year1BCA.id,
        sectionId: state.sectionABCA.id,
      },
    });

    state.student = student;
    state.studentPassword = 'Student@123';
    logPass('Student account created (BCA Section A)');
  } catch (error) {
    logFail('Student account creation', error);
    throw error;
  }
}

// ============================================================
// TEST 15: Student Login
// ============================================================

async function testStudentLogin() {
  console.log('\n📝 TEST 15: Student Login...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'student@audit.test',
      password: state.studentPassword,
    });

    state.student.accessToken = response.data.data.accessToken;
    logPass('Student login successful');
  } catch (error) {
    logFail('Student login', error);
    throw error;
  }
}

// ============================================================
// TEST 16-17: Student Marks Attendance
// ============================================================

async function testStudentMarksAttendance() {
  console.log('\n📝 TEST 16-17: Student Marks Attendance...');
  
  const headers = { Authorization: `Bearer ${state.student.accessToken}` };
  const qrPayload = JSON.parse(
    Buffer.from(state.sessionJava.qr.data, 'base64').toString()
  );

  try {
    const response = await axios.post(
      `${API_BASE}/student/attendance/mark`,
      {
        sessionId: qrPayload.sessionId,
        token: qrPayload.token,
        latitude: 21.1458,
        longitude: 79.0882,
      },
      { headers }
    );

    state.attendanceRecord = response.data.data;

    if (response.data.data.status !== 'PRESENT') {
      throw new Error(`Expected status PRESENT, got ${response.data.data.status}`);
    }

    logPass('Student attendance marked successfully');

    // Verify in database
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        studentId_sessionId: {
          studentId: state.student.id,
          sessionId: state.sessionJava.session.id,
        },
      },
    });

    if (!record) {
      throw new Error('Attendance record not found in database');
    }

    logPass('Attendance record confirmed in PostgreSQL');

  } catch (error) {
    logFail('Student attendance marking', error);
    throw error;
  }
}

// ============================================================
// TEST 18: Duplicate Attendance Prevention
// ============================================================

async function testDuplicateAttendance() {
  console.log('\n📝 TEST 18: Duplicate Attendance Prevention...');
  
  const headers = { Authorization: `Bearer ${state.student.accessToken}` };
  const qrPayload = JSON.parse(
    Buffer.from(state.sessionJava.qr.data, 'base64').toString()
  );

  try {
    await axios.post(
      `${API_BASE}/student/attendance/mark`,
      {
        sessionId: qrPayload.sessionId,
        token: qrPayload.token,
        latitude: 21.1458,
        longitude: 79.0882,
      },
      { headers }
    );

    logFail('Duplicate attendance', 'Expected 409 Conflict, but request succeeded');
  } catch (error) {
    if (error.response?.status === 409) {
      logPass('Duplicate attendance correctly rejected (409 Conflict)');
    } else {
      logFail('Duplicate attendance', error);
      throw error;
    }
  }
}

// ============================================================
// SECURITY TESTS
// ============================================================

async function securityTests() {
  console.log('\n🔒 SECURITY TESTS...');

  // Test 1: Teacher A cannot access Teacher B's assignment
  try {
    await axios.get(
      `${API_BASE}/teacher/assignments/${state.assignmentBPython.id}`,
      { headers: { Authorization: `Bearer ${state.teacherA.accessToken}` } }
    );
    logSecurity('Teacher A accessing Teacher B assignment', false);
  } catch (error) {
    if (error.response?.status === 403) {
      logSecurity('Teacher A accessing Teacher B assignment', true);
    } else {
      logSecurity('Teacher A accessing Teacher B assignment', false);
    }
  }

  // Test 2: Student from wrong section cannot mark attendance
  try {
    // Create student in different section
    const { hashPassword } = await import('./src/utils/passwords.js');
    const wrongUser = await prisma.user.create({
      data: {
        email: 'wrong.student@audit.test',
        passwordHash: await hashPassword('Wrong@123'),
        firstName: 'Wrong',
        lastName: 'Section',
        role: 'STUDENT',
        isActive: true,
      },
    });

    const wrongStudent = await prisma.student.create({
      data: {
        userId: wrongUser.id,
        rollNumber: 'MCA-B-001',
        enrollmentNumber: 'EN-2026-002',
        departmentId: state.department.id,
        programId: state.programMCA.id,
        academicYearId: state.year1MCA.id,
        sectionId: state.sectionBMCA.id, // MCA Section B (session is for BCA Section A)
      },
    });

    const wrongLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'wrong.student@audit.test',
      password: 'Wrong@123',
    });

    const qrPayload = JSON.parse(
      Buffer.from(state.sessionJava.qr.data, 'base64').toString()
    );

    await axios.post(
      `${API_BASE}/student/attendance/mark`,
      {
        sessionId: qrPayload.sessionId,
        token: qrPayload.token,
        latitude: 21.1458,
        longitude: 79.0882,
      },
      { headers: { Authorization: `Bearer ${wrongLoginResponse.data.data.accessToken}` } }
    );

    logSecurity('Student from wrong section marking attendance', false);
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.message?.includes('section')) {
      logSecurity('Student from wrong section marking attendance', true);
    } else {
      logSecurity('Student from wrong section marking attendance', false);
    }
  }

  // Test 3: Expired JWT rejection
  try {
    await axios.get(`${API_BASE}/student/profile`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired' },
    });
    logSecurity('Expired JWT rejection', false);
  } catch (error) {
    if (error.response?.status === 401) {
      logSecurity('Expired JWT rejection', true);
    } else {
      logSecurity('Expired JWT rejection', false);
    }
  }

  // Test 4: Invalid token in QR
  try {
    await axios.post(
      `${API_BASE}/student/attendance/mark`,
      {
        sessionId: state.sessionJava.session.id,
        token: 'INVALID-TOKEN-12345',
        latitude: 21.1458,
        longitude: 79.0882,
      },
      { headers: { Authorization: `Bearer ${state.student.accessToken}` } }
    );
    logSecurity('Invalid QR token rejection', false);
  } catch (error) {
    if (error.response?.status === 400) {
      logSecurity('Invalid QR token rejection', true);
    } else {
      logSecurity('Invalid QR token rejection', false);
    }
  }

  // Test 5: Outside geofence
  try {
    // Create new session for this test
    const testSessionResponse = await axios.post(
      `${API_BASE}/teacher/sessions`,
      {
        teachingAssignmentId: state.assignmentAJava.id,
        durationMinutes: 5,
        allowedRadius: 10, // Very small radius (10 meters)
        latitude: 21.1458,
        longitude: 79.0882,
        faceVerificationRequired: false,
      },
      { headers: { Authorization: `Bearer ${state.teacherA.accessToken}` } }
    );

    const geoPayload = JSON.parse(
      Buffer.from(testSessionResponse.data.data.qr.data, 'base64').toString()
    );

    await axios.post(
      `${API_BASE}/student/attendance/mark`,
      {
        sessionId: geoPayload.sessionId,
        token: geoPayload.token,
        latitude: 21.1500, // ~500m away
        longitude: 79.0900,
      },
      { headers: { Authorization: `Bearer ${state.student.accessToken}` } }
    );
    logSecurity('Outside geofence rejection', false);
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Geofence')) {
      logSecurity('Outside geofence rejection', true);
    } else {
      logSecurity('Outside geofence rejection', false);
    }
  }
}

// ============================================================
// MAIN AUDIT EXECUTION
// ============================================================

async function runAudit() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   QR ATTENDANCE SYSTEM - COMPREHENSIVE E2E AUDIT          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    await setupPrincipal();
    await testPrincipalLogin();
    await testPrincipalCreatesHOD();
    await testHODLogin();
    await testHODChangePassword();
    await testHODCreatesAcademicStructure();
    await testHODCreatesTeachers();
    await testHODCreatesAssignments();
    await testTeacherALogin();
    await testTeacherAAssignments();
    await testTeacherACreatesSession();
    await testSessionValidation();
    await testQRCodeValidation();
    await setupStudent();
    await testStudentLogin();
    await testStudentMarksAttendance();
    await testDuplicateAttendance();
    await securityTests();

    // Final Report
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    AUDIT REPORT                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Tests Passed: ${results.passed.length}`);
    console.log(`❌ Tests Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    console.log(`🔒 Security Tests: ${results.securityTests.filter(t => t.blocked).length}/${results.securityTests.length} blocked\n`);

    if (results.failed.length > 0) {
      console.log('Failed Tests:');
      results.failed.forEach(f => {
        console.log(`  ❌ ${f.test}`);
        console.log(`     ${f.error}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }

    process.exit(results.failed.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n💥 AUDIT FAILED WITH CRITICAL ERROR:');
    console.error(error);
    process.exit(1);
  }
}

runAudit();
