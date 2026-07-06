const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const targetStr = `/* Pagination Wrapper */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}`;

const replaceStr = `/* Pagination Wrapper */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 10px;
}`;

content = content.replace(targetStr, replaceStr);
content = content.replace('.pagination-wrapper { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }', '');

fs.writeFileSync('src/index.css', content, 'utf8');
console.log('done');
