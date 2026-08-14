import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Select from 'react-select';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { formatDateDisplay } from '../utils/dateUtils';

const PrintTicketsManager = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [assignedExams, setAssignedExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [printingStudentIds, setPrintingStudentIds] = useState<number[]>([]);

  useEffect(() => {
    // Fetch courses
    axios.get(`${API_BASE_URL}/api/manager/courses`)
      .then(res => setCourses(res.data))
      .catch(() => toast.error('Lỗi khi tải danh sách khóa học'));
  }, []);

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
      setAssignedExams(res.data.assignedExams);
      if (res.data.students.length === 0) {
        toast.error('Không tìm thấy học viên nào');
      } else if (res.data.assignedExams.length === 0) {
        toast.error('Khóa thi này không có bài thi nào được phân công trong ngày đã chọn');
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
    if (assignedExams.length === 0) {
      toast.error('Không có dữ liệu bài thi, không thể in');
      return;
    }
    setPrintingStudentIds(studentIds);
    setTimeout(() => {
      window.print();
      // Wait for print dialog to close, then clear
      setTimeout(() => setPrintingStudentIds([]), 1000);
    }, 100);
  };

  return (
    <AdminLayout user={user}>
      <div className="no-print">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: 600, margin: 0 }}>In Phiếu Dự Thi</h2>
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <div className="grid-cols-2-responsive">
              <div className="form-group">
                <label className="form-label">Ngày thi</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Khóa thi</label>
                <Select
                  options={courses.map(c => ({ value: String(c.id), label: c.name }))}
                  value={courses.map(c => ({ value: String(c.id), label: c.name })).find(opt => opt.value === selectedCourse)}
                  onChange={(selected: any) => setSelectedCourse(selected ? selected.value : '')}
                  placeholder="-- Chọn khóa thi --"
                  isClearable
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', minHeight: '38px', boxShadow: 'none' }) }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary"
                onClick={handleFetchData}
                disabled={isLoading}
              >
                {isLoading ? 'Đang tải...' : 'Lọc danh sách'}
              </button>
              
              {students.length > 0 && assignedExams.length > 0 && (
                <button 
                  className="btn btn-success flex items-center"
                  style={{ gap: '0.5rem' }}
                  onClick={() => handlePrint(students.map(s => s.id))}
                >
                  <Printer size={18} /> In toàn phiếu ({students.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {students.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>STT</th>
                    <th>Họ tên</th>
                    <th>CCCD</th>
                    <th>Số bài thi</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.cccd}</td>
                      <td>{assignedExams.length} bài</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-sm btn-primary flex items-center justify-center w-100"
                          style={{ gap: '0.25rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handlePrint([student.id])}
                          disabled={assignedExams.length === 0}
                        >
                          <Printer size={14} /> In phiếu
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Print Only Area */}
      <div className="print-only">
        {printingStudentIds.map((id, index) => {
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
                <div style={{ marginBottom: '8px' }}>Học viên thực hiện bài thi theo thứ tự sau:</div>
                <ul className="exam-list">
                  {assignedExams.map((exam, i) => (
                    <li key={exam.id}>
                      <span style={{ color: '#0047AB', marginRight: '4px' }}>■</span> 
                      Bài {i + 1}: {exam.name}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '8px' }}>
                  Học viên hoàn thành {assignedExams.length} bài thi, về phòng Hội đồng ký Phiếu kết quả thi.
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
