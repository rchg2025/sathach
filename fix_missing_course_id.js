const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: {
      courseId: null,
      courseName: {
        not: null
      }
    }
  });
  
  let count = 0;
  for (const student of students) {
    const course = await prisma.course.findFirst({
      where: { name: student.courseName }
    });
    
    if (course) {
      await prisma.student.update({
        where: { id: student.id },
        data: { courseId: course.id }
      });
      count++;
    }
  }
  
  console.log(`Updated ${count} students with missing courseId.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
