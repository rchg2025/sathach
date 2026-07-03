const fs = require('fs');
const path = require('path');

// 1. Patch ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

reportsContent = reportsContent.replace(
  `<PrintTemplate students={printStudents} />`,
  `<PrintTemplate students={printStudents} testTypes={displayedTestTypes} />`
);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched ReportsManager.tsx for PrintTemplate');

// 2. Patch PrintTemplate.tsx
const printPath = path.join(__dirname, 'src', 'components', 'PrintTemplate.tsx');
let printContent = fs.readFileSync(printPath, 'utf-8');
printContent = printContent.replace(/\r\n/g, '\n');

const oldInterface = `interface PrintTemplateProps {
  students: any[];
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ students }) => {`;

const newInterface = `interface PrintTemplateProps {
  students: any[];
  testTypes?: any[];
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ students, testTypes = [] }) => {`;

printContent = printContent.replace(oldInterface, newInterface);

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

printContent = printContent.replace(oldResultsTable, newResultsTable);

const oldTableRows = `              <tbody>
                <tr>
                  <td>1</td>
                  <td className="text-left">Thực hành lái xe trong hình</td>
                  <td>100<br/>Kết quả ≥ 80: Đạt</td>
                  <td>{diemTruSaHinh}</td>
                  <td>{saHinhScore}</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td className="text-left">Thực hành tiến lùi chữ chi</td>
                  <td>100<br/>Kết quả ≥ 80: Đạt</td>
                  <td>{diemTruChuZ}</td>
                  <td>{chuZScore}</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td className="text-left">Thực hành lái xe trên đường</td>
                  <td>100<br/>Kết quả ≥ 80: Đạt</td>
                  <td>{diemTruDuongTruong}</td>
                  <td>{duongTruongScore}</td>
                </tr>
              </tbody>`;

const newTableRows = `              <tbody>
                {testTypes.map((tt: any, index: number) => {
                  const scoreVal = student.scores && student.scores[tt.id] !== '-' ? student.scores[tt.id] : '';
                  const maxScore = tt.maxScore || 100;
                  const passingScore = tt.passingScore || 80;
                  const diemTru = getDiemTru(maxScore, scoreVal);
                  return (
                    <tr key={tt.id}>
                      <td>{index + 1}</td>
                      <td className="text-left">Thực hành tại trạm {tt.name}</td>
                      <td>{maxScore}<br/>Kết quả ≥ {passingScore}: Đạt</td>
                      <td>{diemTru}</td>
                      <td>{scoreVal}</td>
                    </tr>
                  );
                })}
                {testTypes.length === 0 && (
                  <tr><td colSpan={5}>Không có dữ liệu trạm thi</td></tr>
                )}
              </tbody>`;

printContent = printContent.replace(oldTableRows, newTableRows);

fs.writeFileSync(printPath, printContent, 'utf-8');
console.log('Patched PrintTemplate.tsx');
