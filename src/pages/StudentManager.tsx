import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { removeAccents } from '../utils/stringUtils';
import AdminLayout from '../components/AdminLayout';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  
  // Check if it's an Excel serial date (numeric)
  if (!isNaN(Number(dateStr)) && Number(dateStr) > 10000 && Number(dateStr) < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Clean time part if exists like "12/01/2002 12:00:00 SA"
  const cleanDateStr = dateStr.toString().split(' ')[0];

  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY/MM/DD or YYYY/DD/MM
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else { 
        // DD/MM/YYYY or MM/DD/YYYY
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  } else if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
  }

  // Try parsing ISO
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()) && dateStr.includes('T')) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return cleanDateStr;
};

const StudentManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [courseName, setCourseName] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [cccd, setCccd] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [licenseIssueDate, setLicenseIssueDate] = useState('');
  const [passDate, setPassDate] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [licenseDuration, setLicenseDuration] = useState('');
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/students`);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cccd || !name) {
      toast.error('CCCD và Họ tên là bắt buộc');
      return;
    }
    
    try {
      const payload = { 
        registrationCode, name, dob, cccd, address, licenseNumber, 
        licenseClass, licenseIssueDate, passDate, licenseExpiryDate, 
        licenseDuration, courseName 
      };
      
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/students/${editingId}`, payload);
        toast.success('Cập nhật Học viên thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/students`, payload);
        toast.success('Thêm Học viên thành công!');
      }
      resetForm();
      fetchStudents();
      setActiveTab('list');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Có lỗi xảy ra!');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCourseName('');
    setRegistrationCode('');
    setName('');
    setDob('');
    setCccd('');
    setAddress('');
    setLicenseNumber('');
    setLicenseClass('');
    setLicenseIssueDate('');
    setPassDate('');
    setLicenseExpiryDate('');
    setLicenseDuration('');
  };

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setCourseName(student.courseName || '');
    setRegistrationCode(student.registrationCode || '');
    setName(student.name);
    setDob(student.dob || '');
    setCccd(student.cccd);
    setAddress(student.address || '');
    setLicenseNumber(student.licenseNumber || '');
    setLicenseClass(student.licenseClass || '');
    setLicenseIssueDate(student.licenseIssueDate || '');
    setPassDate(student.passDate || '');
    setLicenseExpiryDate(student.licenseExpiryDate || '');
    setLicenseDuration(student.licenseDuration || '');
    setActiveTab('add');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa Học viên này không? Các bài thi liên quan cũng sẽ bị xóa.')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/manager/students/${id}`);
        toast.success('Xóa Học viên thành công!');
        fetchStudents();
      } catch (err) {
        toast.error('Lỗi khi xóa Học viên');
      }
    }
  };

  // Derive available courses for filter from actual student data
  const uniqueCoursesMap = new Map();
  students.forEach((s: any) => {
    if (s.courseName) uniqueCoursesMap.set(s.courseName, s.courseName);
  });
  const availableCourses = Array.from(uniqueCoursesMap.values());

  const uniqueLicenseMap = new Map();
  students.forEach((s: any) => {
    if (s.licenseClass) uniqueLicenseMap.set(s.licenseClass, s.licenseClass);
  });
  const availableLicenseClasses = Array.from(uniqueLicenseMap.values());

  const filteredStudents = students.filter((s: any) => {
    const keyword = removeAccents(searchKeyword);
    const matchSearch = removeAccents(s.name).includes(keyword) || 
                        removeAccents(s.cccd).includes(keyword) ||
                        removeAccents(s.registrationCode || '').includes(keyword) ||
                        removeAccents(s.courseName || '').includes(keyword);
    const matchCourse = courseFilter === 'all' ? true : s.courseName === courseFilter;
    return matchSearch && matchCourse;
  });
  
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const displayedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredStudents.map((s: any, index: number) => ({
      'STT': index + 1,
      'Khóa đào tạo': s.courseName || '',
      'Mã ĐK': s.registrationCode || '',
      'Họ tên': s.name,
      'Ngày sinh': s.dob || '',
      'CCCD': s.cccd,
      'Địa chỉ': s.address || '',
      'Số GPLX': s.licenseNumber || '',
      'Hạng': s.licenseClass || '',
      'Ngày cấp': s.licenseIssueDate || '',
      'Ngày trúng tuyển': s.passDate || '',
      'Ngày hết hạn': s.licenseExpiryDate || '',
      'Thời gian GPLX': s.licenseDuration || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HocVien');
    XLSX.writeFile(workbook, 'danh-sach-hoc-vien.xlsx');
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Khóa đào tạo': 'K186',
      'Mã ĐK': '79016-20260323093734413',
      'Họ tên': 'NGUYỄN VĂN MẪU',
      'Ngày sinh': '12/01/2002',
      'CCCD': '031202003583',
      'Địa chỉ': '212B Nguyễn Trãi, Quận 1, TP.HCM',
      'Số GPLX': '790213038809',
      'Hạng': 'A1',
      'Ngày cấp': '02/04/2021 12:00:00 SA',
      'Ngày trúng tuyển': '27/03/2021 12:00:00 SA',
      'Ngày hết hạn': '01/01/1900 12:00:00 SA',
      'Thời gian GPLX': '0'
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'mau-nhap-hoc-vien.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Use defval to get all columns even if empty
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Map Excel headers to payload
        const payload = data.map((row: any) => ({
          courseName: row['Khóa đào tạo']?.toString() || '',
          registrationCode: row['Mã ĐK']?.toString() || '',
          name: row['Họ tên']?.toString() || '',
          dob: row['Ngày sinh']?.toString() || '',
          cccd: row['CCCD']?.toString() || '',
          address: row['Địa chỉ']?.toString() || '',
          licenseNumber: row['Số GPLX']?.toString() || '',
          licenseClass: row['Hạng']?.toString() || '',
          licenseIssueDate: row['Ngày cấp']?.toString() || '',
          passDate: row['Ngày trúng tuyển']?.toString() || '',
          licenseExpiryDate: row['Ngày hết hạn']?.toString() || '',
          licenseDuration: row['Thời gian GPLX']?.toString() || ''
        }));

        const toastId = toast.loading('Đang xử lý dữ liệu...');
        
        const res = await axios.post(`${API_BASE_URL}/api/manager/students/bulk`, { students: payload });
        
        toast.success(`Đã nhập thành công ${res.data.imported} học viên (cập nhật ${res.data.updated} học viên)`, { id: toastId });
        fetchStudents();
      } catch (err: any) {
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.', { id: 'excel-error' });
        console.error(err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <AdminLayout user={user}>
      <h2 className="mb-4">Quản lý Học viên</h2>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Học viên
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Học viên' : 'Thêm Học viên mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm tên, CCCD, Mã ĐK..." 
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                style={{ minWidth: '200px', flex: 1, maxWidth: '250px' }}
              />
              <div style={{ width: '200px' }}>
                <Select
                  options={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))]}
                  value={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))].find((opt: any) => opt.value === courseFilter)}
                  onChange={(selected: any) => { setCourseFilter(selected ? selected.value : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc Khóa đào tạo..."
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>
            </div>
            
            <div className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋 Tải File Mẫu</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>⬆️ Nhập Excel</span>
              </button>

              <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📥 Xuất Excel</span>
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>STT</th>
                  <th>Khóa</th>
                  <th>Mã ĐK</th>
                  <th>Họ tên</th>
                  <th>Ngày sinh</th>
                  <th>CCCD</th>
                  <th>Hạng</th>
                  <th style={{ width: '120px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {displayedStudents.length > 0 ? displayedStudents.map((student: any, idx: number) => (
                  <tr key={student.id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td><span className="badge badge-info">{student.courseName || '-'}</span></td>
                    <td>{student.registrationCode || '-'}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{formatDate(student.dob)}</td>
                    <td>{student.cccd}</td>
                    <td>{student.licenseClass ? <span className="badge badge-warning">{student.licenseClass}</span> : '-'}</td>
                    <td>
                      <button className="action-btn btn-edit" onClick={() => handleEdit(student)}>Sửa</button>
                      <button className="action-btn btn-delete" onClick={() => handleDelete(student.id)}>Xóa</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Chưa có Học viên nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredStudents.length)} trong tổng số {filteredStudents.length}
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

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Học viên' : 'Thêm Học viên mới'}</h3>
          <form onSubmit={handleAddStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Họ tên (*)</label>
                <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>CCCD (*)</label>
                <input type="text" className="form-control" value={cccd} onChange={e => setCccd(e.target.value)} required />
              </div>
              
              <div className="form-group">
                <label>Mã Đăng ký</label>
                <input type="text" className="form-control" value={registrationCode} onChange={e => setRegistrationCode(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Khóa đào tạo</label>
                <CreatableSelect
                  isClearable
                  placeholder="Chọn hoặc nhập Khóa mới..."
                  options={availableCourses.map((c: any) => ({ value: c, label: c }))}
                  value={courseName ? { value: courseName, label: courseName } : null}
                  onChange={(selected: any) => setCourseName(selected ? selected.value : '')}
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>
              
              <div className="form-group">
                <label>Ngày sinh (VD: 12/01/2002)</label>
                <input type="text" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hạng GPLX</label>
                <CreatableSelect
                  isClearable
                  placeholder="Chọn hoặc nhập Hạng GPLX..."
                  options={availableLicenseClasses.map((c: any) => ({ value: c, label: c }))}
                  value={licenseClass ? { value: licenseClass, label: licenseClass } : null}
                  onChange={(selected: any) => setLicenseClass(selected ? selected.value : '')}
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Địa chỉ</label>
                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Số GPLX hiện tại</label>
                <input type="text" className="form-control" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Thời gian GPLX</label>
                <input type="text" className="form-control" value={licenseDuration} onChange={e => setLicenseDuration(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Ngày cấp</label>
                <input type="text" className="form-control" value={licenseIssueDate} onChange={e => setLicenseIssueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Ngày hết hạn</label>
                <input type="text" className="form-control" value={licenseExpiryDate} onChange={e => setLicenseExpiryDate(e.target.value)} />
              </div>
              
              <div className="form-group">
                <label>Ngày trúng tuyển</label>
                <input type="text" className="form-control" value={passDate} onChange={e => setPassDate(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Học viên</button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default StudentManager;
