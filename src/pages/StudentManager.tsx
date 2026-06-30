import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const StudentManager = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [formData, setFormData] = useState({
    cccd: '',
    name: '',
    dob: '',
    courseId: ''
  });

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/students`),
        axios.get(`${API_BASE_URL}/api/manager/courses`)
      ]);
      setStudents(studentsRes.data);
      setCourses(coursesRes.data);
      if (coursesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, courseId: coursesRes.data[0].id.toString() }));
      }
    } catch (e) { console.error('Lỗi lấy dữ liệu', e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/students`, formData);
      toast.success('Thêm học viên thành công!');
      setFormData({ cccd: '', name: '', dob: '', courseId: courses.length > 0 ? courses[0].id.toString() : '' });
      setActiveTab('list');
      fetchData();
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Lỗi thêm học viên');
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2>Quản lý Học viên</h2>
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Danh sách Học viên
          </div>
          <div 
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Thêm mới
          </div>
        </div>

        {activeTab === 'list' && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>CCCD</th>
                  <th>Họ và Tên</th>
                  <th>Ngày sinh</th>
                  <th>Khóa học</th>
                  <th>Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.cccd}</td>
                    <td>{s.name}</td>
                    <td>{s.dob || 'N/A'}</td>
                    <td>
                      <span className="badge badge-success">{s.course?.name || 'N/A'}</span>
                    </td>
                    <td>{new Date(s.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem 0' }}>
                      Chưa có học viên nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Số CCCD</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.cccd}
                  onChange={e => setFormData({...formData, cccd: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ngày sinh</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={formData.dob}
                  onChange={e => setFormData({...formData, dob: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Khóa học</label>
                <select 
                  className="form-control"
                  value={formData.courseId}
                  onChange={e => setFormData({...formData, courseId: e.target.value})}
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <small className="text-danger">Vui lòng tạo Khóa học trước khi thêm học viên.</small>
                )}
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={courses.length === 0}>
                Lưu Học viên
              </button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StudentManager;
