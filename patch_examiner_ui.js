const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'pages', 'ExaminerDashboard.tsx');
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/\r\n/g, '\n');

// 1. Add new state for the Start Modal
uiContent = uiContent.replace(
  "const [baseScore, setBaseScore] = useState<number>(100);",
  `const [baseScore, setBaseScore] = useState<number>(100);\n  const [isStartModalOpen, setIsStartModalOpen] = useState(false);\n  const [examToStart, setExamToStart] = useState<any>(null);`
);

// 2. Add openStartModal function and modify startExam
uiContent = uiContent.replace(
  `  const startExam = async (student: any) => {
    try {
      const payload: any = {
        studentId: student.id,
        testTypeId: student.currentExam.testTypeId,
        examinerId: user.id
      };
      
      if (student.isCombinedExam) {
        payload.examIds = student.allExams.map((e: any) => e.id);
      } else {
        payload.examId = student.currentExam.id;
      }

      await axios.post(\`\${API_BASE_URL}/api/examiner/start-exam\`, payload);
      toast.success('Đã bắt đầu chấm bài thi');
      
      // Auto-open modal
      const updatedStudent = { 
        ...student, 
        currentProgress: { status: 'IN_PROGRESS', startTime: new Date() } 
      };
      openGradingModal(updatedStudent);

      fetchData(user.id, false);
    } catch (e) {
      toast.error('Lỗi khi bắt đầu chấm');
    }
  };`,
  `  const openStartModal = (student: any) => {
    setSelectedStudent(student);
    if (!student.isCombinedExam && student.allAvailableExams && student.allAvailableExams.length > 1) {
      setExamToStart(student.allAvailableExams[0]);
    } else {
      setExamToStart(student.currentExam);
    }
    setIsStartModalOpen(true);
  };

  const startExam = async (student: any, selectedExam: any) => {
    try {
      const payload: any = {
        studentId: student.id,
        testTypeId: student.currentExam.testTypeId,
        examinerId: user.id
      };
      
      if (student.isCombinedExam) {
        payload.examIds = student.allExams.map((e: any) => e.id);
      } else {
        payload.examId = selectedExam.id;
      }

      await axios.post(\`\${API_BASE_URL}/api/examiner/start-exam\`, payload);
      toast.success('Đã bắt đầu chấm bài thi');
      
      setIsStartModalOpen(false);
      
      const updatedStudent = { 
        ...student,
        currentExam: selectedExam,
        currentProgress: { status: 'IN_PROGRESS', startTime: new Date() } 
      };
      openGradingModal(updatedStudent);

      fetchData(user.id, false);
    } catch (e) {
      toast.error('Lỗi khi bắt đầu chấm');
    }
  };`
);

// 3. Change the UI button to call openStartModal
uiContent = uiContent.replace(
  `                        <button 
                          className="btn btn-warning btn-sm rounded-pill px-3"
                          onClick={() => startExam(s)}
                        >
                          Bắt đầu chấm
                        </button>`,
  `                        <button 
                          className="btn btn-warning btn-sm rounded-pill px-3"
                          onClick={() => openStartModal(s)}
                        >
                          Bắt đầu chấm
                        </button>`
);

// 4. Add the isStartModalOpen modal at the end, right before </AdminLayout>
uiContent = uiContent.replace(
  `    </AdminLayout>`,
  `
      {isStartModalOpen && selectedStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '2rem', borderRadius: '15px',
            width: '100%', maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: 'var(--primary)' }}>
              Bắt đầu chấm điểm
            </h4>
            
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: 'bold' }}>Học viên</label>
              <input type="text" className="form-control bg-light" value={selectedStudent.name} readOnly />
            </div>

            <div className="mb-4">
              <label className="form-label" style={{ fontWeight: 'bold' }}>Bài thi</label>
              {(!selectedStudent.isCombinedExam && selectedStudent.allAvailableExams && selectedStudent.allAvailableExams.length > 1) ? (
                <select 
                  className="form-select"
                  value={examToStart?.id || ''}
                  onChange={(e) => {
                    const ex = selectedStudent.allAvailableExams.find((x: any) => x.id === Number(e.target.value));
                    if (ex) setExamToStart(ex);
                  }}
                >
                  {selectedStudent.allAvailableExams.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              ) : (
                <input type="text" className="form-control bg-light" value={selectedStudent.isCombinedExam ? "Thi đường trường (Tất cả bài)" : examToStart?.name} readOnly />
              )}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-light" onClick={() => setIsStartModalOpen(false)}>Hủy</button>
              <button 
                className="btn btn-primary"
                onClick={() => startExam(selectedStudent, examToStart)}
              >
                Bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>`
);

fs.writeFileSync(uiPath, uiContent, 'utf-8');
console.log('Patched UI ExaminerDashboard.tsx');
