const fs = require('fs');
const path = require('path');

// 1. Patch ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

reportsContent = reportsContent.replace(
  `<PrintErrorTemplate students={printStudents} />`,
  `<PrintErrorTemplate students={printStudents} testTypes={displayedTestTypes} />`
);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched ReportsManager.tsx for PrintErrorTemplate');


// 2. Patch PrintErrorTemplate.tsx
const printErrorPath = path.join(__dirname, 'src', 'components', 'PrintErrorTemplate.tsx');
let printErrorContent = fs.readFileSync(printErrorPath, 'utf-8');
printErrorContent = printErrorContent.replace(/\r\n/g, '\n');

const oldInterface = `interface PrintErrorTemplateProps {
  students: any[];
}

const PrintErrorTemplate: React.FC<PrintErrorTemplateProps> = ({ students }) => {`;

const newInterface = `interface PrintErrorTemplateProps {
  students: any[];
  testTypes?: any[];
}

const PrintErrorTemplate: React.FC<PrintErrorTemplateProps> = ({ students, testTypes = [] }) => {`;

printErrorContent = printErrorContent.replace(oldInterface, newInterface);

const oldResultsTable = `        // Safe check for results
        const saHinhScore = student.scoreSaHinh !== '-' ? student.scoreSaHinh : '';
        const chuZScore = student.scoreChuZ !== '-' ? student.scoreChuZ : '';
        const duongTruongScore = student.scoreDuongTruong !== '-' ? student.scoreDuongTruong : '';

        // Calculate "Điểm trừ" - assuming max score is 100 for Sa Hình, Đường Trường and 100 for Chữ Z based on UI
        const getDiemTru = (max: number, score: any) => {
          if (score === 'Vắng') return 'Vắng';
          if (score === 'Đang thi') return '';
          if (score === '' || score === '-') return '';
          const num = Number(score);
          if (!isNaN(num)) return max - num;
          return '';
        };

        const diemTruSaHinh = getDiemTru(100, saHinhScore);
        const diemTruChuZ = getDiemTru(100, chuZScore);
        const diemTruDuongTruong = getDiemTru(100, duongTruongScore);

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';`;

const newResultsTable = `        const getDiemTru = (max: number, score: any) => {
          if (score === 'Vắng') return 'Vắng';
          if (score === 'Đang thi') return '';
          if (score === '' || score === '-') return '';
          const num = Number(score);
          if (!isNaN(num)) return max - num;
          return '';
        };

        const isDat = student.finalStatus === 'ĐẬU';
        const isKhongDat = student.finalStatus === 'RỚT';`;

printErrorContent = printErrorContent.replace(oldResultsTable, newResultsTable);

const oldTableRows = `            <table className="summary-table">
              <tbody>
                <tr>
                  <td>Điểm trừ Trạm Sa hình: <strong>{diemTruSaHinh}</strong></td>
                  <td>Điểm còn lại: <strong>{scoreSaHinh}</strong></td>
                </tr>
                <tr>
                  <td>Điểm trừ Trạm Hình chữ Z: <strong>{diemTruChuZ}</strong></td>
                  <td>Điểm còn lại: <strong>{scoreChuZ}</strong></td>
                </tr>
                <tr>
                  <td>Điểm trừ Trạm Đường trường: <strong>{diemTruDuongTruong}</strong></td>
                  <td>Điểm còn lại: <strong>{scoreDuongTruong}</strong></td>
                </tr>
              </tbody>
            </table>`;

const newTableRows = `            <table className="summary-table">
              <tbody>
                {testTypes.map((tt: any) => {
                  const scoreVal = student.scores && student.scores[tt.id] !== '-' ? student.scores[tt.id] : '';
                  const maxScore = tt.maxScore || 100;
                  const diemTru = getDiemTru(maxScore, scoreVal);
                  return (
                    <tr key={tt.id}>
                      <td>Điểm trừ {tt.name}: <strong>{diemTru}</strong></td>
                      <td>Điểm còn lại: <strong>{scoreVal}</strong></td>
                    </tr>
                  );
                })}
                {testTypes.length === 0 && (
                  <tr><td colSpan={2}>Không có dữ liệu trạm thi</td></tr>
                )}
              </tbody>
            </table>`;

printErrorContent = printErrorContent.replace(oldTableRows, newTableRows);

fs.writeFileSync(printErrorPath, printErrorContent, 'utf-8');
console.log('Patched PrintErrorTemplate.tsx');
