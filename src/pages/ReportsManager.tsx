import { useEffect, useState } from 'react';
import axios from 'axios';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const ReportsManager = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'MANAGER') {
        window.location.href = '/manager';
        return;
      }
      fetchData(parsedUser);
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchData = async (currentUser: any) => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}`),
        axios.get(`${API_BASE_URL}/api/manager/courses`)
      ]);
      setStudents(studentsRes.data.students || []);
      setCourses(coursesRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu');
    }
  };

  const getStudentReport = (student: any) => {
    const trs = student.testResults || [];
    const completedCount = trs.filter((tr: any) => ['TRANSFERRED', 'ABSENT', 'FINISHED'].includes(tr.status)).length;
    
    let isCompleted = completedCount >= 3;
    let isFail = false;
    
    let scoreSaHinh = '-';
    let scoreChuZ = '-';
    let scoreDuongTruong = '-';
    
    trs.forEach((tr: any) => {
      const name = tr.testType?.name?.toLowerCase() || '';
      let scoreVal: number | string = '-';
      
      if (tr.status === 'ABSENT') {
        scoreVal = 'Vắng';
        isFail = true;
      } else if (tr.status === 'IN_PROGRESS') {
        scoreVal = 'Đang thi';
      } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
        scoreVal = tr.totalScore;
        if (tr.totalScore < 80) isFail = true;
        if (tr.status === 'FAILED') isFail = true; // Legacy support
      }
      
      if (name.includes('sa hình')) scoreSaHinh = scoreVal as any;
      if (name.includes('chữ z')) scoreChuZ = scoreVal as any;
      if (name.includes('đường trường')) scoreDuongTruong = scoreVal as any;
    });

    let finalStatus = '';
    if (!isCompleted) finalStatus = 'CHƯA HOÀN THÀNH';
    else if (isFail) finalStatus = 'RỚT';
    else finalStatus = 'ĐẬU';

    return {
      ...student,
      scoreSaHinh,
      scoreChuZ,
      scoreDuongTruong,
      finalStatus
    };
  };

  const processedStudents = students.map(getStudentReport);

  const filteredStudents = processedStudents.filter(s => {
    let match = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      match = (s.name?.toLowerCase().includes(q) || s.cccd?.includes(q) || s.registrationCode?.toLowerCase().includes(q));
    }
    if (match && filterCourse !== 'ALL') {
      match = (s.courseId === parseInt(filterCourse) || s.courseName === filterCourse);
    }
    if (match && filterStatus !== 'ALL') {
      if (filterStatus === 'PASS' && s.finalStatus !== 'ĐẬU') match = false;
      if (filterStatus === 'FAIL' && s.finalStatus !== 'RỚT') match = false;
      if (filterStatus === 'INCOMPLETE' && s.finalStatus !== 'CHƯA HOÀN THÀNH') match = false;
    }
    return match;
  });

  const totalCompleted = filteredStudents.filter(s => s.finalStatus === 'ĐẬU' || s.finalStatus === 'RỚT');
  const totalPass = totalCompleted.filter(s => s.finalStatus === 'ĐẬU').length;
  const totalFail = totalCompleted.filter(s => s.finalStatus === 'RỚT').length;
  const passRate = totalCompleted.length > 0 ? Math.round((totalPass / totalCompleted.length) * 100) : 0;

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout user={user}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .sidebar { display: none !important; }
            .main-content { margin-left: 0 !important; width: 100% !important; padding: 0 !important; }
            body { background: white !important; }
            .card { box-shadow: none !important; border: none !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #ddd !important; padding: 8px !important; }
          }
          .print-only { display: none; }
        `}
      </style>
      <div className="container print-container">
        <div className="flex justify-between items-center mb-4 no-print">
          <h2 style={{ margin: 0 }}>Báo cáo - Thống kê Sát hạch</h2>
          <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} /> In Báo cáo
          </button>
        </div>

        {/* Print Header */}
        <div className="print-only" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2>BÁO CÁO KẾT QUẢ SÁT HẠCH</h2>
          <p>Thời gian in: {new Date().toLocaleString('vi-VN')}</p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid no-print" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Tổng học viên</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{filteredStudents.length}</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Số lượng Đậu</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{totalPass}</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Số lượng Rớt</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{totalFail}</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Tỷ lệ Đậu</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{passRate}%</div>
          </div>
        </div>

        <div className="card" style={{ padding: '0' }}>
          <div className="no-print" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm theo Tên, CCCD..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ width: '200px' }}>
              <select className="form-control" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                <option value="ALL">Tất cả Khóa đào tạo</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ width: '200px' }}>
              <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Tất cả kết quả</option>
                <option value="PASS">ĐẬU</option>
                <option value="FAIL">RỚT</option>
                <option value="INCOMPLETE">Chưa hoàn thành</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ và Tên</th>
                  <th>CCCD</th>
                  <th>Khóa đào tạo</th>
                  <th style={{ textAlign: 'center' }}>Sa hình</th>
                  <th style={{ textAlign: 'center' }}>Hình chữ Z</th>
                  <th style={{ textAlign: 'center' }}>Đường trường</th>
                  <th style={{ textAlign: 'center' }}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s, index) => (
                  <tr key={s.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.cccd}</td>
                    <td>{s.courseName || (s.course && s.course.name) || '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreSaHinh}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreChuZ}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scoreDuongTruong}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {s.finalStatus === 'ĐẬU' && <span style={{ color: 'var(--success)' }}>ĐẬU</span>}
                      {s.finalStatus === 'RỚT' && <span style={{ color: 'var(--danger)' }}>RỚT</span>}
                      {s.finalStatus === 'CHƯA HOÀN THÀNH' && <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Chưa hoàn thành</span>}
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Không tìm thấy dữ liệu thống kê phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="no-print" style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Trước
              </button>
              <span style={{ padding: '0.5rem 1rem' }}>Trang {currentPage} / {totalPages}</span>
              <button 
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportsManager;
