import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { removeAccents } from '../utils/stringUtils';
import AdminLayout from '../components/AdminLayout';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

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

const parseDateStr = (dateStr: string) => {
  if (!dateStr) return null;
  if (!isNaN(Number(dateStr)) && Number(dateStr) > 10000 && Number(dateStr) < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
  }
  const cleanStr = dateStr.toString().split(' ')[0];
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const toDateInputValue = (dateStr: string) => {
  const d = parseDateStr(dateStr);
  if (d && !isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  const val = e.target.value;
  if (!val) {
    setter('');
    return;
  }
  const parts = val.split('-');
  if (parts.length === 3) {
    setter(`${parts[2]}/${parts[1]}/${parts[0]}`);
  } else {
    setter(val);
  }
};

const StudentManager = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [students, setStudents] = useState([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
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
  
  const [viewStudent, setViewStudent] = useState<any>(null);
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/students`);
      setStudents(res.data);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu Học viên');
    }
  };

  const fetchDbCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      setDbCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDbCourses();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const course = params.get('course');
    if (course) {
      setCourseFilter(course);
    }
  }, [location.search]);

  useEffect(() => {
    if (licenseIssueDate && licenseExpiryDate) {
      const issue = parseDateStr(licenseIssueDate);
      const expiry = parseDateStr(licenseExpiryDate);
      if (issue && expiry && !isNaN(issue.getTime()) && !isNaN(expiry.getTime())) {
        const diffYears = expiry.getFullYear() - issue.getFullYear();
        if (diffYears > 0) {
          setLicenseDuration(`${diffYears} năm`);
        }
      }
    }
  }, [licenseIssueDate, licenseExpiryDate]);

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
    setName(student.name);
    setCccd(student.cccd);
    setRegistrationCode(student.registrationCode || '');
    setCourseName(student.courseName || '');
    setDob(formatDate(student.dob) === '-' ? '' : formatDate(student.dob));
    setAddress(student.address || '');
    setLicenseNumber(student.licenseNumber || '');
    setLicenseClass(student.licenseClass || '');
    setLicenseIssueDate(formatDate(student.licenseIssueDate) === '-' ? '' : formatDate(student.licenseIssueDate));
    setLicenseExpiryDate(formatDate(student.licenseExpiryDate) === '-' ? '' : formatDate(student.licenseExpiryDate));
    setPassDate(formatDate(student.passDate) === '-' ? '' : formatDate(student.passDate));
    setLicenseDuration(student.licenseDuration || '');
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/students/${deleteModal.id}`);
      toast.success('Xóa Học viên thành công!');
      setSelectedStudentIds(prev => prev.filter(id => id !== deleteModal.id));
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi khi xóa Học viên');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      await axios.post(`${API_BASE_URL}/api/manager/students/bulk-delete`, {
        ids: selectedStudentIds
      });
      toast.success(`Đã xóa ${selectedStudentIds.length} Học viên!`);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi khi xóa Học viên');
    } finally {
      setBulkDeleteModal(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const idsOnPage = displayedStudents.map((s: any) => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...idsOnPage])));
    } else {
      const idsOnPage = displayedStudents.map((s: any) => s.id);
      setSelectedStudentIds(prev => prev.filter(id => !idsOnPage.includes(id)));
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(prev => [...prev, id]);
    } else {
      setSelectedStudentIds(prev => prev.filter(studentId => studentId !== id));
    }
  };

  // Derive available courses for filter from actual student data
  const uniqueCoursesMap = new Map();
  students.forEach((s: any) => {
    if (s.courseName) uniqueCoursesMap.set(s.courseName, s.courseName);
  });
  const availableCourses = Array.from(uniqueCoursesMap.values());

  const uniqueLicenseMap = new Map();
  uniqueLicenseMap.set('A1', 'A1'); // Ensure A1 is always available
  students.forEach((s: any) => {
    const cls = s.licenseClass?.trim();
    if (cls && cls !== 'A2' && cls !== 'A.01') {
      uniqueLicenseMap.set(cls, cls);
    }
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
  }).sort((a: any, b: any) => {
    const getFirstName = (fullName: string) => {
      if (!fullName) return '';
      const parts = fullName.trim().split(' ');
      return parts[parts.length - 1];
    };
    
    const nameA = removeAccents(getFirstName(a.name)).toLowerCase();
    const nameB = removeAccents(getFirstName(b.name)).toLowerCase();
    
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    
    return removeAccents(a.name).toLowerCase().localeCompare(removeAccents(b.name).toLowerCase());
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
        
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Validate courses
        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];
          const courseName = row['Khóa đào tạo']?.toString().trim();
          if (courseName) {
            const exists = dbCourses.find(c => c.name === courseName);
            if (!exists) {
              toast.error(`Dòng ${i + 2}: Khóa đào tạo "${courseName}" không có trong Danh mục! Vui lòng tạo Khóa trước.`);
              if (fileInputRef.current) fileInputRef.current.value = '';
              return;
            }
          }
        }

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

              {selectedStudentIds.length > 0 && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => setBulkDeleteModal(true)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Trash2 size={16} />
                  <span>Xóa đã chọn ({selectedStudentIds.length})</span>
                </button>
              )}
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={displayedStudents.length > 0 && displayedStudents.every((s: any) => selectedStudentIds.includes(s.id))}
                    />
                  </th>
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
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => handleSelectOne(student.id, e.target.checked)}
                      />
                    </td>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td><span className="badge badge-info">{student.courseName || '-'}</span></td>
                    <td>{student.registrationCode || '-'}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{formatDate(student.dob)}</td>
                    <td>{student.cccd}</td>
                    <td>{student.licenseClass ? <span className="badge badge-warning">{student.licenseClass}</span> : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="action-btn" title="Xem" style={{ color: '#17a2b8' }} onClick={() => setViewStudent(student)}><Eye size={16} /></button>
                        <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(student)}><Edit size={16} /></button>
                        <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(student.id)}><Trash2 size={16} /></button>
                      </div>
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
              {/* 1. Họ tên */}
              <div className="form-group">
                <label>Họ tên (*)</label>
                <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              
              {/* 2. Ngày sinh */}
              <div className="form-group">
                <label>Ngày sinh</label>
                <input type="date" className="form-control" value={toDateInputValue(dob)} onChange={e => handleDateChange(e, setDob)} />
              </div>

              {/* 3. CCCD */}
              <div className="form-group">
                <label>CCCD (*)</label>
                <input type="text" className="form-control" value={cccd} onChange={e => setCccd(e.target.value)} required />
              </div>
              
              {/* 4. Địa chỉ */}
              <div className="form-group">
                <label>Địa chỉ</label>
                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* 5. Khóa đào tạo */}
              <div className="form-group">
                <label>Khóa đào tạo</label>
                <Select
                  isClearable
                  placeholder="Chọn Khóa đào tạo..."
                  options={dbCourses.map((c: any) => ({ value: c.name, label: c.name }))}
                  value={courseName ? { value: courseName, label: courseName } : null}
                  onChange={(selected: any) => setCourseName(selected ? selected.value : '')}
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>

              {/* 6. Mã Đăng ký */}
              <div className="form-group">
                <label>Mã Đăng ký</label>
                <input type="text" className="form-control" value={registrationCode} onChange={e => setRegistrationCode(e.target.value)} />
              </div>
              
              {/* 7. Số GPLX hiện tại */}
              <div className="form-group">
                <label>Số GPLX hiện tại</label>
                <input type="text" className="form-control" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
              </div>

              {/* 8. Hạng GPLX */}
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

              {/* 9. Ngày cấp */}
              <div className="form-group">
                <label>Ngày cấp</label>
                <input type="date" className="form-control" value={toDateInputValue(licenseIssueDate)} onChange={e => handleDateChange(e, setLicenseIssueDate)} />
              </div>

              {/* 10. Ngày hết hạn */}
              <div className="form-group">
                <label>Ngày hết hạn</label>
                <input type="date" className="form-control" value={toDateInputValue(licenseExpiryDate)} onChange={e => handleDateChange(e, setLicenseExpiryDate)} />
              </div>
              
              {/* 11. Ngày trúng tuyển */}
              <div className="form-group">
                <label>Ngày trúng tuyển</label>
                <input type="date" className="form-control" value={toDateInputValue(passDate)} onChange={e => handleDateChange(e, setPassDate)} />
              </div>
              
              {/* 12. Thời gian GPLX */}
              <div className="form-group">
                <label>Thời gian GPLX</label>
                <input type="text" className="form-control" value={licenseDuration} onChange={e => setLicenseDuration(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Học viên</button>
          </form>
        </div>
      )}

      {/* Modal Xem chi tiết */}
      {viewStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setViewStudent(null)}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px',
            minWidth: '500px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Chi tiết Học viên</h3>
              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => setViewStudent(null)}>Đóng</button>
            </div>
            <table className="table" style={{ width: '100%' }}>
              <tbody>
                <tr><td width="30%"><strong>Họ tên:</strong></td><td>{viewStudent.name}</td></tr>
                <tr><td><strong>Ngày sinh:</strong></td><td>{formatDate(viewStudent.dob)}</td></tr>
                <tr><td><strong>CCCD:</strong></td><td>{viewStudent.cccd}</td></tr>
                <tr><td><strong>Địa chỉ:</strong></td><td>{viewStudent.address || '-'}</td></tr>
                <tr><td><strong>Khóa đào tạo:</strong></td><td>{viewStudent.courseName || '-'}</td></tr>
                <tr><td><strong>Mã đăng ký:</strong></td><td>{viewStudent.registrationCode || '-'}</td></tr>
                <tr><td><strong>Số GPLX hiện tại:</strong></td><td>{viewStudent.licenseNumber || '-'}</td></tr>
                <tr><td><strong>Hạng GPLX:</strong></td><td>{viewStudent.licenseClass || '-'}</td></tr>
                <tr><td><strong>Ngày cấp:</strong></td><td>{formatDate(viewStudent.licenseIssueDate)}</td></tr>
                <tr><td><strong>Ngày hết hạn:</strong></td><td>{formatDate(viewStudent.licenseExpiryDate)}</td></tr>
                <tr><td><strong>Ngày trúng tuyển:</strong></td><td>{formatDate(viewStudent.passDate)}</td></tr>
                <tr><td><strong>Thời gian GPLX:</strong></td><td>{viewStudent.licenseDuration || '-'}</td></tr>
              </tbody>
            </table>
            <div className="mt-4" style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => {
                const s = viewStudent;
                setViewStudent(null);
                handleEdit(s);
              }}>Sửa thông tin</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa Học viên này không? Các bài thi liên quan cũng sẽ bị xóa."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      <ConfirmModal
        isOpen={bulkDeleteModal}
        title="Xác nhận xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xóa ${selectedStudentIds.length} Học viên đã chọn không? Các bài thi liên quan cũng sẽ bị xóa.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteModal(false)}
      />
    </AdminLayout>
  );
};

export default StudentManager;
