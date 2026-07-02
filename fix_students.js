const fs = require('fs');
let content = fs.readFileSync('api/routes/manager.ts', 'utf8');

const regex = /^\s*try \{\n\s*await prisma\.student\.deleteMany\(\{ where: \{ id: \{ in: ids\.map\(\(id: any\) => Number\(id\)\) \} \} \}\);\n\n\n/gm;
content = content.replace(regex, '\n\n');

fs.writeFileSync('api/routes/manager.ts', content);
