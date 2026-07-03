const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'pages', 'StationTesting.tsx');
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/\r\n/g, '\n');

// 1. Add testTypes state
uiContent = uiContent.replace(
  "const [vehicles, setVehicles] = useState<any[]>([]);",
  "const [vehicles, setVehicles] = useState<any[]>([]);\n  const [testTypes, setTestTypes] = useState<any[]>([]);"
);

// 2. Fetch testTypes
uiContent = uiContent.replace(
  `      const [studentsRes, vehiclesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}\`),
        axios.get(\`\${API_BASE_URL}/api/manager/vehicle-types\`)
      ]);
      setStudents(studentsRes.data.students);
      setAssignments(studentsRes.data.assignments);
      setVehicles(vehiclesRes.data.filter((v: any) => v.isActive));`,
  `      const [studentsRes, vehiclesRes, testTypesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}\`),
        axios.get(\`\${API_BASE_URL}/api/manager/vehicle-types\`),
        axios.get(\`\${API_BASE_URL}/api/manager/test-types\`)
      ]);
      setStudents(studentsRes.data.students);
      setAssignments(studentsRes.data.assignments);
      setVehicles(vehiclesRes.data.filter((v: any) => v.isActive));
      setTestTypes(testTypesRes.data);`
);

// 3. Dynamic Headers
uiContent = uiContent.replace(
  `                  <th style={{ textAlign: 'center' }}>Sa hình</th>
                  <th style={{ textAlign: 'center' }}>Hình chữ Z</th>
                  <th style={{ textAlign: 'center' }}>Đường trường</th>`,
  `                  {testTypes.map((tt: any) => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}`
);

// 4. Dynamic Cells
const hardcodedCells = `                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {(() => {
                        const tr = s.testResults?.find((t: any) => t.testType?.name?.toLowerCase().includes('sa hình'));
                        if (!tr) return '-';
                        if ((user?.role !== 'ADMIN' && user?.username !== 'quantri') && (user?.role !== 'MANAGER' && user?.username !== 'quantri')) {
                          const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                        }
                        if (tr.status === 'ABSENT') return <span className="text-muted">Vắng</span>;
                        return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                      })()}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {(() => {
                        const tr = s.testResults?.find((t: any) => t.testType?.name?.toLowerCase().includes('chữ z'));
                        if (!tr) return '-';
                        if ((user?.role !== 'ADMIN' && user?.username !== 'quantri') && (user?.role !== 'MANAGER' && user?.username !== 'quantri')) {
                          const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                        }
                        if (tr.status === 'ABSENT') return <span className="text-muted">Vắng</span>;
                        return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                      })()}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {(() => {
                        const tr = s.testResults?.find((t: any) => t.testType?.name?.toLowerCase().includes('đường trường'));
                        if (!tr) return '-';
                        if ((user?.role !== 'ADMIN' && user?.username !== 'quantri') && (user?.role !== 'MANAGER' && user?.username !== 'quantri')) {
                          const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                        }
                        if (tr.status === 'ABSENT') return <span className="text-muted">Vắng</span>;
                        return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                      })()}
                    </td>`;

const dynamicCells = `                    {testTypes.map((tt: any) => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {(() => {
                          const tr = s.testResults?.find((t: any) => t.testTypeId === tt.id);
                          if (!tr) return '-';
                          if ((user?.role !== 'ADMIN' && user?.username !== 'quantri') && (user?.role !== 'MANAGER' && user?.username !== 'quantri')) {
                            const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                            if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                          }
                          if (tr.status === 'ABSENT') return <span className="text-muted">Vắng</span>;
                          return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                        })()}
                      </td>
                    ))}`;

uiContent = uiContent.replace(hardcodedCells, dynamicCells);

fs.writeFileSync(uiPath, uiContent, 'utf-8');
console.log('Patched StationTesting.tsx dynamic test types');
