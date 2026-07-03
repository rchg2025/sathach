const fs = require('fs');
const path = require('path');

const printErrorPath = path.join(__dirname, 'src', 'components', 'PrintErrorTemplate.tsx');
let printErrorContent = fs.readFileSync(printErrorPath, 'utf-8');
printErrorContent = printErrorContent.replace(/\r\n/g, '\n');

// The original map body starts at `      {students.map((student) => {`
// Let's replace the logic inside the map

const startPattern = `      {students.map((student) => {
        // Collect errors
        const trs = student.testResults || [];
        const errorList: any[] = [];
        let diemTruSaHinh = 0;
        let diemTruChuZ = 0;
        let diemTruDuongTruong = 0;

        let scoreSaHinh = student.scoreSaHinh;
        let scoreChuZ = student.scoreChuZ;
        let scoreDuongTruong = student.scoreDuongTruong;

        trs.forEach((tr: any) => {
          const testName = tr.testType?.name || 'Chưa rõ';
          const testNameLower = testName.toLowerCase();
          
          if (tr.scores && tr.scores.length > 0) {
            tr.scores.forEach((sc: any) => {
              if (sc.criterion) {
                const deduction = (sc.criterion.pointsToDeduct || 0) * (sc.timesDeducted || 1);
                errorList.push({
                  testName,
                  errorName: sc.criterion.name,
                  deduction
                });

                if (testNameLower.includes('sa hình')) diemTruSaHinh += deduction;
                if (testNameLower.includes('chữ z')) diemTruChuZ += deduction;
                if (testNameLower.includes('đường trường')) diemTruDuongTruong += deduction;
              }
            });
          }
        });

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';`;

const newMapBody = `      {students.map((student) => {
        // Collect errors
        const trs = student.testResults || [];
        const errorList: any[] = [];
        
        trs.forEach((tr: any) => {
          const testName = tr.testType?.name || 'Chưa rõ';
          
          if (tr.scores && tr.scores.length > 0) {
            tr.scores.forEach((sc: any) => {
              if (sc.criterion) {
                const deduction = (sc.criterion.pointsToDeduct || 0) * (sc.timesDeducted || 1);
                errorList.push({
                  testName,
                  errorName: sc.criterion.name,
                  deduction
                });
              }
            });
          }
        });

        const getDiemTru = (max: number, score: any) => {
          if (score === 'Vắng') return 'Vắng';
          if (score === 'Đang thi') return '';
          if (score === '' || score === '-') return '';
          const num = Number(score);
          if (!isNaN(num)) return max - num;
          return '';
        };

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';`;

printErrorContent = printErrorContent.replace(startPattern, newMapBody);

fs.writeFileSync(printErrorPath, printErrorContent, 'utf-8');
console.log('Fixed TS errors in PrintErrorTemplate');
