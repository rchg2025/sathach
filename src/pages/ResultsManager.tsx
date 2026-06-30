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
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/results`);
      const data = res.data;
      setResults(data);
      
      const courses = new Set<string>();
      data.forEach((r: any) => {
        if (r.student?.courseName) courses.add(r.student.courseName);
        if (r.student?.course?.name) courses.add(r.student.course.name);
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
      temp = temp.filter(r => 
        r.student?.name?.toLowerCase().includes(kw) ||
        r.student?.cccd?.includes(kw) ||
        r.student?.registrationCode?.toLowerCase().includes(kw)
      );
    }
    
    if (courseFilter !== 'all') {
      temp = temp.filter(r => 
        r.student?.courseName === courseFilter || 
        r.student?.course?.name === courseFilter
      );
    }
    
    setFilteredResults(temp);
    setCurrentPage(1);
  }, [searchKeyword, courseFilter, results]);

  const exportToExcel = () => {
    if (filteredResults.length === 0) return toast.error('Không có dữ liệu để xuất');
    
    const exportData = filteredResults.map((r, i) => {
      const currentProgress = r.progress?.find((p: any) => p.status === 'IN_PROGRESS');
      const currentExamStr = currentProgress ? currentProgress.exam?.name : (r.status === 'PASSED' || r.status === 'FAILED' ? 'Đã hoàn thành' : '-');

      return {
        'STT': i + 1,
        'Khóa đào tạo': r.student?.course?.name || r.student?.courseName || '-',
        'Họ và Tên': r.student?.name,
        'CCCD': r.student?.cccd,
        'Trạm thi': r.testType?.name || '-',
        'Bài thi (đang diễn ra)': currentExamStr,
      'Điểm bị trừ': Math.max(0, 100 - r.totalScore),
      'Điểm còn lại': r.totalScore,
      'Trạng thái': r.status === 'PASSED' ? 'Đạt' : r.status === 'FAILED' ? 'Trượt' : 'Đang chờ'
      };
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

  return (
    <AdminLayout user={user}>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0 }}>Kết quả Sát hạch</h2>
        </div>
        
        <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="🔍 Tìm kiếm tên, CCCD, Mã ĐK..." 
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            style={{ minWidth: '200px', flex: 1, maxWidth: '250px' }}
          />
          <div style={{ width: '200px' }}>
            <Select
              options={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))]}
              value={[{ value: 'all', label: 'Tất cả Khóa đào tạo' }, ...availableCourses.map((c: any) => ({ value: c, label: c }))].find((opt: any) => opt.value === courseFilter)}
              onChange={(selected: any) => setCourseFilter(selected ? selected.value : 'all')}
              placeholder="Lọc Khóa đào tạo..."
            />
          </div>
          <button className="btn btn-primary" onClick={exportToExcel}>
            📥 Xuất Excel
          </button>
        </div>
        
        <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
          <table className="table" style={{ minWidth: '1000px' }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>STT</th>
                <th>Khóa đào tạo</th>
                <th>Họ và Tên</th>
                <th>CCCD</th>
                <th>Trạm thi</th>
                <th>Bài thi (đang diễn ra)</th>
                <th style={{ color: 'var(--danger)', textAlign: 'center' }}>Điểm bị trừ</th>
                <th style={{ color: 'var(--success)', textAlign: 'center' }}>Điểm còn lại</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {displayedResults.length > 0 ? displayedResults.map((r, idx) => {
                const currentProgress = r.progress?.find((p: any) => p.status === 'IN_PROGRESS');
                const currentExamStr = currentProgress ? currentProgress.exam?.name : (r.status === 'PASSED' || r.status === 'FAILED' ? 'Đã hoàn thành' : '-');
                
                return (
                  <tr key={r.id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td><span className="badge badge-info">{r.student?.course?.name || r.student?.courseName || '-'}</span></td>
                    <td><strong>{r.student?.name}</strong></td>
                    <td>{r.student?.cccd}</td>
                    <td>{r.testType?.name}</td>
                    <td>
                      {currentProgress ? <span className="badge badge-primary">{currentExamStr}</span> : currentExamStr}
                    </td>
                  <td style={{ color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>{Math.max(0, 100 - r.totalScore)}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' }}>{r.totalScore}</td>
                  <td>
                    {r.status === 'PASSED' ? <span className="badge badge-success">Đạt</span> :
                     r.status === 'FAILED' ? <span className="badge badge-danger">Trượt</span> :
                     <span className="badge badge-warning">Đang chờ</span>}
                  </td>
                </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu kết quả phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-muted">
              Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredResults.length)} trong tổng số {filteredResults.length}
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
