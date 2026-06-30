import React, { useEffect, useState } from 'react';
import axios from 'axios';
// import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const CourseManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [courses, setCourses] = useState([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // const user = JSON.parse(localStorage.getItem('user') || '{}'); // No longer needed here

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/courses`, {
        name, description, startDate, endDate
      });
      toast.success('Thêm khóa học thành công!');
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      fetchCourses();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Quản lý khóa học
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Thêm khóa học mới
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm tên khóa học..." 
              style={{ maxWidth: '300px' }}
            />
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>Tên khóa học</th>
                <th>Mô tả</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courses.length > 0 ? courses.map((course: any) => (
                <tr key={course.id}>
                  <td><strong>{course.name}</strong></td>
                  <td>{course.description || '-'}</td>
                  <td>{new Date(course.startDate).toLocaleDateString()}</td>
                  <td>{new Date(course.endDate).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn btn-view">Xem</button>
                    <button className="action-btn btn-edit">Sửa</button>
                    <button className="action-btn btn-delete">Xóa</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có khóa học nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 className="mb-4">Thêm khóa học mới</h3>
          <form onSubmit={handleAddCourse}>
            <div className="form-group">
              <label>Tên khóa học</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mô tả</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
            </div>
            <div className="flex" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ngày bắt đầu</label>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ngày kết thúc</label>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu khóa học</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
