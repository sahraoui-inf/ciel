import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = process.env.DATABASE_URL || "mysql://root@localhost:3306/portailciel";
const adapter = new PrismaMariaDb(url);
const prisma = new PrismaClient({ adapter });

async function main() {
  const bcrypt = await import("bcryptjs");

  const adminPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lingua.com" },
    update: {},
    create: { name: "Super Admin", email: "admin@lingua.com", password: adminPassword, role: "SuperAdmin" },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin.staff@lingua.com" },
    update: {},
    create: { name: "Admin Staff", email: "admin.staff@lingua.com", password: adminPassword, role: "Admin" },
  });

  const english = await prisma.language.upsert({
    where: { code: "EN" },
    update: {},
    create: { name: "English", code: "EN" },
  });

  const arabic = await prisma.language.upsert({
    where: { code: "AR" },
    update: {},
    create: { name: "Arabic", code: "AR" },
  });

  const levels = [
    { languageId: english.id, name: "Beginner A1", code: "EN-A1", order: 1, price: 200 },
    { languageId: english.id, name: "Elementary A2", code: "EN-A2", order: 2, price: 250 },
    { languageId: english.id, name: "Intermediate B1", code: "EN-B1", order: 3, price: 300 },
    { languageId: english.id, name: "Upper Intermediate B2", code: "EN-B2", order: 4, price: 350 },
    { languageId: english.id, name: "Advanced C1", code: "EN-C1", order: 5, price: 400 },
    { languageId: arabic.id, name: "Beginner A1", code: "AR-A1", order: 1, price: 200 },
    { languageId: arabic.id, name: "Elementary A2", code: "AR-A2", order: 2, price: 250 },
    { languageId: arabic.id, name: "Intermediate B1", code: "AR-B1", order: 3, price: 300 },
  ];

  for (const lv of levels) {
    await prisma.level.upsert({
      where: { id: lv.code },
      update: lv,
      create: { id: lv.code, ...lv },
    });
  }

  const course = await prisma.course.upsert({
    where: { code: "EN-BEGINNER-2026" },
    update: {},
    create: {
      languageId: english.id,
      levelId: "EN-A1",
      name: "English Beginner Course",
      code: "EN-BEGINNER-2026",
      description: "Complete beginner course for English learners",
      maxStudents: 25,
      registrationOpen: true,
      registrationStart: new Date("2026-01-01"),
      registrationEnd: new Date("2026-12-31"),
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@lingua.com" },
    update: {},
    create: { name: "John Teacher", email: "teacher@lingua.com", password: adminPassword, role: "Teacher" },
  });

  const teacher = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, specialization: "English", hourlyRate: 30 },
  });

  const group = await prisma.classGroup.upsert({
    where: { id: "group-1" },
    update: {},
    create: {
      id: "group-1",
      courseId: course.id,
      name: "Group A - Morning",
      teacherId: teacher.id,
      room: "Room 101",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
      maxCapacity: 20,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@lingua.com" },
    update: {},
    create: { name: "Jane Student", email: "student@lingua.com", password: adminPassword, role: "Student" },
  });

  const student = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, dateOfBirth: new Date("2000-01-01") },
  });

  console.log("Seed completed:");
  console.log(`  Super Admin: admin@lingua.com / admin123`);
  console.log(`  Admin Staff: admin.staff@lingua.com / admin123`);
  console.log(`  Teacher: teacher@lingua.com / admin123`);
  console.log(`  Student: student@lingua.com / admin123`);
  console.log(`  Languages: ${english.name}, ${arabic.name}`);
  console.log(`  Course: ${course.name}`);
  console.log(`  Group: ${group.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
