import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Select from 'react-select';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { formatDateDisplay } from '../utils/dateUtils';
import { useDebounce } from '../hooks/useDebounce';

const PrintTicketsManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [assignedTestTypes, setAssignedTestTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [printingStudentIds, setPrintingStudentIds] = useState<number[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

  useEffect(() => {
    if (selectedDate) {
      axios.get(`${API_BASE_URL}/api/manager/print-tickets/courses`, { params: { date: selectedDate } })
        .then(res => setCourses(res.data))
        .catch(() => toast.error('Lỗi khi tải danh sách khóa học'));
    } else {
      setCourses([]);
    }
    // Reset selection when date changes
    setSelectedCourse('');
    setStudents([]);
    setAssignedTestTypes([]);
  }, [selectedDate]);

  const handleFetchData = async () => {
    if (!selectedDate || !selectedCourse) {
      toast.error('Vui lòng chọn Ngày thi và Khóa thi');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/print-tickets/data`, {
        params: { date: selectedDate, courseId: selectedCourse }
      });
      setStudents(res.data.students);
      setAssignedTestTypes(res.data.assignedTestTypes);
      if (res.data.students.length === 0) {
        toast.error('Không tìm thấy học viên nào');
      } else if (res.data.assignedTestTypes.length === 0) {
        toast.error('Khóa thi này không có trạm thi nào được phân công trong ngày đã chọn');
      } else {
        toast.success(`Đã tải ${res.data.students.length} học viên`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (studentIds: number[]) => {
    if (assignedTestTypes.length === 0) {
      toast.error('Không có dữ liệu trạm thi, không thể in');
      return;
    }
    setPrintingStudentIds(studentIds);
    setTimeout(() => {
      window.print();
      // Wait for print dialog to close, then clear
      setTimeout(() => setPrintingStudentIds([]), 1000);
    }, 100);
  };

  const filteredStudents = students.filter(student => 
    (student.name || '').toLowerCase().includes(debouncedSearchKeyword.toLowerCase()) || 
    (student.cccd || '').toLowerCase().includes(debouncedSearchKeyword.toLowerCase())
  );

  return (
    <AdminLayout user={user}>
      <div className="no-print">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: 600, margin: 0 }}>In Phiếu Dự Thi</h2>
        </div>

        <div className="card mb-4" style={{ padding: '1.5rem', maxWidth: '800px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>Ngày thi</label>
              <input 
                type="date" 
                className="form-control"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>Khóa thi</label>
              <Select
                options={courses.map(c => ({ value: String(c.id), label: c.name }))}
                value={courses.map(c => ({ value: String(c.id), label: c.name })).find(opt => opt.value === selectedCourse) || null}
                onChange={(selected: any) => setSelectedCourse(selected ? selected.value : '')}
                placeholder={courses.length > 0 ? "-- Chọn khóa thi --" : "-- Vui lòng chọn ngày thi trước --"}
                isClearable
                isDisabled={!selectedDate || courses.length === 0}
                styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '42px', boxShadow: 'none' }) }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-primary"
                onClick={handleFetchData}
                disabled={isLoading}
                style={{ padding: '0.5rem 1.5rem', fontWeight: 500 }}
              >
                {isLoading ? 'Đang tải...' : 'Lọc danh sách'}
              </button>
              
              {filteredStudents.length > 0 && assignedTestTypes.length > 0 && (
                <button 
                  className="btn btn-success flex items-center"
                  style={{ gap: '0.5rem', padding: '0.5rem 1.5rem', fontWeight: 500 }}
                  onClick={() => handlePrint(filteredStudents.map(s => s.id))}
                >
                  <Printer size={18} /> In danh sách hiển thị ({filteredStudents.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {students.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm theo tên hoặc số CCCD..." 
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ maxWidth: '400px' }}
              />
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>STT</th>
                    <th>Họ tên</th>
                    <th>CCCD</th>
                    <th>Số trạm thi</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                    <tr key={student.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.cccd}</td>
                      <td>{assignedTestTypes.length} trạm</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-sm btn-primary flex items-center justify-center w-100"
                          style={{ gap: '0.25rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handlePrint([student.id])}
                          disabled={assignedTestTypes.length === 0}
                        >
                          <Printer size={14} /> In phiếu
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                        Không tìm thấy học viên phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Print Only Area */}
      <div className="print-only">
        {printingStudentIds.map((id) => {
          const student = students.find(s => s.id === id);
          if (!student) return null;
          
          return (
            <div className="exam-ticket" key={student.id}>
              <div className="ticket-header">
                <div className="ticket-title-top">
                  TRƯỜNG CAO ĐẲNG BÁCH KHOA<br/>
                  NAM SÀI GÒN
                </div>
                <div className="ticket-title-main">PHIẾU DỰ THI</div>
                <div className="ticket-date">Kỳ thi ngày: <strong>{formatDateDisplay(selectedDate)}</strong></div>
                <div className="ticket-name">Họ tên học viên: <strong>{student.name}</strong></div>
              </div>
              
              <div className="ticket-qr">
                <QRCodeSVG value={student.cccd || ''} size={130} />
              </div>
              
              <div className="ticket-body">
                <div style={{ marginBottom: '8px' }}>Học viên thực hiện trạm thi theo thứ tự sau:</div>
                <ul className="exam-list">
                  {assignedTestTypes.map((testType, i) => (
                    <li key={testType.id}>
                      <span style={{ color: '#0047AB', marginRight: '4px' }}>■</span> 
                      Trạm {i + 1}: {testType.name}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                  Học viên hoàn thành {assignedTestTypes.length} trạm thi, về phòng Hội đồng ký Phiếu kết quả thi.
                </div>
              </div>
              
              <div className="ticket-footer">
                <em>* Học viên truy cập <strong>sathach.nsgpc.edu.vn</strong> bằng CCCD để tra cứu kết quả thi</em>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default PrintTicketsManager;

