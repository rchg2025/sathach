import { formatDateDisplay } from '../utils/dateUtils';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';

import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const RetakeManager = () => {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [retakeSessions, setRetakeSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled'>('pending');
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      setUser(JSON.parse(u));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resEligibility, resRetakes, resCourses] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/retake-eligibility`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_BASE_URL}/api/manager/retakes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_BASE_URL}/api/manager/courses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const allStudents = resEligibility.data;
      
      const eligibleStudents = allStudents.filter((s: any) => {
        if (!s.testResults || s.testResults.length === 0) return false;
        
        const hasFailedOrAbsent = s.testResults.some((tr: any) => 
          tr.status === 'FAILED' || tr.status === 'ABSENT' || (tr.status === 'FINISHED' && tr.totalScore < (tr.testType?.passingScore ?? 80))
        );
        
        return hasFailedOrAbsent;
      });

      setStudents(eligibleStudents);
      setRetakeSessions(resRetakes.data);
      setCourses(resCourses.data);
    } catch (error) {
      console.error('Error fetching data', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleCreateRetake = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 học viên');
      return;
    }
    if (!targetCourseId) {
      toast.error('Vui lòng chọn khóa học để ghép thi');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/manager/retakes`, {
        studentIds: selectedStudentIds,
        targetCourseId: Number(targetCourseId)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Đã xếp lịch thi lại thành công');
      setSelectedStudentIds([]);
      setTargetCourseId('');
      fetchData();
    } catch (error) {
      console.error('Error scheduling retake', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDeleteRetake = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDeleteRetake = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/retakes/${deleteModal.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
      toast.success('Hủy lịch thi ghép thành công');
    } catch (error) {
      console.error('Error deleting retake session', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <AdminLayout user={user}>
      <div className="container mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2>Tổ chức Thi lại (Ghép khóa)</h2>
      </div>

      <div className="mb-4 tabs-container" style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginRight: '0.5rem', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
          onClick={() => setActiveTab('pending')}
        >
          Học viên cần thi lại ({students.length})
        </button>
        <button
          className={`btn ${activeTab === 'scheduled' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
          onClick={() => setActiveTab('scheduled')}
        >
          Lịch thi đã xếp ({retakeSessions.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0 }}>Chọn các học viên bên dưới và chỉ định khóa học sẽ ghép thi chung.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
              <select className="form-control" style={{ flex: 1, minWidth: 0, width: 'auto', fontSize: '0.85rem', padding: '0.5rem' }} value={targetCourseId} onChange={e => setTargetCourseId(e.target.value)}>
                <option value="">-- Chọn Khóa học ghép thi --</option>
                {courses.filter(c => !c.isCompleted).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleCreateRetake} disabled={selectedStudentIds.length === 0 || !targetCourseId} style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                Xếp lịch
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={e => {
                        if (e.target.checked) setSelectedStudentIds(students.map(s => s.id));
                        else setSelectedStudentIds([]);
                      }}
                    />
                  </th>
                  <th>Họ tên</th>
                  <th>CCCD</th>
                  <th>Khóa gốc</th>
                  <th>Trạm đã rớt/vắng</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const failedOrAbsent = student.testResults.filter((tr: any) => 
                    tr.status === 'FAILED' || tr.status === 'ABSENT' || (tr.status === 'FINISHED' && tr.totalScore < (tr.testType?.passingScore ?? 80))
                  );
                  return (
                    <tr key={student.id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => handleToggleSelect(student.id)}
                        />
                      </td>
                      <td>{student.name}</td>
                      <td>{student.cccd}</td>
                      <td>{student.course?.name || student.courseName}</td>
                      <td>
                        {failedOrAbsent.map((tr: any) => (
                          <span key={tr.id} className={`badge ${tr.status === 'ABSENT' ? 'badge-warning' : 'badge-danger'}`} style={{ marginRight: '5px' }}>
                            {tr.testType?.name} ({tr.status === 'ABSENT' ? 'Vắng' : 'Rớt'})
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">Không có học viên nào cần thi lại</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Khóa ghép thi (Target Course)</th>
                  <th>Ngày tạo lịch</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {retakeSessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div><strong>{session.student?.name}</strong></div>
                      <div className="text-muted text-sm">{session.student?.cccd}</div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{session.targetCourse?.name}</span>
                    </td>
                    <td>{formatDateDisplay(session.createdAt)}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRetake(session.id)}>
                        Hủy ghép
                      </button>
                    </td>
                  </tr>
                ))}
                {retakeSessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">Chưa có lịch ghép thi nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận hủy ghép"
        message="Bạn có chắc muốn hủy lịch thi ghép này?"
        onConfirm={confirmDeleteRetake}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </AdminLayout>
  );
};

export default RetakeManager;
