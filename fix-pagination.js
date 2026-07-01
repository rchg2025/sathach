const fs = require('fs');
const path = require('path');

const cssContent = `
/* Pagination Wrapper */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
@media (max-width: 768px) {
  .pagination-wrapper {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .pagination-wrapper > div {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 5px;
  }
}
`;

fs.appendFileSync('src/index.css', cssContent);

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern 1: standard
  const pat1 = '<div className="flex justify-between items-center mt-4">';
  if (content.includes(pat1)) {
    content = content.replaceAll(pat1, '<div className="pagination-wrapper mt-4">');
    changed = true;
  }

  // Pattern 2: UserManager
  const pat2 = '<div style={{ padding: \'1rem\', display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', borderTop: \'1px solid var(--border)\' }}>';
  if (content.includes(pat2)) {
    content = content.replaceAll(pat2, '<div className="pagination-wrapper" style={{ padding: \'1rem\', borderTop: \'1px solid var(--border)\' }}>');
    changed = true;
  }
  
  // Make sure pagination items can wrap
  const pat3 = '<div className="pagination flex" style={{ gap: \'0.5rem\' }}>';
  if (content.includes(pat3)) {
    content = content.replaceAll(pat3, '<div className="pagination flex" style={{ gap: \'0.5rem\', flexWrap: \'wrap\', justifyContent: \'center\' }}>');
    changed = true;
  }
  
  const pat4 = '<div style={{ display: \'flex\', gap: \'5px\' }}>';
  if (content.includes(pat4) && filePath.includes('UserManager.tsx')) {
    content = content.replaceAll(pat4, '<div style={{ display: \'flex\', gap: \'5px\', flexWrap: \'wrap\', justifyContent: \'center\' }}>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
