const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'StationTesting.tsx');
// Restore from git to ensure clean state
const { execSync } = require('child_process');
execSync('git checkout src/pages/StationTesting.tsx', { cwd: __dirname });

let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings to \n for both file content and my template strings
content = content.replace(/\r\n/g, '\n');

function normalizeEndings(str) {
  return str.replace(/\r\n/g, '\n');
}

// 1. Add availableAssignments state
content = content.replace(
  "const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);",
  "const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);\n  const [availableAssignments, setAvailableAssignments] = useState<any[]>([]);"
);

// 2. openStartTestModal
content = content.replace(
  normalizeEndings(`  const openStartTestModal = (student: any) => {
    // Determine the testType based on assignments matching this student's course
    const studentAssignment = assignments.find(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignment) {
      toast.error('Không tìm thấy bài thi được phân công cho khóa này');
      return;
    }
    
    setSelectedStudent(student);
    setSelectedAssignment(studentAssignment);
    setSelectedTestType(studentAssignment.testType);
    setSelectedVehicleId(null);
    setIsModalOpen(true);
  };`),
  normalizeEndings(`  const openStartTestModal = (student: any) => {
    const studentAssignments = assignments.filter(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignments || studentAssignments.length === 0) {
      toast.error('Không tìm thấy bài thi được phân công cho khóa này');
      return;
    }
    
    const unstartedAssignments = studentAssignments.filter(a => {
      const tr = student.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
      return !tr || tr.status === 'Chưa thi';
    });
    
    if (unstartedAssignments.length === 0) {
       toast.error('Học viên đã hoàn thành hoặc đang thi tất cả bài thi được phân công');
       return;
    }

    setSelectedStudent(student);
    setAvailableAssignments(unstartedAssignments);
    setSelectedAssignment(unstartedAssignments[0]);
    setSelectedTestType(unstartedAssignments[0].testType);
    setSelectedVehicleId(null);
    setIsModalOpen(true);
  };`)
);

// 3. handleEndTest
content = content.replace(
  normalizeEndings(`  const handleEndTest = async (student: any) => {
    const studentAssignment = assignments.find(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignment) return toast.error('Không tìm thấy bài thi phân công');

    try {
      await axios.post(\`\${API_BASE_URL}/api/manager/station/end-test\`, {
        studentId: student.id,
        testTypeId: studentAssignment.testType?.id
      });
      toast.success('Kết thúc và chuyển điểm thành công.');
      
      // Update local state to reflect TRANSFERRED
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          const trIndex = newTestResults.findIndex(tr => tr.testTypeId === studentAssignment.testType?.id);
          if (trIndex > -1) {
            newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'TRANSFERRED' };
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi kết thúc thi');
    }
  };`),
  normalizeEndings(`  const handleEndTest = async (student: any) => {
    const inProgressTr = student.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (!inProgressTr) return toast.error('Không tìm thấy bài thi đang diễn ra');

    try {
      await axios.post(\`\${API_BASE_URL}/api/manager/station/end-test\`, {
        studentId: student.id,
        testTypeId: inProgressTr.testTypeId
      });
      toast.success('Kết thúc và chuyển điểm thành công.');
      
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          const trIndex = newTestResults.findIndex(tr => tr.testTypeId === inProgressTr.testTypeId);
          if (trIndex > -1) {
            newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'TRANSFERRED' };
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi kết thúc thi');
    }
  };`)
);

// 4. handleMarkAbsent
content = content.replace(
  normalizeEndings(`  const handleMarkAbsent = async (student: any) => {
    const studentAssignment = assignments.find(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignment) return toast.error('Không tìm thấy bài thi phân công');

    try {
      await axios.post(\`\${API_BASE_URL}/api/manager/station/mark-absent\`, {
        studentId: student.id,
        testTypeId: studentAssignment.testType?.id,
        stationManagerId: user?.id
      });
      toast.success('Đã đánh dấu vắng thành công.');
      
      // Update local state to reflect ABSENT
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          const trIndex = newTestResults.findIndex(tr => tr.testTypeId === studentAssignment.testType?.id);
          if (trIndex > -1) {
            newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'ABSENT', totalScore: 0 };
          } else {
            newTestResults.push({ testTypeId: studentAssignment.testType?.id, status: 'ABSENT', totalScore: 0 });
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi đánh dấu vắng');
    }
  };`),
  normalizeEndings(`  const handleMarkAbsent = async (student: any) => {
    const studentAssignments = assignments.filter(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    
    const unstartedAssignments = studentAssignments.filter(a => {
      const tr = student.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
      return !tr || tr.status === 'Chưa thi';
    });

    if (unstartedAssignments.length === 0) return toast.error('Không tìm thấy bài thi chưa bắt đầu');

    try {
      for (const assignment of unstartedAssignments) {
        await axios.post(\`\${API_BASE_URL}/api/manager/station/mark-absent\`, {
          studentId: student.id,
          testTypeId: assignment.testType?.id,
          stationManagerId: user?.id
        });
      }
      toast.success('Đã đánh dấu vắng thành công.');
      
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          for (const assignment of unstartedAssignments) {
            const trIndex = newTestResults.findIndex(tr => tr.testTypeId === assignment.testType?.id);
            if (trIndex > -1) {
              newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'ABSENT', totalScore: 0 };
            } else {
              newTestResults.push({ testTypeId: assignment.testType?.id, status: 'ABSENT', totalScore: 0 });
            }
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi đánh dấu vắng');
    }
  };`)
);

// 5. Thao tác logic
content = content.replace(
  normalizeEndings(`                        {(() => {
                          const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          const myTestTypeId = myAssignment?.testType?.id;
                          const myTestResult = s.testResults?.find((tr: any) => tr.testTypeId === myTestTypeId);
                          const myStatus = myTestResult ? myTestResult.status : 'Chưa thi';

                          const isTestingElsewhere = s.testResults?.some((tr: any) => tr.status === 'IN_PROGRESS' && tr.testTypeId !== myTestTypeId);

                          if (isTestingElsewhere) {
                            return <span className="text-muted small">Đang thi ở trạm khác</span>;
                          }

                          if (myStatus === 'Chưa thi') {
                            return (
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => openStartTestModal(s)}
                                >
                                  <Play size={16} /> Bắt đầu thi
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => {
                                    if(window.confirm(\`Xác nhận đánh dấu vắng thi cho \${s.name}?\`)) {
                                      handleMarkAbsent(s);
                                    }
                                  }}
                                >
                                  <UserX size={16} /> Vắng
                                </button>
                              </div>
                            );
                          } else if (myStatus === 'IN_PROGRESS') {
                            return (
                              <button 
                                className="btn" 
                                style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#10b981', color: 'white' }}
                                onClick={() => {
                                  if(window.confirm(\`Xác nhận kết thúc phần thi của \${s.name}?\`)) {
                                    handleEndTest(s);
                                  }
                                }}
                              >
                                <CheckCircle size={16} /> Kết thúc
                              </button>
                            );
                          } else if (myStatus === 'TRANSFERRED' || myStatus === 'FINISHED') {
                            return <span className="text-success small">Đã chuyển điểm</span>;
                          } else if (myStatus === 'ABSENT') {
                            return <span className="text-muted small">Vắng</span>;
                          }

                          return null;
                        })()}`),
  normalizeEndings(`                        {(() => {
                          const myAssignments = assignments.filter((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          if (myAssignments.length === 0) return null;

                          const myInProgressTr = s.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS' && myAssignments.find(a => a.testType?.id === tr.testTypeId));
                          const isTestingElsewhere = s.testResults?.some((tr: any) => tr.status === 'IN_PROGRESS' && !myAssignments.find(a => a.testType?.id === tr.testTypeId));

                          if (isTestingElsewhere && !myInProgressTr) {
                            return <span className="text-muted small">Đang thi ở trạm khác</span>;
                          }

                          if (myInProgressTr) {
                            const inProgressTestType = myAssignments.find(a => a.testType?.id === myInProgressTr.testTypeId)?.testType;
                            return (
                              <button 
                                className="btn" 
                                style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#10b981', color: 'white' }}
                                onClick={() => {
                                  if(window.confirm(\`Xác nhận kết thúc phần thi của \${s.name}?\`)) {
                                    handleEndTest(s);
                                  }
                                }}
                              >
                                <CheckCircle size={16} /> Kết thúc {myAssignments.length > 1 ? \`(\${inProgressTestType?.name})\` : ''}
                              </button>
                            );
                          }

                          const unstartedAssignments = myAssignments.filter(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return !tr || tr.status === 'Chưa thi';
                          });

                          if (unstartedAssignments.length > 0) {
                            return (
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => openStartTestModal(s)}
                                >
                                  <Play size={16} /> Bắt đầu thi
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => {
                                    if(window.confirm(\`Xác nhận đánh dấu vắng thi cho \${s.name}?\`)) {
                                      handleMarkAbsent(s);
                                    }
                                  }}
                                >
                                  <UserX size={16} /> Vắng
                                </button>
                              </div>
                            );
                          }

                          const hasFinished = myAssignments.some(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return tr && (tr.status === 'FINISHED' || tr.status === 'TRANSFERRED');
                          });
                          
                          const hasAbsent = myAssignments.some(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return tr && tr.status === 'ABSENT';
                          });

                          if (hasFinished) {
                             return <span className="text-success small">Đã chuyển điểm</span>;
                          } else if (hasAbsent) {
                             return <span className="text-muted small">Vắng</span>;
                          }

                          return null;
                        })()}`)
);

// 6. Modal UI
content = content.replace(
  normalizeEndings(`              <div style={{ padding: '10px', background: '#f5f7fa', borderRadius: '4px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>Trạm thi: <strong>{selectedTestType?.name}</strong></p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>{selectedTestType?.description}</p>
              </div>`),
  normalizeEndings(`              <div style={{ padding: '10px', background: '#f5f7fa', borderRadius: '4px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>Trạm thi:</p>
                {availableAssignments && availableAssignments.length > 1 ? (
                  <select 
                    className="form-control"
                    value={selectedAssignment?.id || ''}
                    onChange={(e) => {
                      const ast = availableAssignments.find(a => a.id === Number(e.target.value));
                      if (ast) {
                        setSelectedAssignment(ast);
                        setSelectedTestType(ast.testType);
                        setSelectedVehicleId(null);
                      }
                    }}
                    style={{ marginBottom: '10px' }}
                  >
                    {availableAssignments.map(a => (
                      <option key={a.id} value={a.id}>{a.testType?.name}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px 0' }}><strong>{selectedTestType?.name}</strong></p>
                  </>
                )}
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>{selectedTestType?.description}</p>
              </div>`)
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done replacing round 2!');
