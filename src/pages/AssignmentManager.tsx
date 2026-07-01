import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { Trash2, Download, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import ConfirmModal from '../components/ConfirmModal';

const AssignmentManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Form states
  const [roleType, setRoleType] = useState<'STATION_MANAGER' | 'EXAMINER'>('STATION_MANAGER');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTestTypes, setSelectedTestTypes] = useState<string[]>([]);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [assignmentDate, setAssignmentDate] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({ isOpen: false, id: null });

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
      const [assnRes, usrRes, ttRes, examRes, courseRes, vehicleRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/assignments`),
        axios.get(`${API_BASE_URL}/api/manager/users`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`),
        axios.get(`${API_BASE_URL}/api/manager/exams`),
        axios.get(`${API_BASE_URL}/api/manager/courses`),
        axios.get(`${API_BASE_URL}/api/manager/vehicle-types`)
      ]);
      setAssignments(assnRes.data);
      setUsers(usrRes.data);
      setTestTypes(ttRes.data);
      setExams(examRes.data);
      setCourses(courseRes.data);
      setVehicles(vehicleRes.data.filter((v: any) => v.isActive));
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu');
    }
  };

  const filteredUsers = users.filter(u => u.role === roleType && u.isActive);
  const filteredExams = exams.filter(e => e.testTypeId === Number(selectedTestTypes[0]));

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    setSelectedUser('');
    setSelectedVehicles([]);
  }, [roleType]);

  const availableVehicles = React.useMemo(() => {
    if (!assignmentDate) return vehicles;

    const dateStr = assignmentDate;
    const assignmentsOnDate = assignments.filter(a => {
      if (!a.assignmentDate) return false;
      const aDate = new Date(a.assignmentDate).toISOString().split('T')[0];
      if (editingId && a.id === editingId) return false;
      return aDate === dateStr;
    });

    if (roleType === 'STATION_MANAGER') {
      const assignedVehicleIds = new Set<string>();
      assignmentsOnDate.forEach(a => {
        if (a.examiner?.role === 'STATION_MANAGER') {
          a.vehicles?.forEach((v: any) => assignedVehicleIds.add(String(v.id)));
        }
      });
      return vehicles.filter(v => !assignedVehicleIds.has(String(v.id)));
    } else if (roleType === 'EXAMINER') {
      if (selectedTestTypes.length === 0) return [];
      
      const smAssignment = assignmentsOnDate.find(a => 
        a.examiner?.role === 'STATION_MANAGER' && 
        selectedTestTypes.includes(String(a.testType?.id))
      );

      if (!smAssignment || !smAssignment.vehicles) return [];
      
      const smVehicleIds = new Set(smAssignment.vehicles.map((v: any) => String(v.id)));
      return vehicles.filter(v => smVehicleIds.has(String(v.id)));
    }

    return vehicles;
  }, [vehicles, assignments, roleType, assignmentDate, selectedTestTypes, editingId]);

  useEffect(() => {
    setSelectedExams([]);
  }, [selectedTestTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Vui lòng chọn người được phân công');
    if (selectedTestTypes.length === 0) return toast.error('Vui lòng chọn Trạm thi');
    if (roleType === 'EXAMINER' && selectedExams.length === 0) return toast.error('Vui lòng chọn ít nhất 1 Bài thi');
    if (!assignmentDate) return toast.error('Vui lòng chọn Ngày thực hiện');

    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/assignments/${editingId}`, {
          examinerId: selectedUser,
          testTypeId: selectedTestTypes[0],
          examId: roleType === 'EXAMINER' ? selectedExams[0] : undefined,
          courseId: selectedCourse ? selectedCourse : undefined,
          vehicleIds: selectedVehicles,
          assignmentDate
        });
        toast.success('Cập nhật phân công thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/assignments`, {
          examinerId: selectedUser,
          testTypeIds: selectedTestTypes,
          examIds: roleType === 'EXAMINER' ? selectedExams : undefined,
          courseId: selectedCourse ? selectedCourse : undefined,
          vehicleIds: selectedVehicles,
          assignmentDate
        });
        toast.success('Phân công thành công!');
      }
      
      // Reset form
      setEditingId(null);
      setSelectedUser('');
      setSelectedTestTypes([]);
      setSelectedExams([]);
      setSelectedCourse('');
      setSelectedVehicles([]);
      setAssignmentDate('');
      
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi lưu phân công');
    }
  };

  const handleEdit = (assignment: any) => {
    setEditingId(assignment.id);
    setRoleType(assignment.examiner?.role || 'STATION_MANAGER');
    
    // We need to use setTimeout to allow roleType effect to run and reset fields
    // But since we want to populate them, we bypass the effect's reset behavior
    // by setting them immediately. The effects will run but won't undo these if we structure it carefully,
    // actually the effects will wipe them if roleType changes!
    // To fix that, we can wrap the resets in the effects to check if editingId is set, or just use a small timeout.
    setTimeout(() => {
      setSelectedUser(String(assignment.examinerId));
      setSelectedTestTypes([String(assignment.testTypeId)]);
      setSelectedCourse(assignment.courseId ? String(assignment.courseId) : '');
      setSelectedVehicles(assignment.vehicles?.map((v: any) => String(v.id)) || []);
      if (assignment.examId) {
        setSelectedExams([String(assignment.examId)]);
      }
      if (assignment.assignmentDate) {
        setAssignmentDate(new Date(assignment.assignmentDate).toISOString().split('T')[0]);
      }
    }, 50);
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/assignments/${deleteModal.id}`);
      toast.success('Đã xóa phân công!');
      fetchData();
    } catch (err) {
      toast.error('Lỗi khi xóa phân công');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
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
      'Số xe': a.vehicles?.map((v: any) => v.name).join(', ') || '',
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
        <div className="card-header">
          <h3 className="card-title">{editingId ? 'Cập nhật phân công' : 'Tạo phân công mới'}</h3>
          {editingId && (
            <button 
              className="btn" 
              style={{ background: '#f3f4f6', color: '#4b5563', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
              onClick={() => {
                setEditingId(null);
                setSelectedUser('');
                setSelectedTestTypes([]);
                setSelectedExams([]);
                setSelectedCourse('');
                setSelectedVehicles([]);
                setAssignmentDate('');
              }}
            >
              Hủy cập nhật
            </button>
          )}
        </div>
        <form className="card-body" onSubmit={handleSubmit}>
          <div className="grid-cols-3-responsive">
            <div className="form-group">
              <label className="form-label">Loại phân công</label>
              <Select 
                options={[
                  { value: 'STATION_MANAGER', label: 'Phân công cho Trưởng trạm' },
                  { value: 'EXAMINER', label: 'Phân công cho Giám khảo' }
                ]}
                value={[
                  { value: 'STATION_MANAGER', label: 'Phân công cho Trưởng trạm' },
                  { value: 'EXAMINER', label: 'Phân công cho Giám khảo' }
                ].find(opt => opt.value === roleType)}
                onChange={(selected: any) => setRoleType(selected ? selected.value : 'EXAMINER')}
                isClearable={false}
                styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }) }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Người được phân công ({roleType === 'STATION_MANAGER' ? 'Trưởng trạm' : 'Giám khảo'})
              </label>
              <Select 
                options={[{ value: '', label: '-- Chọn thành viên --' }, ...filteredUsers.map(u => ({ value: String(u.id), label: `${u.name} (${u.username})` }))]}
                value={
                  selectedUser 
                    ? { value: selectedUser, label: filteredUsers.find(u => String(u.id) === String(selectedUser)) ? `${filteredUsers.find(u => String(u.id) === String(selectedUser))?.name} (${filteredUsers.find(u => String(u.id) === String(selectedUser))?.username})` : '-- Chọn thành viên --' }
                    : { value: '', label: '-- Chọn thành viên --' }
                }
                onChange={(selected: any) => setSelectedUser(selected ? selected.value : '')}
                placeholder="Tìm thành viên..."
                isClearable
                styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }) }}
              />
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
                  }),
                  menu: (base: any) => ({ ...base, zIndex: 9999 })
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trạm thi</label>
              <Select 
                isMulti={roleType === 'STATION_MANAGER' && !editingId}
                options={testTypes.map(tt => ({ value: String(tt.id), label: tt.name }))}
                value={testTypes.filter(tt => selectedTestTypes.includes(String(tt.id))).map(tt => ({ value: String(tt.id), label: tt.name }))}
                onChange={(selected: any) => {
                  if (Array.isArray(selected)) {
                    setSelectedTestTypes(selected.map((s: any) => s.value));
                  } else {
                    setSelectedTestTypes(selected ? [selected.value] : []);
                  }
                }}
                placeholder="Tìm trạm thi..."
                isClearable
                styles={{ 
                  control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                  menu: (base: any) => ({ ...base, zIndex: 9999 })
                }}
              />
            </div>

            {roleType === 'EXAMINER' && (
              <div className="form-group">
                <label className="form-label">Bài thi</label>
                <Select
                  isMulti
                  options={filteredExams.map(e => ({ value: String(e.id), label: e.name }))}
                  value={filteredExams.filter(e => selectedExams.includes(String(e.id))).map(e => ({ value: String(e.id), label: e.name }))}
                  onChange={(selected: any) => setSelectedExams(selected ? selected.map((s: any) => s.value) : [])}
                  placeholder="Tìm chọn bài thi..."
                  styles={{ 
                    control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                    menu: (base: any) => ({ ...base, zIndex: 9999 })
                  }}
                  noOptionsMessage={() => "Không tìm thấy bài thi"}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Số xe {roleType === 'EXAMINER' ? '(Theo Trưởng trạm)' : ''}
              </label>
              <Select
                isMulti
                options={availableVehicles.map(v => ({ value: String(v.id), label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))}
                value={availableVehicles.filter(v => selectedVehicles.includes(String(v.id))).map(v => ({ value: String(v.id), label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))}
                onChange={(selected: any) => {
                  setSelectedVehicles(selected ? selected.map((s: any) => s.value) : []);
                }}
                placeholder="Tìm chọn số xe..."
                styles={{ 
                  control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                  menu: (base: any) => ({ ...base, zIndex: 9999 })
                }}
                noOptionsMessage={() => "Không tìm thấy số xe"}
              />
            </div>

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

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">{editingId ? 'Cập nhật Phân Công' : 'Lưu Phân Công'}</button>
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
              <div style={{ width: '220px' }}>
                <Select 
                  options={[
                    { value: 'all', label: 'Tất cả Vai trò' },
                    { value: 'STATION_MANAGER', label: 'Trưởng trạm' },
                    { value: 'EXAMINER', label: 'Giám khảo' }
                  ]}
                  value={[
                    { value: 'all', label: 'Tất cả Vai trò' },
                    { value: 'STATION_MANAGER', label: 'Trưởng trạm' },
                    { value: 'EXAMINER', label: 'Giám khảo' }
                  ].find(opt => opt.value === roleFilter)}
                  onChange={(selected: any) => { setRoleFilter(selected ? selected.value : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc Vai trò..."
                  isClearable={false}
                  styles={{ 
                    control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                    menu: (base: any) => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
              <div style={{ width: '220px' }}>
                <Select 
                  options={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...courses.map((c: any) => ({ value: String(c.id), label: c.name }))]}
                  value={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...courses.map((c: any) => ({ value: String(c.id), label: c.name }))].find((opt: any) => opt.value === courseFilter)}
                  onChange={(selected: any) => { setCourseFilter(selected ? selected.value : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc Khóa đào tạo..."
                  isClearable={false}
                  styles={{ 
                    control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                    menu: (base: any) => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
              <div style={{ width: '220px' }}>
                <Select 
                  options={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...testTypes.map((t: any) => ({ value: String(t.id), label: t.name }))]}
                  value={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...testTypes.map((t: any) => ({ value: String(t.id), label: t.name }))].find((opt: any) => opt.value === testTypeFilter)}
                  onChange={(selected: any) => { setTestTypeFilter(selected ? selected.value : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc Trạm thi..."
                  isClearable={false}
                  styles={{ 
                    control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }),
                    menu: (base: any) => ({ ...base, zIndex: 9999 })
                  }}
                />
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
                <th>Số xe</th>
                <th>Thời gian thực hiện</th>
                <th className="sticky-col-right" style={{ textAlign: 'center' }}>Thao tác</th>
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
                  <td>{a.testType?.name}</td>
                  <td>{a.exam?.name || '-'}</td>
                  <td>
                    {a.vehicles && a.vehicles.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {a.vehicles.map((v: any) => (
                          <span key={v.id} className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>{v.name}</span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{a.assignmentDate ? new Date(a.assignmentDate).toLocaleDateString('vi-VN') : '-'}</td>
                  <td className="sticky-col-right" style={{ textAlign: 'center' }}>
                    <button className="action-btn btn-edit" onClick={() => handleEdit(a)} title="Sửa phân công" style={{ marginRight: '8px' }}>
                      <Edit size={16} />
                    </button>
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
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa phân công này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </AdminLayout>
  );
};

export default AssignmentManager;
