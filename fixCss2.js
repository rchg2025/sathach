const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(
  /\/\* Pagination Wrapper \*\/\r?\n\.pagination-wrapper \{\r?\n  display: flex;\r?\n  justify-content: space-between;\r?\n  align-items: center;\r?\n  flex-wrap: wrap;\r?\n  gap: 1rem;\r?\n\}/,
  `/* Pagination Wrapper */\n.pagination-wrapper {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 1rem;\n  padding: 10px;\n}`
);

fs.writeFileSync('src/index.css', content, 'utf8');
console.log('done');
