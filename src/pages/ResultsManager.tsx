import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Select from 'react-select';

const ResultsManager = () => {
  const [results, setResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const u = userStr ? JSON.parse(userStr) : null;
    if (u) {
      fetchResults(u);
    }
  }, []);

  const fetchResults = async (currentUser: any) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}`);
      const data = res.data.students || [];
      const assignments = res.data.assignments || [];
      setResults(data);
      setUserAssignments(assignments);
      
      const courses = new Set<string>();
      data.forEach((r: any) => {
        if (r.courseName) courses.add(r.courseName);
        if (r.course?.name) courses.add(r.course.name);
      });
      setAvailableCourses(Array.from(courses));
    } catch (e) {
      toast.error('Lỗi tải dữ liệu kết quả');
    }
  };

  useEffect(() => {
    let temp = [...results];
    
    if (searchKeyword.trim() !== '') {
      const kw = searchKeyword.toLowerCase();
      temp = temp.filter(s => 
        s.name?.toLowerCase().includes(kw) ||
        s.cccd?.includes(kw) ||
        s.registrationCode?.toLowerCase().includes(kw)
      );
    }
    
    if (courseFilter !== 'all') {
      temp = temp.filter(s => 
        s.courseName === courseFilter || 
        s.course?.name === courseFilter
      );
    }
    
    setFilteredResults(temp);
    setCurrentPage(1);
  }, [searchKeyword, courseFilter, results]);

  const exportToExcel = () => {
    if (filteredResults.length === 0) return toast.error('Không có dữ liệu để xuất');
    
    const exportData = filteredResults.map((s, i) => {
      const getScore = (name: string) => {
        const tr = s.testResults?.find((t: any) => t.testType?.name?.toLowerCase().includes(name.toLowerCase()));
        if (!tr) return '-';
        const userStr = localStorage.getItem('user');
        const u = userStr ? JSON.parse(userStr) : null;
        if (u?.role === 'ADMIN' || u?.role === 'MANAGER') {
          if (tr.status !== 'TRANSFERRED') return '-';
        } else {
          const myAssignment = userAssignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
          if (myAssignment?.testType?.id !== tr.testTypeId) return 'Ẩn';
        }
        return tr.totalScore;
      };
      
      const transferredCount = s.testResults?.filter((tr: any) => tr.status === 'TRANSFERRED').length || 0;
      let statusStr = 'Chưa thi';
      if (transferredCount >= 3) statusStr = 'Hoàn thành';
      else if (s.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS')) statusStr = 'Đang thi';
      else if (s.testResults?.find((tr: any) => tr.status === 'FINISHED')) statusStr = 'Đã kết thúc';
      else if (transferredCount > 0) statusStr = 'Đang chờ';

      const row: any = {
        'STT': i + 1,
        'Họ và Tên': s.name ? s.name.toLowerCase().replace(/(^|\s)\S/g, (l: string) => l.toUpperCase()) : '',
        'CCCD': s.cccd,
        'Khóa đào tạo': s.courseName || (s.course && s.course.name) || '-'
      };
      
      const userStr = localStorage.getItem('user');
      const u = userStr ? JSON.parse(userStr) : null;
      
      const showCol = (name: string) => {
        if (u?.role === 'ADMIN' || u?.role === 'MANAGER') return true;
        if (u?.role === 'STATION_MANAGER') {
          return userAssignments.some((a: any) => a.testType?.name?.toLowerCase().includes(name.toLowerCase()));
        }
        return true;
      };

      if (showCol('sa hình')) row['Sa hình'] = getScore('sa hình');
      if (showCol('chữ z')) row['Hình chữ Z'] = getScore('chữ z');
      if (showCol('đường trường')) row['Đường trường'] = getScore('đường trường');
      
      row['Trạng thái'] = statusStr;
      
      return row;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KetQua');
    XLSX.writeFile(workbook, 'DanhSachKetQua.xlsx');
  };

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const displayedResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const showCol = (name: string) => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') return true;
    if (user?.role === 'STATION_MANAGER') {
      return userAssignments.some((a: any) => a.testType?.name?.toLowerCase().includes(name.toLowerCase()));
    }
    return true;
  };

  return (
    <AdminLayout user={user}>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0 }}>Kết quả Sát hạch</h2>
        </div>
        
        <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 250px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm tên, CCCD, Mã ĐK..." 
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Select
              options={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))]}
              value={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))].find((opt: any) => opt.value === courseFilter)}
              onChange={(selected: any) => setCourseFilter(selected ? selected.value : 'all')}
              placeholder="Lọc Khóa đào tạo..."
            />
          </div>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ flexShrink: 0 }}>
            📥 Xuất Excel
          </button>
        </div>
        
        <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
          <table className="table" style={{ minWidth: '1000px' }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>STT</th>
                <th>Họ và Tên</th>
                <th>CCCD</th>
                <th>Khóa đào tạo</th>
                {showCol('sa hình') && <th style={{ textAlign: 'center' }}>Sa hình</th>}
                {showCol('chữ z') && <th style={{ textAlign: 'center' }}>Hình chữ Z</th>}
                {showCol('đường trường') && <th style={{ textAlign: 'center' }}>Đường trường</th>}
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {displayedResults.length > 0 ? displayedResults.map((s, idx) => {
                const renderScore = (name: string) => {
                  const tr = s.testResults?.find((t: any) => t.testType?.name?.toLowerCase().includes(name.toLowerCase()));
                  if (!tr) return '-';
                  
                  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
                    if (tr.status !== 'TRANSFERRED') return '-';
                  } else {
                    // For STATION_MANAGER, they only see their assigned station
                    const myAssignment = userAssignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                    if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                  }
                  
                  return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                };
                
                const transferredCount = s.testResults?.filter((tr: any) => tr.status === 'TRANSFERRED').length || 0;
                let statusStr = 'Chưa thi';
                if (transferredCount >= 3) statusStr = 'Hoàn thành';
                else if (s.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS')) statusStr = 'Đang thi';
                else if (s.testResults?.find((tr: any) => tr.status === 'FINISHED')) statusStr = 'Đã kết thúc';
                else if (transferredCount > 0) statusStr = 'Đang chờ';

                return (
                  <tr key={s.id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td style={{ textTransform: 'capitalize' }}><strong>{s.name?.toLowerCase()}</strong></td>
                    <td>{s.cccd}</td>
                    <td>{s.courseName || (s.course && s.course.name) || '-'}</td>
                    {showCol('sa hình') && (
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {renderScore('sa hình')}
                      </td>
                    )}
                    {showCol('chữ z') && (
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {renderScore('chữ z')}
                      </td>
                    )}
                    {showCol('đường trường') && (
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {renderScore('đường trường')}
                      </td>
                    )}
                    <td>
                      <div className={`badge ${statusStr === 'Hoàn thành' ? 'badge-success' : statusStr === 'Đang thi' ? 'badge-primary' : statusStr === 'Đã kết thúc' ? 'badge-info' : statusStr === 'Đang chờ' ? 'badge-warning' : 'badge-secondary'}`} style={{ display: 'inline-flex', padding: '0.4rem 0.6rem', color: statusStr === 'Đã kết thúc' ? '#fff' : '' }}>
                        {statusStr}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu kết quả phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="pagination-wrapper mt-4">
            <span className="text-muted">
              Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredResults.length)} trong tổng số {filteredResults.length}
            </span>
            <div className="pagination flex" style={{ gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                  className={"btn " + (currentPage === page ? 'btn-primary' : 'btn-outline')}
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
    </AdminLayout>
  );
};

export default ResultsManager;
