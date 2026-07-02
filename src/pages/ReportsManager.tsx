import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Printer, FileText, AlertTriangle, Download, Edit, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import AdminLayout from '../components/AdminLayout';
import PrintTemplate from '../components/PrintTemplate';
import PrintErrorTemplate from '../components/PrintErrorTemplate';
import { API_BASE_URL } from '../config';
import { useDebounce } from '../hooks/useDebounce';

const ReportsManager = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [printStudents, setPrintStudents] = useState<any[]>([]);
  const [printType, setPrintType] = useState<'RESULT' | 'ERROR'>('RESULT');
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editingScores, setEditingScores] = useState<any[]>([]);
  
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
      fetchData(parsedUser, filterDate);
    } else {
      window.location.href = '/login';
    }
  }, [filterDate]);

  const fetchData = async (currentUser: any, date: string) => {
    try {
      const [studentsRes, coursesRes, testTypesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}&date=${date}`),
        axios.get(`${API_BASE_URL}/api/manager/courses`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`)
      ]);
      setStudents(studentsRes.data.students || []);
      setAssignments(studentsRes.data.assignments || []);
      setCourses(coursesRes.data || []);
      setTestTypes(testTypesRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu');
    }
  };

  const displayedTestTypes = useMemo(() => {
    const assignedIds = new Set(assignments.map((a: any) => a.testTypeId));
    return testTypes.filter(tt => assignedIds.has(tt.id));
  }, [testTypes, assignments]);

  const getStudentReport = (student: any, activeTestTypes: any[]) => {
    const allTrs = student.testResults || [];
    // Split into today and past
    const todayTrs: any[] = [];
    const pastTrs: any[] = [];
    
    allTrs.forEach((t: any) => {
      // simplified comparison, filterDate is YYYY-MM-DD
      const tDateObj = new Date(t.createdAt);
      const tDateStr = new Date(tDateObj.getTime() + 7*3600*1000).toISOString().split('T')[0];
      if (tDateStr === filterDate) {
        todayTrs.push(t);
      } else {
        pastTrs.push(t);
      }
    });

    let isFail = false;
    let isAbsent = false;
    let completedCount = 0;
    const scores: any = {};
    const originalScores: any = {};
    
    activeTestTypes.forEach((tt: any) => {
      // 1. Try to find today's result
      let tr = todayTrs.find((t: any) => t.testTypeId === tt.id);
      
      // 2. If no today's result, find a PAST PASSED result (Bảo lưu)
      let isPreserved = false;
      if (!tr) {
        const pastPassed = pastTrs.filter(t => 
          t.testTypeId === tt.id && 
          ['TRANSFERRED', 'FINISHED'].includes(t.status) && 
          t.totalScore >= (tt.passingScore ?? 80) &&
          t.status !== 'FAILED'
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (pastPassed.length > 0) {
          tr = pastPassed[0];
          isPreserved = true;
        }
      }

      if (!tr) {
         scores[tt.id] = '-';
      } else {
        let scoreVal: number | string = '-';
        if (tr.status === 'ABSENT') {
          scoreVal = 'Vắng';
          isAbsent = true;
          completedCount++;
        } else if (tr.status === 'IN_PROGRESS') {
          scoreVal = 'Đang thi';
        } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
          scoreVal = tr.totalScore;
          completedCount++;
          const passingScore = tt.passingScore ?? 80;
          if (tr.totalScore < passingScore) isFail = true;
          if (tr.status === 'FAILED') isFail = true;
        }
        
        scores[tt.id] = scoreVal;
        originalScores[tt.id] = scoreVal;
      }
    });

    let finalStatus = '';
    if (isAbsent) finalStatus = 'VẮNG';
    else if (isFail) finalStatus = 'RỚT';
    else if (activeTestTypes.length > 0 && completedCount >= activeTestTypes.length) finalStatus = 'ĐẬU';
    else finalStatus = 'CHƯA HOÀN THÀNH';

    return {
      ...student,
      scores,
      originalScores,
      finalStatus
    };
  };

  const processedStudents = useMemo(() => students.map(s => getStudentReport(s, displayedTestTypes)), [students, displayedTestTypes]);

  const courseFilteredStudents = useMemo(() => {
    return processedStudents.filter(s => {
      if (filterCourse !== 'ALL') {
        const selectedCourseObj = courses.find(c => String(c.id) === filterCourse);
        const selectedCourseName = selectedCourseObj ? selectedCourseObj.name : null;
        return (
          s.courseId === parseInt(filterCourse) || 
          s.courseName === selectedCourseName || 
          (s.course && s.course.name === selectedCourseName)
        );
      }
      return true;
    });
  }, [processedStudents, filterCourse, courses]);

  const filteredStudents = useMemo(() => {
    return courseFilteredStudents.filter(s => {
      let match = true;
      if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        match = (s.name?.toLowerCase().includes(q) || s.cccd?.includes(q) || s.registrationCode?.toLowerCase().includes(q));
      }
      if (match && filterStatus !== 'ALL') {
        if (filterStatus === 'PASS' && s.finalStatus !== 'ĐẬU') match = false;
        if (filterStatus === 'FAIL' && s.finalStatus !== 'RỚT') match = false;
        if (filterStatus === 'ABSENT' && s.finalStatus !== 'VẮNG') match = false;
        if (filterStatus === 'INCOMPLETE' && s.finalStatus !== 'CHƯA HOÀN THÀNH') match = false;
      }
      return match;
    });
  }, [courseFilteredStudents, debouncedSearchQuery, filterStatus]);

  const stats = useMemo(() => {
    const totalCourseStudents = courseFilteredStudents.length;
    const totalPass = courseFilteredStudents.filter(s => s.finalStatus === 'ĐẬU').length;
    const totalFail = courseFilteredStudents.filter(s => s.finalStatus === 'RỚT').length;
    const totalAbsent = courseFilteredStudents.filter(s => s.finalStatus === 'VẮNG').length;
    const totalCompleted = courseFilteredStudents.filter(s => s.finalStatus === 'ĐẬU' || s.finalStatus === 'RỚT' || s.finalStatus === 'VẮNG').length;
    const passRate = totalCompleted > 0 ? Math.round((totalPass / totalCompleted) * 100) : 0;
    
    return { totalCourseStudents, totalPass, totalFail, totalAbsent, passRate };
  }, [courseFilteredStudents]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handlePrint = (studentsToPrint: any[], type: 'RESULT' | 'ERROR' = 'RESULT') => {
    setPrintType(type);
    setPrintStudents(studentsToPrint);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setEditingScores(student.testResults.map((tr: any) => ({
      id: tr.id,
      name: tr.testType?.name || 'Bài thi',
      totalScore: tr.totalScore,
      status: tr.status
    })));
  };
  
  const handleSaveScore = async () => {
    try {
      for (const tr of editingScores) {
        await axios.put(`${API_BASE_URL}/api/manager/test-results/${tr.id}/score?username=${user?.username}`, {
          totalScore: tr.totalScore,
          status: tr.status
        });
      }
      toast.success('Đã cập nhật điểm thi thành công!');
      setEditingStudent(null);
      fetchData(user, filterDate);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi cập nhật điểm thi');
    }
  };

  const exportToExcel = () => {
    const dataForExcel = filteredStudents.map((s, index) => {
      const row: any = {
        'STT': index + 1,
        'Họ và Tên': s.name,
        'CCCD': s.cccd,
        'Khóa đào tạo': s.courseName || (s.course && s.course.name) || '-',
      };
      displayedTestTypes.forEach(tt => {
        row[tt.name] = s.scores[tt.id];
      });
      row['Kết quả'] = s.finalStatus;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThongKeKetQua');
    
    const wscols = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, 
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `ThongKeKetQua_${new Date().getTime()}.xlsx`);
  };

  return (
    <AdminLayout user={user}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .sidebar, .mobile-header { display: none !important; }
            .main-content { margin: 0 !important; width: 100% !important; padding: 0 !important; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
            .card { box-shadow: none !important; border: none !important; background: transparent !important; }
            html, body, #root, .admin-layout, .main-content { height: auto !important; overflow: visible !important; }
          }
          .print-only { display: none; }
        `}
      </style>
      <div className="container print-container">
        <div className="no-print mb-4">
          <h2 style={{ margin: '0 0 1rem 0' }}>Báo cáo - Thống kê Sát hạch</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
              <Download size={18} /> Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={() => handlePrint(filteredStudents, 'RESULT')} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
              <FileText size={18} /> In ĐL Kết quả
            </button>
            <button className="btn btn-warning" onClick={() => handlePrint(filteredStudents, 'ERROR')} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
              <AlertTriangle size={18} /> In ĐL Lỗi
            </button>
          </div>
        </div>

        <div className="print-only">
          {printType === 'RESULT' ? (
            <PrintTemplate students={printStudents} testTypes={displayedTestTypes} />
          ) : (
            <PrintErrorTemplate students={printStudents} testTypes={displayedTestTypes} />
          )}
        </div>
        
        <div className="grid no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tổng số học viên</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalCourseStudents}</div>
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#dcfce7', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#166534' }}>
            <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Đậu</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalPass}</div>
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b' }}>
            <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Rớt</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalFail}</div>
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a', color: '#92400e' }}>
            <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Vắng</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalAbsent}</div>
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#e0e7ff', borderRadius: '12px', border: '1px solid #c7d2fe', color: '#3730a3' }}>
            <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tỉ lệ đậu</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.passRate}%</div>
          </div>
        </div>

        <div className="card no-print" style={{ padding: '0' }}>
          <div className="filter-group" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ minWidth: '100%' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm theo Tên, CCCD..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div style={{ minWidth: '100%' }}>
              <select className="form-control" value={filterCourse} onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}>
                <option value="ALL">Tất cả Khóa đào tạo</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: '100%' }}>
              <input type="date" className="form-control" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div style={{ minWidth: '100%' }}>
              <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                <option value="ALL">Tất cả kết quả</option>
                <option value="PASS">ĐẬU</option>
                <option value="FAIL">RỚT</option>
                <option value="ABSENT">VẮNG</option>
                <option value="INCOMPLETE">Chưa hoàn thành</option>
              </select>
            </div>
          </div>
          
          <div className="no-print" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ và Tên</th>
                  <th>CCCD</th>
                  <th>Khóa đào tạo</th>
                  {displayedTestTypes.map(tt => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Kết quả</th>
                  <th className="no-print sticky-col-right" style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s, index) => (
                  <tr key={s.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.cccd}</td>
                    <td>{s.courseName || (s.course && s.course.name) || '-'}</td>
                    {displayedTestTypes.map(tt => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.scores[tt.id]}</td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {s.finalStatus === 'ĐẬU' && <span style={{ color: 'var(--success)' }}>ĐẬU</span>}
                      {s.finalStatus === 'RỚT' && <span style={{ color: 'var(--danger)' }}>RỚT</span>}
                      {s.finalStatus === 'VẮNG' && <span style={{ color: 'var(--text-muted)' }}>VẮNG</span>}
                      {s.finalStatus === 'CHƯA HOÀN THÀNH' && <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Chưa hoàn thành</span>}
                    </td>
                    <td className="no-print sticky-col-right" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {user?.username === 'quantri' && (
                          <button 
                            className="btn btn-sm btn-info"
                            onClick={() => handleEditClick(s)}
                            title="Sửa điểm"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#0dcaf0', color: 'white', border: 'none' }}
                          >
                            <Edit size={14} /> Sửa
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => handlePrint([s], 'RESULT')}
                          title="In kết quả"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Printer size={14} /> KQ
                        </button>
                        <button 
                          className="btn btn-sm btn-warning" 
                          onClick={() => handlePrint([s], 'ERROR')}
                          title="In lỗi"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <AlertTriangle size={14} /> Lỗi
                        </button>
                      </div>
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
      {editingStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Sửa điểm thi của học viên {editingStudent.name}</h3>
              <button onClick={() => setEditingStudent(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            {editingScores.length === 0 && <p className="text-muted">Học viên chưa có bài thi nào.</p>}
            {editingScores.map((score, index) => (
              <div key={score.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{score.name}</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Điểm</label>
                    <input type="number" className="form-control" value={score.totalScore} onChange={e => {
                      const newScores = [...editingScores];
                      newScores[index].totalScore = e.target.value;
                      setEditingScores(newScores);
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Trạng thái</label>
                    <select className="form-control" value={score.status} onChange={e => {
                      const newScores = [...editingScores];
                      newScores[index].status = e.target.value;
                      setEditingScores(newScores);
                    }}>
                      <option value="ĐẬU">ĐẬU</option>
                      <option value="RỚT">RỚT</option>
                      <option value="VẮNG">VẮNG</option>
                      <option value="CHƯA HOÀN THÀNH">CHƯA HOÀN THÀNH</option>
                      <option value="TRANSFERRED">TRANSFERRED</option>
                      <option value="FINISHED">FINISHED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="FAILED">FAILED</option>
                      <option value="PASSED">PASSED</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditingStudent(null)}>Huỷ</button>
              <button className="btn btn-primary" onClick={handleSaveScore} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Save size={16}/> Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ReportsManager;
