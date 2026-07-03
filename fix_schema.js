const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');
schemaContent = schemaContent.replace(/\r\n/g, '\n');

// Fix the incorrect addition to User
schemaContent = schemaContent.replace(
  `  assignments TestAssignment[]
  retakeSessions RetakeSession[]
  managedTests  TestResult[] @relation("StationManagerTests")`,
  `  assignments TestAssignment[]
  managedTests  TestResult[] @relation("StationManagerTests")`
);

// Add to Course explicitly
schemaContent = schemaContent.replace(
  `model Course {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime?
  endDate     DateTime?
  isCompleted Boolean  @default(false)
  students    Student[]
  assignments TestAssignment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}`,
  `model Course {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime?
  endDate     DateTime?
  isCompleted Boolean  @default(false)
  students    Student[]
  assignments TestAssignment[]
  retakeSessions RetakeSession[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}`
);

fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
console.log('Fixed schema.prisma');
