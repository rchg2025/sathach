import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const ExaminerDashboard = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [criterionId: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseScore, setBaseScore] = useState<number>(100);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      fetchData(parsedUser.id);
      
      const interval = setInterval(() => {
        fetchData(parsedUser.id, false);
      }, 15000); // Tăng lên 15s để giảm tải cho Vercel
      return () => clearInterval(interval);
    }
  }, []);

  const fetchData = async (examinerId: number, showLoading = true) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/examiner/students?examinerId=${examinerId}`);
      setStudents(res.data);
    } catch (e) {
      console.error(e);
      if (showLoading) toast.error('Lỗi lấy danh sách học viên');
    }
  };

  const startExam = async (student: any) => {
    try {
      await axios.post(`${API_BASE_URL}/api/examiner/start-exam`, {
        studentId: student.id,
        testTypeId: student.testResults[0].testTypeId,
        examId: student.currentExam.id,
        examinerId: user.id
      });
      toast.success('Đã bắt đầu chấm bài thi');
      fetchData(user.id, false);
    } catch (e) {
      toast.error('Lỗi khi bắt đầu chấm');
    }
  };

  const openGradingModal = async (student: any) => {
    setSelectedStudent(student);
    setErrors({});
    
    const tr = student.testResults?.find((r: any) => r.id === student.testResultId);
    setBaseScore(tr ? tr.totalScore : 100);
    
    setIsModalOpen(true);
    
    try {
      const res = await axios.get(`${API_BASE_URL}/api/examiner/criteria/${student.currentExam.id}`);
      setCriteria(res.data);
    } catch (e) {
      toast.error('Lỗi lấy tiêu chí chấm điểm');
    }
  };

  const updateErrorCount = (criterionId: number, delta: number) => {
    setErrors(prev => {
      const current = prev[criterionId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      return { ...prev, [criterionId]: next };
    });
  };

  const handleSubmitExam = async () => {
    if (!selectedStudent || isSubmitting) return;
    setIsSubmitting(true);
    
    const errorsList = Object.entries(errors).map(([cId, count]) => ({
      criterionId: Number(cId),
      errorCount: count
    }));
    
    try {
      await axios.post(`${API_BASE_URL}/api/examiner/submit-exam`, {
        studentId: selectedStudent.id,
        testTypeId: selectedStudent.currentExam.testTypeId,
        examId: selectedStudent.currentExam.id,
        examinerId: user.id,
        errors: errorsList
      });
      
      toast.success('Đã hoàn thành bài thi!');
      setIsModalOpen(false);
      
      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
      fetchData(user.id, false);
      
    } catch (e) {
      toast.error('Lỗi lưu điểm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.cccd.includes(searchQuery) ||
      s.currentExam?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const currentScore = useMemo(() => {
    let deducted = 0;
    for (const c of criteria) {
      const count = errors[c.id] || 0;
      deducted += count * c.pointsToDeduct;
    }
    return baseScore - deducted;
  }, [baseScore, criteria, errors]);

  return (
    <AdminLayout user={user}>
      <div className="card mb-4" style={{ borderRadius: '15px' }}>
        <h3 className="mb-4" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sát hạch (Giám khảo: {user?.name})</h3>
        
        <div className="row mb-4">
          <div className="col-md-12">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Tìm kiếm theo Tên, CCCD hoặc Bài thi..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive" style={{ minHeight: '400px' }}>
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '5%' }}>STT</th>
                <th style={{ width: '15%' }}>Họ và Tên</th>
                <th style={{ width: '10%' }}>CCCD</th>
                <th style={{ width: '10%' }}>Số xe</th>
                <th style={{ width: '15%' }}>Khóa đào tạo</th>
                <th style={{ width: '10%' }}>Thời gian thực hiện</th>
                <th style={{ width: '15%' }}>Bài thi hiện tại</th>
                <th style={{ width: '15%' }}>Trạng thái</th>
                <th style={{ width: '5%' }}>Điểm thi</th>
                <th style={{ width: '10%', textAlign: 'center' }} className="sticky-col-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={10} className="text-center">Không có học viên nào đang chờ phần thi của bạn.</td></tr>
              ) : filteredStudents.map((s: any, index: number) => {
                const tr = s.testResults?.find((r: any) => r.id === s.testResultId);
                const score = tr ? tr.totalScore : 100;
                
                let statusInfo = <span className="text-muted">Đang chờ chấm...</span>;
                if (s.currentProgress && s.currentProgress.status === 'IN_PROGRESS') {
                  const startTimeStr = s.currentProgress.startTime ? new Date(s.currentProgress.startTime).toLocaleTimeString() : '';
                  statusInfo = (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đang chấm</span>
                      {startTimeStr && <span style={{ fontSize: '0.85em', opacity: 0.9 }}>Bắt đầu: {startTimeStr}</span>}
                    </div>
                  );
                }
                
                return (
                  <tr key={s.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: '600' }}>{s.name}</td>
                    <td>{s.cccd}</td>
                    <td><span className="badge badge-info">{s.vehicle?.name || '-'}</span></td>
                    <td>{s.course?.name || s.courseName || '-'}</td>
                    <td>{s.assignmentDate ? new Date(s.assignmentDate).toLocaleDateString('vi-VN') : '-'}</td>
                    <td>
                      <div className="badge badge-primary" style={{ display: 'inline-flex', padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}>
                        {s.currentExam?.name || '-'}
                      </div>
                    </td>
                    <td>{statusInfo}</td>
                    <td style={{ fontWeight: 'bold' }}>{score}</td>
                    <td className="sticky-col-right" style={{ textAlign: 'center' }}>
                      {(!s.currentProgress || s.currentProgress.status === 'PENDING') ? (
                        <button 
                          className="btn btn-warning btn-sm rounded-pill px-3"
                          onClick={() => startExam(s)}
                        >
                          Bắt đầu chấm
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm rounded-pill px-3"
                          onClick={() => openGradingModal(s)}
                        >
                          <Play size={16} className="me-1" /> Chấm điểm
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '2rem', borderRadius: '15px',
            width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>
                Chấm điểm: {selectedStudent.name}
              </h4>
              <button className="btn btn-light" onClick={() => setIsModalOpen(false)}>Đóng</button>
            </div>
            
            <div className="mb-4 text-center">
              <h5>{selectedStudent.currentExam?.name}</h5>
              <h1 style={{ 
                fontSize: '4rem', 
                color: currentScore >= 80 ? 'var(--success)' : 'var(--danger)',
                margin: '1rem 0'
              }}>
                {currentScore}
              </h1>
              <p className="text-muted">Tổng điểm hiện tại</p>
            </div>

            <h5 className="mb-3 border-bottom pb-2">Tiêu chí trừ điểm</h5>
            
            {criteria.length === 0 ? (
              <div className="text-center text-muted my-4">Chưa có tiêu chí nào cho bài thi này.</div>
            ) : (
              <div className="d-flex flex-column">
                {criteria.map(c => {
                  const errCount = errors[c.id] || 0;
                  return (
                    <div key={c.id} className="d-flex justify-content-between align-items-center py-3 border-bottom" style={{ gap: '10px' }}>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', lineHeight: '1.3' }}>{c.name}</div>
                        <div className="text-danger small mt-1">Trừ {c.pointsToDeduct} điểm / lỗi</div>
                      </div>
                      <div className="d-flex align-items-center justify-content-end" style={{ gap: '8px', minWidth: '110px' }}>
                        <button 
                          className="btn btn-light p-1 d-flex align-items-center justify-content-center" 
                          style={{ width: '36px', height: '36px', backgroundColor: '#f1f3f5', border: 'none', borderRadius: '8px' }}
                          onClick={() => updateErrorCount(c.id, -1)}
                          disabled={errCount === 0}
                        >
                          <Minus size={20} />
                        </button>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', width: '28px', textAlign: 'center' }}>
                          {errCount}
                        </span>
                        <button 
                          className="btn btn-light p-1 d-flex align-items-center justify-content-center" 
                          style={{ width: '36px', height: '36px', backgroundColor: '#f1f3f5', border: 'none', borderRadius: '8px' }}
                          onClick={() => updateErrorCount(c.id, 1)}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-top d-flex justify-content-center">
              <button 
                className="btn btn-success rounded-pill px-4 py-2" 
                style={{ fontSize: '1.1rem', fontWeight: 'bold', width: '100%' }}
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                <CheckCircle size={20} className="me-2" /> 
                {isSubmitting ? 'Đang lưu...' : 'Hoàn thành bài thi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ExaminerDashboard;
