import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Printer, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import AdminLayout from '../components/AdminLayout';
import PrintRecordTemplate from '../components/PrintRecordTemplate';
import { API_BASE_URL } from '../config';
import { useDebounce } from '../hooks/useDebounce';
import { getLocalDateString } from '../utils/dateUtils';

const RecordsManager = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => getLocalDateString());
  
  const [printRecords, setPrintRecords] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'MANAGER') {
        window.location.href = '/manager';
        return;
      }
      fetchCourses();
      fetchData(filterDate, filterCourse);
    } else {
      window.location.href = '/login';
    }
  }, [filterDate, filterCourse]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/courses`);
      setCourses(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async (date: string, courseId: string) => {
    try {
      const queryDate = date ? date : 'ALL';
      const res = await axios.get(`${API_BASE_URL}/api/manager/examiner-records?date=${queryDate}&courseId=${courseId}`);
      
      const { progresses } = res.data;
      processData(progresses);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu biên bản');
    }
  };

  const processData = (progresses: any[]) => {
    const grouped = new Map<string, any>();
    
    progresses.forEach(p => {
      if (!p.testResult || !p.testResult.student) return;
      const key = `${p.examinerId}_${p.testResult.student.id}_${p.testResult.testTypeId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          examiner: p.examiner,
          student: p.testResult.student,
          testResult: p.testResult,
          progresses: [],
          activeExams: []
        });
      }
      const group = grouped.get(key);
      group.progresses.push(p);
    });

    const list = Array.from(grouped.values());
    list.forEach(item => {
      const uniqueExams = new Map();
      item.progresses.forEach((p: any) => {
        if (p.exam) uniqueExams.set(p.exam.id, p.exam);
      });
      item.activeExams = Array.from(uniqueExams.values());
    });

    setRecords(list);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let match = true;
      if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        match = (r.examiner.name?.toLowerCase().includes(q) || 
                 r.student.name?.toLowerCase().includes(q) || 
                 r.student.cccd?.includes(q));
      }
      return match;
    });
  }, [records, debouncedSearchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handlePrint = (recordsToPrint: any[]) => {
    setPrintRecords(recordsToPrint);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const exportToExcel = () => {
    const dataForExcel = filteredRecords.map((r, index) => {
      
      const errorList: string[] = [];
      let totalDeduction = 0;
      
      const examMap = new Map();
      r.activeExams.forEach((exam: any) => examMap.set(exam.id, exam.name));

      if (r.testResult.scores) {
        r.testResult.scores.forEach((sc: any) => {
          if (sc.criterion && examMap.has(sc.criterion.examId)) {
            const times = sc.timesDeducted || 1;
            const deduct = sc.criterion.pointsToDeduct || 0;
            const total = times * deduct;
            errorList.push(`${sc.criterion.name} (-${total})`);
            totalDeduction += total;
          }
        });
      }

      return {
        'STT': index + 1,
        'Giám khảo': r.examiner.name,
        'Học viên': r.student.name,
        'CCCD': r.student.cccd,
        'Khóa đào tạo': r.student.courseName || (r.student.course && r.student.course.name) || '-',
        'Trạm chấm': r.testResult.testType?.name,
        'Biển số': r.testResult.vehicle?.name || '-',
        'Bài chấm': r.activeExams.map((e: any) => e.name).join(', '),
        'Tổng điểm trừ': `-${totalDeduction}`,
        'Điểm còn lại': r.testResult.totalScore,
        'Kết quả': r.testResult.status === 'FAILED' ? 'RỚT' : r.testResult.status === 'PASSED' ? 'ĐẬU' : r.testResult.status === 'PENDING' ? 'ĐANG THI' : 'HOÀN THÀNH'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BienBanGiamKhao');
    
    const wscols = [
      { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, 
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `BienBanGiamKhao_${new Date().getTime()}.xlsx`);
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
          <h2 style={{ margin: '0 0 1rem 0' }}>Biên bản Giám khảo</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
              <Download size={18} /> Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={() => handlePrint(filteredRecords)} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
              <FileText size={18} /> In tất cả Biên bản
            </button>
          </div>
        </div>

        <div className="print-only">
          <PrintRecordTemplate records={printRecords} />
        </div>

        <div className="card no-print" style={{ padding: '0' }}>
          <div className="filter-group" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ minWidth: '100%' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm theo Tên GK, Học viên, CCCD..." 
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
          </div>
          
          <div className="no-print" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Giám khảo</th>
                  <th>Trạm chấm</th>
                  <th>Học viên</th>
                  <th style={{ textAlign: 'center' }}>Biển số</th>
                  <th>Bài chấm</th>
                  <th style={{ textAlign: 'center' }}>Tổng điểm trừ</th>
                  <th style={{ textAlign: 'center' }}>Điểm còn lại</th>
                  <th className="no-print sticky-col-right" style={{ textAlign: 'center', position: 'sticky', right: 0, backgroundColor: 'var(--surface, white)', zIndex: 10 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((r, index) => {
                  let totalDeduction = 0;
                  const examMap = new Map();
                  r.activeExams.forEach((exam: any) => examMap.set(exam.id, exam.name));

                  if (r.testResult.scores) {
                    r.testResult.scores.forEach((sc: any) => {
                      if (sc.criterion && examMap.has(sc.criterion.examId)) {
                        totalDeduction += (sc.timesDeducted || 1) * (sc.criterion.pointsToDeduct || 0);
                      }
                    });
                  }

                  return (
                    <tr key={r.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><strong>{r.examiner.name}</strong></td>
                      <td>{r.testResult.testType?.name}</td>
                      <td>
                        <div><strong>{r.student.name}</strong></div>
                        <div className="text-muted" style={{ fontSize: '0.85em' }}>CCCD: {r.student.cccd}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.testResult.vehicle?.name || '-'}</td>
                      <td>
                        <div style={{ fontSize: '0.9em', maxWidth: '250px', whiteSpace: 'normal' }}>
                          {r.activeExams.map((e: any) => e.name).join(', ')}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>
                        {totalDeduction > 0 ? `-${totalDeduction}` : '0'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: r.testResult.totalScore < (r.testResult.testType?.passingScore ?? 80) ? 'var(--danger)' : 'var(--success)' }}>
                        {r.testResult.totalScore}
                      </td>
                      <td className="no-print sticky-col-right" style={{ textAlign: 'center', position: 'sticky', right: 0, backgroundColor: 'var(--surface, white)', zIndex: 1 }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => handlePrint([r])}
                            title="In biên bản"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Printer size={14} /> In BB
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Không có biên bản nào phù hợp với bộ lọc
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

export default RecordsManager;
