const fs = require('fs');
const files = [
  'src/pages/CourseManager.tsx',
  'src/pages/ExaminerDashboard.tsx',
  'src/pages/StudentManager.tsx',
  'src/pages/TestTypeManager.tsx',
  'src/pages/UserManager.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import toast')) {
    content = content.replace(/import \{/, 'import toast from \'react-hot-toast\';\nimport {');
  }

  // Replace alert
  content = content.replace(/alert\((['"])(.*?)(['"])\)/g, (match, p1, p2, p3) => {
      const lower = p2.toLowerCase();
      if (lower.includes('lỗi') || lower.includes('không thể') || lower.includes('cảnh báo') || lower.includes('file không')) {
          return `toast.error(${p1}${p2}${p3})`;
      }
      return `toast.success(${p1}${p2}${p3})`;
  });
  
  content = content.replace(/alert\((e\.response[^)]*\|\|[^)]*)\)/g, 'toast.error($1)');
  
  // Custom toast logic for the string templates like import success
  content = content.replace(/alert\(`(.*?)`\)/s, (match, p1) => {
     if (p1.includes('Thất bại')) return `toast('${p1.replace(/\n/g, '\\n')}', { icon: 'ℹ️' })`;
     return `toast.success(\`${p1}\`)`;
  });

  fs.writeFileSync(file, content);
}
console.log('done');
