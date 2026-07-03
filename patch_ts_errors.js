const fs = require('fs');
const path = require('path');

const printErrorPath = path.join(__dirname, 'src', 'components', 'PrintErrorTemplate.tsx');
let printErrorContent = fs.readFileSync(printErrorPath, 'utf-8');
printErrorContent = printErrorContent.replace(/\r\n/g, '\n');

// Find and remove scoreSaHinh, scoreChuZ, scoreDuongTruong
const oldLinesToRemove = `        const saHinhScore = student.scoreSaHinh !== '-' ? student.scoreSaHinh : '';
        const chuZScore = student.scoreChuZ !== '-' ? student.scoreChuZ : '';
        const duongTruongScore = student.scoreDuongTruong !== '-' ? student.scoreDuongTruong : '';`;

printErrorContent = printErrorContent.replace(oldLinesToRemove, '');

// The getDiemTru is defined inside the map, let's make sure it's accessible or defined correctly.
// Let's just fix the whole file by rewriting it cleanly.
fs.writeFileSync(printErrorPath, printErrorContent, 'utf-8');
console.log('Removed unused vars');
