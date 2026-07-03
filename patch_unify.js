const fs = require('fs');
const path = require('path');

// 1. Patch StationTesting.tsx
const stationPath = path.join(__dirname, 'src', 'pages', 'StationTesting.tsx');
let stationContent = fs.readFileSync(stationPath, 'utf-8');
stationContent = stationContent.replace(/\r\n/g, '\n');

stationContent = stationContent.replace(
  `if (completedCount >= 3) return 'Hoàn thành bài thi';`,
  `if (displayedTestTypes.length > 0 && completedCount >= displayedTestTypes.length) return 'Hoàn thành bài thi';`
);

stationContent = stationContent.replace(
  `if (completedCount >= 3) {`,
  `if (displayedTestTypes.length > 0 && completedCount >= displayedTestTypes.length) {`
);

fs.writeFileSync(stationPath, stationContent, 'utf-8');
console.log('Patched StationTesting.tsx');

// 2. Patch ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

// Add state variables
reportsContent = reportsContent.replace(
  `  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);`,
  `  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);`
);

// Update fetchData
reportsContent = reportsContent.replace(
  `      const [studentsRes, coursesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}\`),
        axios.get(\`\${API_BASE_URL}/api/manager/courses\`)
      ]);
      setStudents(studentsRes.data.students || []);
      setCourses(coursesRes.data || []);`,
  `      const [studentsRes, coursesRes, testTypesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}\`),
        axios.get(\`\${API_BASE_URL}/api/manager/courses\`),
        axios.get(\`\${API_BASE_URL}/api/manager/test-types\`)
      ]);
      setStudents(studentsRes.data.students || []);
      setAssignments(studentsRes.data.assignments || []);
      setCourses(coursesRes.data || []);
      setTestTypes(testTypesRes.data || []);`
);

// Add displayedTestTypes
reportsContent = reportsContent.replace(
  `  const getStudentReport = (student: any) => {`,
  `  const displayedTestTypes = useMemo(() => {
    const assignedIds = new Set(assignments.map((a: any) => a.testTypeId));
    return testTypes.filter(tt => assignedIds.has(tt.id));
  }, [testTypes, assignments]);

  const getStudentReport = (student: any, activeTestTypes: any[]) => {`
);

// Replace getStudentReport body
const oldGetStudentReport = `    const trs = student.testResults || [];
    const completedCount = trs.filter((tr: any) => ['TRANSFERRED', 'ABSENT', 'FINISHED'].includes(tr.status)).length;
    
    let isFail = false;
    let isAbsent = false;
    
    let scoreSaHinh = '-';
    let scoreChuZ = '-';
    let scoreDuongTruong = '-';
    
    trs.forEach((tr: any) => {
      const name = tr.testType?.name?.toLowerCase() || '';
      let scoreVal: number | string = '-';
      
      if (tr.status === 'ABSENT') {
        scoreVal = 'Vắng';
        isAbsent = true;
      } else if (tr.status === 'IN_PROGRESS') {
        scoreVal = 'Đang thi';
      } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
        scoreVal = tr.totalScore;
        if (tr.totalScore < 80) isFail = true;
        if (tr.status === 'FAILED') isFail = true; // Legacy support
      }
      
      if (name.includes('sa hình')) scoreSaHinh = scoreVal as any;
      if (name.includes('chữ z')) scoreChuZ = scoreVal as any;
      if (name.includes('đường trường')) scoreDuongTruong = scoreVal as any;
    });

    let finalStatus = '';
    if (isAbsent) finalStatus = 'VẮNG';
    else if (isFail) finalStatus = 'RỚT';
    else if (completedCount >= 3) finalStatus = 'ĐẬU';
    else finalStatus = 'CHƯA HOÀN THÀNH';

    return {
      ...student,
      scoreSaHinh,
      scoreChuZ,
      scoreDuongTruong,
      finalStatus
    };`;

const newGetStudentReport = `    const trs = student.testResults || [];
    let isFail = false;
    let isAbsent = false;
    let completedCount = 0;
    
    const scores: any = {};
    
    activeTestTypes.forEach((tt: any) => {
      const tr = trs.find((t: any) => t.testTypeId === tt.id);
      if (!tr) {
         scores[tt.id] = '-';
      } else {
        let scoreVal: number | string = '-';
        if (tr.status === 'ABSENT') {
          scoreVal = 'Vắng';
          isAbsent = true;
          completedCount++;
        } else if (tr.status === 'IN_PROGRESS') {
          scoreVal = 'Đang thi';
        } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
          scoreVal = tr.totalScore;
          completedCount++;
          if (tr.totalScore < 80) isFail = true;
          if (tr.status === 'FAILED') isFail = true;
        }
        scores[tt.id] = scoreVal;
      }
    });

    let finalStatus = '';
    if (isAbsent) finalStatus = 'VẮNG';
    else if (isFail) finalStatus = 'RỚT';
    else if (activeTestTypes.length > 0 && completedCount >= activeTestTypes.length) finalStatus = 'ĐẬU';
    else finalStatus = 'CHƯA HOÀN THÀNH';

    return {
      ...student,
      scores,
      finalStatus
    };`;

reportsContent = reportsContent.replace(oldGetStudentReport, newGetStudentReport);

// Update processedStudents
reportsContent = reportsContent.replace(
  `const processedStudents = useMemo(() => students.map(getStudentReport), [students]);`,
  `const processedStudents = useMemo(() => students.map(s => getStudentReport(s, displayedTestTypes)), [students, displayedTestTypes]);`
);

// Update exportToExcel
const oldExport = `    const dataForExcel = filteredStudents.map((s, index) => ({
      'STT': index + 1,
      'Họ và Tên': s.name,
      'CCCD': s.cccd,
      'Khóa đào tạo': s.courseName || (s.course && s.course.name) || '-',
      'Sa hình': s.scoreSaHinh,
      'Hình chữ Z': s.scoreChuZ,
      'Đường trường': s.scoreDuongTruong,
      'Kết quả': s.finalStatus
    }));`;

const newExport = `    const dataForExcel = filteredStudents.map((s, index) => {
      const row: any = {
        'STT': index + 1,
        'Họ và Tên': s.name,
        'CCCD': s.cccd,
        'Khóa đào tạo': s.courseName || (s.course && s.course.name) || '-',
      };
      displayedTestTypes.forEach(tt => {
        row[tt.name] = s.scores[tt.id];
      });
      row['Kết quả'] = s.finalStatus;
      return row;
    });`;

reportsContent = reportsContent.replace(oldExport, newExport);

// Update table headers
const oldHeaders = `                  <th style={{ textAlign: 'center' }}>Sa hình</th>
                  <th style={{ textAlign: 'center' }}>Hình chữ Z</th>
                  <th style={{ textAlign: 'center' }}>Đường trường</th>`;
const newHeaders = `                  {displayedTestTypes.map(tt => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}`;
reportsContent = reportsContent.replace(oldHeaders, newHeaders);

// Update table cells
const oldCells = `                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreSaHinh}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreChuZ}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreDuongTruong}</td>`;
const newCells = `                    {displayedTestTypes.map(tt => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scores[tt.id]}</td>
                    ))}`;
reportsContent = reportsContent.replace(oldCells, newCells);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched ReportsManager.tsx');
