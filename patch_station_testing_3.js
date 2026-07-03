const fs = require('fs');
const path = require('path');

const stationPath = path.join(__dirname, 'src', 'pages', 'StationTesting.tsx');
let stationContent = fs.readFileSync(stationPath, 'utf-8');
stationContent = stationContent.replace(/\r\n/g, '\n');

stationContent = stationContent.replace(
  `<span>Đã chuyển điểm ({transferredCount}/3 trạm)</span>`,
  `<span>Đã chuyển điểm ({transferredCount}/{displayedTestTypes.length || 3} trạm)</span>`
);

fs.writeFileSync(stationPath, stationContent, 'utf-8');
console.log('Patched StationTesting.tsx hardcoded 3 trạm');
