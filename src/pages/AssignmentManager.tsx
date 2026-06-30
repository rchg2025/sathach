import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { Trash2 } from 'lucide-react';

const AssignmentManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  // Form states
  const [roleType, setRoleType] = useState<'STATION_MANAGER' | 'EXAMINER'>('STATION_MANAGER');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assnRes, usrRes, ttRes, examRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/assignments`),
        axios.get(`${API_BASE_URL}/api/manager/users`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`),
        axios.get(`${API_BASE_URL}/api/manager/exams`)
      ]);
      setAssignments(assnRes.data);
      setUsers(usrRes.data);
      setTestTypes(ttRes.data);
      setExams(examRes.data);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu');
    }
  };

  const filteredUsers = users.filter(u => u.role === roleType && u.isActive);
  const filteredExams = exams.filter(e => e.testTypeId === Number(selectedTestType));

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    setSelectedUser('');
  }, [roleType]);

  useEffect(() => {
    setSelectedExam('');
  }, [selectedTestType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Vui lòng chọn người được phân công');
    if (!selectedTestType) return toast.error('Vui lòng chọn Trạm thi');
    if (roleType === 'EXAMINER' && !selectedExam) return toast.error('Vui lòng chọn Bài thi');
    if (!assignmentDate) return toast.error('Vui lòng chọn Ngày thực hiện');

    try {
      await axios.post(`${API_BASE_URL}/api/manager/assignments`, {
        examinerId: selectedUser,
        testTypeId: selectedTestType,
        examId: roleType === 'EXAMINER' ? selectedExam : undefined,
        assignmentDate
      });
      toast.success('Phân công thành công!');
      
      // Reset form
      setSelectedUser('');
      setSelectedTestType('');
      setSelectedExam('');
      setAssignmentDate('');
      
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi phân công');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phân công này?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/manager/assignments/${id}`);
        toast.success('Đã xóa phân công!');
        fetchData();
      } catch (err) {
        toast.error('Lỗi khi xóa phân công');
      }
    }
  };

  return (
    <AdminLayout user={user}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Phân công Nhiệm vụ</h2>

      <div className="card mb-4">
        <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
          Tạo phân công mới
        </h4>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Loại phân công</label>
              <select 
                className="form-control" 
                value={roleType} 
                onChange={(e) => setRoleType(e.target.value as any)}
              >
                <option value="STATION_MANAGER">Phân công cho Trưởng trạm</option>
                <option value="EXAMINER">Phân công cho Giám khảo</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Người được phân công ({roleType === 'STATION_MANAGER' ? 'Trưởng trạm' : 'Giám khảo'})
              </label>
              <select 
                className="form-control" 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">-- Chọn thành viên --</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Trạm thi</label>
              <select 
                className="form-control" 
                value={selectedTestType} 
                onChange={(e) => setSelectedTestType(e.target.value)}
              >
                <option value="">-- Chọn Trạm thi --</option>
                {testTypes.map(tt => (
                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                ))}
              </select>
            </div>

            {roleType === 'EXAMINER' && (
              <div className="form-group">
                <label className="form-label">Bài thi</label>
                <select 
                  className="form-control" 
                  value={selectedExam} 
                  onChange={(e) => setSelectedExam(e.target.value)}
                  disabled={!selectedTestType}
                >
                  <option value="">-- Chọn Bài thi --</option>
                  {filteredExams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Thời gian thực hiện</label>
              <input 
                type="date" 
                className="form-control" 
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary">Lưu Phân Công</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ margin: 0 }}>Danh sách Phân công</h4>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Trạm thi</th>
                <th>Bài thi</th>
                <th>Thời gian</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length > 0 ? assignments.map((a: any, idx: number) => (
                <tr key={a.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{a.examiner?.name || 'N/A'}</strong></td>
                  <td>
                    {a.examiner?.role === 'STATION_MANAGER' ? (
                      <span className="badge badge-success">Trưởng trạm</span>
                    ) : (
                      <span className="badge badge-primary">Giám khảo</span>
                    )}
                  </td>
                  <td>{a.testType?.name || 'N/A'}</td>
                  <td>{a.exam?.name || '-'}</td>
                  <td>{a.assignmentDate ? new Date(a.assignmentDate).toLocaleDateString('vi-VN') : '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="action-btn btn-delete" onClick={() => handleDelete(a.id)} title="Xóa phân công">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu phân công
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AssignmentManager;
