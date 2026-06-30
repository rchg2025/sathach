import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';

const AssignmentManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Form states
  const [roleType, setRoleType] = useState<'STATION_MANAGER' | 'EXAMINER'>('STATION_MANAGER');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');

  // Filter & Pagination states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assnRes, usrRes, ttRes, examRes, courseRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/assignments`),
        axios.get(`${API_BASE_URL}/api/manager/users`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`),
        axios.get(`${API_BASE_URL}/api/manager/exams`),
        axios.get(`${API_BASE_URL}/api/manager/courses`)
      ]);
      setAssignments(assnRes.data);
      setUsers(usrRes.data);
      setTestTypes(ttRes.data);
      setExams(examRes.data);
      setCourses(courseRes.data);
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
    setSelectedExams([]);
  }, [selectedTestType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Vui lòng chọn người được phân công');
    if (!selectedTestType) return toast.error('Vui lòng chọn Trạm thi');
    if (roleType === 'EXAMINER' && selectedExams.length === 0) return toast.error('Vui lòng chọn ít nhất 1 Bài thi');
    if (!assignmentDate) return toast.error('Vui lòng chọn Ngày thực hiện');

    try {
      await axios.post(`${API_BASE_URL}/api/manager/assignments`, {
        examinerId: selectedUser,
        testTypeId: selectedTestType,
        examIds: roleType === 'EXAMINER' ? selectedExams : undefined,
        courseId: selectedCourse ? selectedCourse : undefined,
        assignmentDate
      });
      toast.success('Phân công thành công!');
      
      // Reset form
      setSelectedUser('');
      setSelectedTestType('');
      setSelectedExams([]);
      setSelectedCourse('');
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

  const exportToExcel = () => {
    if (filteredAssignments.length === 0) {
      toast.error('Không có dữ liệu để xuất!');
      return;
    }
    
    const data = filteredAssignments.map((a, idx) => ({
      'STT': idx + 1,
      'Họ tên': a.examiner?.name || '',
      'Tài khoản': a.examiner?.username || '',
      'Vai trò': a.examiner?.role === 'STATION_MANAGER' ? 'Trưởng trạm' : 'Giám khảo',
      'Khóa đào tạo': a.course?.name || '',
      'Trạm thi': a.testType?.name || '',
      'Bài thi': a.exam?.name || '',
      'Thời gian thực hiện': a.assignmentDate ? new Date(a.assignmentDate).toLocaleDateString('vi-VN') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PhanCong');
    XLSX.writeFile(workbook, `Danh_Sach_Phan_Cong_${new Date().getTime()}.xlsx`);
  };

  const filteredAssignments = assignments.filter(a => {
    const matchSearch = (a.examiner?.name || '').toLowerCase().includes(searchKeyword.toLowerCase()) || 
                        (a.examiner?.username || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
                        (a.exam?.name || '').toLowerCase().includes(searchKeyword.toLowerCase());
    const matchRole = roleFilter === 'all' ? true : a.examiner?.role === roleFilter;
    const matchCourse = courseFilter === 'all' ? true : String(a.course?.id) === courseFilter;
    const matchTestType = testTypeFilter === 'all' ? true : String(a.testType?.id) === testTypeFilter;
    
    return matchSearch && matchRole && matchCourse && matchTestType;
  });

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout user={user}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Phân công Nhiệm vụ</h2>

      <div className="card mb-4">
        <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
          Tạo phân công mới
        </h4>
        <form onSubmit={handleSubmit}>
          <div className="grid-cols-3-responsive">
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
              <label className="form-label">Khóa đào tạo (Tùy chọn)</label>
              <Select
                options={[{ value: '', label: '-- Chọn Khóa đào tạo --' }, ...courses.map(c => ({ value: c.id, label: c.name }))]}
                value={
                  selectedCourse 
                    ? { value: selectedCourse, label: courses.find(c => String(c.id) === String(selectedCourse))?.name || '' } 
                    : { value: '', label: '-- Chọn Khóa đào tạo --' }
                }
                onChange={(selected: any) => setSelectedCourse(selected ? selected.value : '')}
                placeholder="Tìm kiếm khóa đào tạo..."
                isClearable
                styles={{ 
                  control: (base: any) => ({ 
                    ...base, 
                    borderColor: '#d1d5db', 
                    borderRadius: '6px', 
                    minHeight: '38px',
                    boxShadow: 'none' 
                  }) 
                }}
              />
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
                <label className="form-label">Bài thi (Nhấn giữ Ctrl/Cmd để chọn nhiều bài thi)</label>
                <select 
                  multiple
                  className="form-control" 
                  style={{ minHeight: '120px' }}
                  value={selectedExams} 
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedExams(values);
                  }}
                  disabled={!selectedTestType}
                >
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
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm tên, username, bài thi..." 
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                style={{ minWidth: '200px', flex: 1, maxWidth: '250px' }}
              />
              <div style={{ width: '180px' }}>
                <select className="form-control" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Tất cả Vai trò</option>
                  <option value="STATION_MANAGER">Trưởng trạm</option>
                  <option value="EXAMINER">Giám khảo</option>
                </select>
              </div>
              <div style={{ width: '180px' }}>
                <select className="form-control" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Tất cả Khóa đào tạo</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ width: '180px' }}>
                <select className="form-control" value={testTypeFilter} onChange={(e) => { setTestTypeFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Tất cả Trạm thi</option>
                  {testTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <button className="btn btn-success flex items-center" style={{ gap: '0.5rem' }} onClick={exportToExcel}>
                <Download size={18} /> Xuất Excel
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Khóa đào tạo</th>
                <th>Trạm thi</th>
                <th>Bài thi</th>
                <th>Thời gian</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssignments.length > 0 ? paginatedAssignments.map((a: any, idx: number) => (
                <tr key={a.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td><strong>{a.examiner?.name || 'N/A'}</strong></td>
                  <td>
                    {a.examiner?.role === 'STATION_MANAGER' ? (
                      <span className="badge badge-success">Trưởng trạm</span>
                    ) : (
                      <span className="badge badge-primary">Giám khảo</span>
                    )}
                  </td>
                  <td>{a.course?.name || '-'}</td>
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
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu phân công phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Phân trang */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AssignmentManager;
