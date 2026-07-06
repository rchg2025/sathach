const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');

  // Check if it uses Pagination
  if (!content.includes('<Pagination')) continue;

  // We need to figure out what the "totalItems" array/variable is called.
  // Usually it's in a Math.ceil(xyz.length / itemsPerPage) line.
  const totalPagesRegex = /totalPages\s*=\s*Math\.ceil\((.*?)\.length\s*\/\s*itemsPerPage\)/;
  const match = content.match(totalPagesRegex);
  
  let listName = '[]';
  if (match) {
    listName = match[1];
  } else {
    // If not found this way, maybe look for `.length` before `/ itemsPerPage`
    const altRegex = /Math\.ceil\((.*?)\.length\s*\/\s*itemsPerPage\)/;
    const altMatch = content.match(altRegex);
    if (altMatch) listName = altMatch[1];
  }

  // Add totalItems and itemsPerPage to Pagination
  if (listName !== '[]' && listName) {
    content = content.replace(
      /<Pagination\s+currentPage=\{currentPage\}\s+totalPages=\{totalPages\}\s+onPageChange=\{([a-zA-Z0-9_]+)\}\s*\/>/g,
      `<Pagination \n                currentPage={currentPage}\n                totalPages={totalPages}\n                onPageChange={$1}\n                totalItems={${listName}.length}\n                itemsPerPage={itemsPerPage}\n              />`
    );
  }

  // Remove manually added text-muted tags in StudentManager and UserManager
  if (file === 'StudentManager.tsx') {
    content = content.replace(/<span className="text-muted">[\s\S]*?<\/span>/, '');
  }
  if (file === 'UserManager.tsx') {
    content = content.replace(/<div className="text-muted text-center mb-3"[\s\S]*?<\/div>/, '');
  }

  fs.writeFileSync(path.join(pagesDir, file), content, 'utf8');
}
console.log('Pages updated');
