import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const ExaminerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  
  const [students, setStudents] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedTestType, setSelectedTestType] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentScore, setCurrentScore] = useState<number>(100);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userStr));
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [studentsRes, testTypesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/examiner/students`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`) // We can reuse manager's API
      ]);
      setStudents(studentsRes.data);
      setTestTypes(testTypesRes.data);
      
      if (testTypesRes.data.length > 0) {
        setSelectedTestType(testTypesRes.data[0].id);
        fetchCriteria(testTypesRes.data[0].id);
      }
    } catch (e) {
      console.error('Lỗi lấy dữ liệu', e);
    }
  };

  const fetchCriteria = async (testTypeId: number) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/examiner/criteria/${testTypeId}`);
      setCriteria(res.data);
    } catch (e) { console.error(e); }
  };

  const handleTestTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedTestType(id);
    fetchCriteria(id);
  };

  const selectStudent = (student: any) => {
    setSelectedStudent(student);
    // Find if the student already has a result for this testType
    const result = student.testResults?.find((r: any) => r.testTypeId === selectedTestType);
    setCurrentScore(result ? result.totalScore : 100);
  };

  const handleScore = async (criterionId: number) => {
    if (isSubmitting || !selectedStudent) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/examiner/score`, { 
        studentId: selectedStudent.id, 
        testTypeId: selectedTestType, 
        criterionId: criterionId
      });
      // Update local score
      setCurrentScore(res.data.totalScore);
      
      // Update students list cache silently
      setStudents(prev => prev.map(s => {
        if (s.id === selectedStudent.id) {
          const newResults = s.testResults ? [...s.testResults] : [];
          const idx = newResults.findIndex((r: any) => r.testTypeId === selectedTestType);
          if (idx >= 0) newResults[idx] = res.data;
          else newResults.push(res.data);
          return { ...s, testResults: newResults };
        }
        return s;
      }));
    } catch (e) {
      toast.error('Lỗi cập nhật điểm. Vui lòng kiểm tra mạng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ margin: 0 }}>Giao diện Giám khảo ({user.name})</h3>
        <button className="btn btn-danger" onClick={() => { localStorage.clear(); navigate('/login'); }}>
          Đăng xuất
        </button>
      </div>

      {!selectedStudent ? (
        <div className="card">
          <h4>Chọn Bài thi & Học viên</h4>
          <div className="form-group">
            <label>Loại sát hạch</label>
            <select className="form-control" value={selectedTestType} onChange={handleTestTypeChange}>
              {testTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table mt-4" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>CCCD</th>
                <th>Họ và Tên</th>
                <th>Điểm hiện tại</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const result = s.testResults?.find((r: any) => r.testTypeId === selectedTestType);
                const score = result ? result.totalScore : 100;
                return (
                  <tr key={s.id}>
                    <td>{s.cccd}</td>
                    <td>{s.name}</td>
                    <td>
                      <span className={`badge ${score >= 80 ? 'badge-success' : 'badge-danger'}`}>
                        {score}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={() => selectStudent(s)}>
                        Chấm thi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
</div>
        </div>
      ) : (
        <div className="card mt-4" style={{ border: '2px solid var(--primary)' }}>
          <div className="flex justify-between items-center mb-4">
            <h4>Đang chấm: <span style={{ color: 'var(--primary)' }}>{selectedStudent.name}</span></h4>
            <button className="btn" style={{ backgroundColor: '#ccc', color: '#333' }} onClick={() => setSelectedStudent(null)}>
              Quay lại
            </button>
          </div>
          
          <h1 className="text-center" style={{ fontSize: '5rem', color: currentScore >= 80 ? 'var(--success)' : 'var(--danger)', margin: '1rem 0' }}>
            {currentScore}
          </h1>
          <p className="text-center text-muted mb-4">Điểm dưới 80 là TRƯỢT</p>
          
          <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {criteria.map(c => (
              <button 
                key={c.id} 
                className="btn btn-danger" 
                style={{ 
                  padding: '1rem', 
                  fontSize: '1rem',
                  opacity: isSubmitting ? 0.6 : 1,
                  pointerEvents: isSubmitting ? 'none' : 'auto',
                  flex: '1 1 45%'
                }}
                onClick={() => handleScore(c.id)}
              >
                -{c.pointsToDeduct} điểm<br/>
                <small style={{ fontWeight: 'normal' }}>{c.name}</small>
              </button>
            ))}
            {criteria.length === 0 && (
              <p className="text-muted">Chưa có tiêu chí chấm điểm nào được tạo cho bài thi này.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExaminerDashboard;
