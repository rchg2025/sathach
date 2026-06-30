import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
// import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CourseManager = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'completed'>('list');
  const [courses, setCourses] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
      const payload = { name, description, startDate, endDate };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/courses/${editingId}`, payload);
        toast.success('Cập nhật khóa học thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/courses`, payload);
        toast.success('Thêm khóa học thành công!');
      }
      resetForm();
      fetchCourses();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setEditingId(null);
  };

  const handleEdit = (course: any) => {
    setEditingId(course.id);
    setName(course.name);
    setDescription(course.description || '');
    setStartDate(course.startDate ? course.startDate.split('T')[0] : '');
    setEndDate(course.endDate ? course.endDate.split('T')[0] : '');
    setActiveTab('add');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khóa học này không?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/manager/courses/${id}`);
        toast.success('Xóa khóa học thành công!');
        fetchCourses();
      } catch (err) {
        toast.error('Lỗi khi xóa khóa học');
      }
    }
  };

  const handleToggleStatus = async (course: any) => {
    try {
      await axios.put(`${API_BASE_URL}/api/manager/courses/${course.id}`, {
        isCompleted: !course.isCompleted
      });
      fetchCourses();
      toast.success('Cập nhật trạng thái thành công!');
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const filteredCourses = courses.filter((c: any) => {
    const keyword = removeAccents(searchKeyword);
    const matchSearch = removeAccents(c.name).includes(keyword) || removeAccents(c.description || '').includes(keyword);
    const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'completed' ? c.isCompleted : !c.isCompleted);
    return matchSearch && matchStatus;
  }).sort((a: any, b: any) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return a.name.localeCompare(b.name, 'vi');
  });
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const displayedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredCourses.map((c: any, index: number) => ({
      'STT': index + 1,
      'Tên khóa học': c.name,
      'Mô tả': c.description || '',
      'Ngày bắt đầu': new Date(c.startDate).toLocaleDateString('vi-VN'),
      'Ngày kết thúc': new Date(c.endDate).toLocaleDateString('vi-VN'),
      'Trạng thái': c.isCompleted ? 'Hoàn thành' : 'Chưa hoàn thành',
      'Ngày tạo': new Date(c.createdAt).toLocaleDateString('vi-VN')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KhoaHoc');
    XLSX.writeFile(workbook, 'danh-sach-khoa-hoc.xlsx');
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
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Khóa học đã hoàn thành
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa khóa học' : 'Thêm khóa học mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1 }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm tên khóa học, mô tả..." 
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                style={{ maxWidth: '300px' }}
              />
              <select className="form-control" style={{ maxWidth: '200px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang diễn ra</option>
                <option value="completed">Đã hoàn thành</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên khóa học</th>
                <th>Mô tả</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedCourses.length > 0 ? displayedCourses.map((course: any, idx: number) => (
                <tr key={course.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td><strong>{course.name}</strong></td>
                  <td>{course.description || '-'}</td>
                  <td>{new Date(course.startDate).toLocaleDateString()}</td>
                  <td>{new Date(course.endDate).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={course.isCompleted || false} onChange={() => handleToggleStatus(course)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ fontSize: '0.85rem', color: course.isCompleted ? 'var(--success)' : 'var(--text-muted)' }}>
                        {course.isCompleted ? 'Hoàn thành' : 'Chưa HT'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(course)}><Edit size={16} /></button>
                      <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(course.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có khóa học nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredCourses.length)} trong tổng số {filteredCourses.length}
              </span>
              <div className="pagination flex" style={{ gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên khóa học</th>
                <th>Mô tả</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courses.filter((c: any) => c.isCompleted).length > 0 ? courses.filter((c: any) => c.isCompleted).sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi')).map((course: any, idx: number) => (
                <tr key={course.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{course.name}</strong></td>
                  <td>{course.description || '-'}</td>
                  <td>{new Date(course.startDate).toLocaleDateString()}</td>
                  <td>{new Date(course.endDate).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn btn-view" title="Xem danh sách học viên" onClick={() => navigate('/manager/students?course=' + encodeURIComponent(course.name))}><Users size={16} /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có khóa học nào đã hoàn thành.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật khóa học' : 'Thêm khóa học mới'}</h3>
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
