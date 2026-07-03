const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');
schemaContent = schemaContent.replace(/\r\n/g, '\n');

// Remove @@unique([studentId, testTypeId])
schemaContent = schemaContent.replace(
  `  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([studentId, testTypeId])
}`,
  `  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}`
);

// Add RetakeSession model at the end
if (!schemaContent.includes('model RetakeSession')) {
  schemaContent += `

model RetakeSession {
  id             Int      @id @default(autoincrement())
  studentId      Int
  student        Student  @relation(fields: [studentId], references: [id])
  targetCourseId Int
  targetCourse   Course   @relation(fields: [targetCourseId], references: [id])
  createdAt      DateTime @default(now())
  
  @@unique([studentId, targetCourseId])
}
`;
}

// Ensure Course model has retakeSessions
if (!schemaContent.includes('retakeSessions RetakeSession[]')) {
  schemaContent = schemaContent.replace(
    `  assignments TestAssignment[]`,
    `  assignments TestAssignment[]
  retakeSessions RetakeSession[]`
  );
}

// Ensure Student model has retakeSessions
if (!schemaContent.includes('retakeSessions RetakeSession[]')) {
  schemaContent = schemaContent.replace(
    `  testResults       TestResult[]`,
    `  testResults       TestResult[]
  retakeSessions    RetakeSession[]`
  );
}

fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
console.log('Patched schema.prisma');
