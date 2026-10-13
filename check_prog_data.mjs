import { PrismaClient } from '@prisma/client';
const c = new PrismaClient();
try {
  // Find BCA program
  const prog = await c.program.findFirst({ where: { code: 'BCA' } });
  if (!prog) { console.log('No BCA program'); process.exit(0); }

  console.log(`Program: ${prog.name} (${prog.code})`);
  console.log(`durationYears: ${prog.durationYears}`);

  // Students in this program
  const students = await c.student.count({ where: { programId: prog.id } });
  console.log(`\nStudents (program._count.students): ${students}`);

  // Subjects in this program (all, including inactive)
  const allSubjects = await c.subject.count({ where: { programId: prog.id } });
  const activeSubjects = await c.subject.count({ where: { programId: prog.id, isActive: true } });
  console.log(`Subjects (all): ${allSubjects}`);
  console.log(`Subjects (active): ${activeSubjects}`);

  // List subjects
  const subjList = await c.subject.findMany({
    where: { programId: prog.id },
    select: { name: true, code: true, isActive: true, subjectType: true, academicYearId: true },
  });
  console.log('\nSubject list:');
  subjList.forEach(s => console.log(`  - ${s.name} (${s.code}) | active=${s.isActive} | type=${s.subjectType} | yearId=${s.academicYearId ? s.academicYearId.slice(0,8) : 'null'}`));

  // Attendance sessions for this program
  const sessions = await c.attendanceSession.count({ where: { programId: prog.id } });
  console.log(`\nAttendance Sessions: ${sessions}`);

  // Academic years
  const years = await c.academicYear.findMany({
    where: { programId: prog.id },
    select: { id: true, yearNumber: true, _count: { select: { sections: true, students: true } } },
  });
  console.log('\nAcademic Years:');
  years.forEach(y => console.log(`  - Year ${y.yearNumber}: ${y._count.sections} sections, ${y._count.students} students`));

} catch (e) {
  console.error('ERR:', e.message);
} finally {
  await c.$disconnect();
}
