const fs = require('fs');
let content = fs.readFileSync('api/routes/manager.ts', 'utf8');

const regex1 = /^\s*await prisma\.exam\.delete\(\{ where: \{ id: Number\(req\.params\.id\) \} \}\);\n\n\n/gm;
content = content.replace(regex1, '\n\n');

const regex2 = /^\s*for \(const exam of exams\) \{\n\s*await prisma\.criterion\.deleteMany\(\{ where: \{ examId: exam\.id \} \}\);\n\s*\}\n\s*await prisma\.exam\.deleteMany\(\{ where: \{ testTypeId \} \}\);\n\s*await prisma\.testType\.delete\(\{ where: \{ id: testTypeId \} \}\);\n\n\n/gm;
content = content.replace(regex2, '\n\n');

const regex3 = /^export default router;\n/gm;
content = content.replace(regex3, ''); // remove duplicate

fs.writeFileSync('api/routes/manager.ts', content + '\nexport default router;\n');
