import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Printer, Upload, Download, Edit2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import { Pagination } from '../components/Pagination';
import { API_BASE_URL } from '../config';
import { formatDateDisplay } from '../utils/dateUtils';
import { useDebounce } from '../hooks/useDebounce';

const ITEMS_PER_PAGE = 20;

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

  // New states for pagination and batch actions
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [batchOrderInput, setBatchOrderInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCurrentPage(1);
    setSelectedStudentIds([]);
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
      setCurrentPage(1);
      setSelectedStudentIds([]);
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

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Handlers cho Checkbox và Excel ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Chọn tất cả các học viên ĐANG HIỂN THỊ trên trang hiện tại
      const visibleIds = paginatedStudents.map(s => s.id);
      setSelectedStudentIds(prev => {
        const set = new Set([...prev, ...visibleIds]);
        return Array.from(set);
      });
    } else {
      // Bỏ chọn tất cả trên trang hiện tại
      const visibleIds = paginatedStudents.map(s => s.id);
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExportExcel = () => {
    const data = filteredStudents.map((s, idx) => ({
      'STT': idx + 1,
      'Họ tên': s.name,
      'CCCD': s.cccd,
      'Khóa thi': s.courseName || '',
      'Thứ tự trạm thi': s.testStationOrder || assignedTestTypes.map(t => t.name).join(', ')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach");
    XLSX.writeFile(wb, `DanhSachInPhieu_${formatDateDisplay(selectedDate)}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const payload = data.map((row: any) => ({
          cccd: row['CCCD'],
          testStationOrder: row['Thứ tự trạm thi']
        }));
        
        setIsLoading(true);
        await axios.post(`${API_BASE_URL}/api/manager/print-tickets/import-order`, { data: payload });
        toast.success('Đã cập nhật thứ tự trạm thi từ Excel');
        handleFetchData(); // refresh data
      } catch (err) {
        toast.error('Lỗi đọc file Excel');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateBatchOrder = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      setIsLoading(true);
      await axios.post(`${API_BASE_URL}/api/manager/print-tickets/update-order`, {
        studentIds: selectedStudentIds,
        testStationOrder: batchOrderInput
      });
      toast.success('Cập nhật thứ tự thành công');
      handleFetchData();
      setSelectedStudentIds([]);
      setBatchOrderInput('');
    } catch (err) {
      toast.error('Lỗi khi cập nhật thứ tự');
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentTestOrder = (student: any) => {
    let orderTypes = assignedTestTypes;
    if (student.testStationOrder) {
      const customOrderNames = student.testStationOrder.split(',').map((s: string) => s.trim());
      const customTypes: any[] = [];
      customOrderNames.forEach((name: string) => {
        const found = assignedTestTypes.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (found) customTypes.push(found);
      });
      if (customTypes.length > 0) orderTypes = customTypes;
    }

    if (student.testResults && student.testResults.length > 0) {
      orderTypes = orderTypes.filter(testType => {
        const tr = student.testResults.find((t: any) => t.testTypeId === testType.id);
        if (tr && tr.status === 'PASSED') {
          return false;
        }
        return true;
      });
    }

    return orderTypes;
  };

  const isAllCurrentPageSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id));

  return (
    <AdminLayout user={user}>
      <div className="no-print">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: 600, margin: 0 }}>In Phiếu Dự Thi</h2>
        </div>

        <div className="card mb-4" style={{ padding: '1.5rem', width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>Ngày thi</label>
              <input 
                type="date" 
                className="form-control"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', height: '42px' }}
              />
            </div>
            <div style={{ flex: '1 1 300px' }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary"
                onClick={handleFetchData}
                disabled={isLoading}
                style={{ padding: '0.5rem 1.5rem', fontWeight: 500, height: '42px' }}
              >
                {isLoading ? 'Đang tải...' : 'Lọc danh sách'}
              </button>

              {selectedStudentIds.length > 0 && assignedTestTypes.length > 0 && (
                <button 
                  className="btn btn-info flex items-center text-white"
                  style={{ gap: '0.5rem', padding: '0.5rem 1.5rem', fontWeight: 500, height: '42px', backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}
                  onClick={() => handlePrint(selectedStudentIds)}
                >
                  <Printer size={18} /> In {selectedStudentIds.length} phiếu chọn
                </button>
              )}
              
              {filteredStudents.length > 0 && assignedTestTypes.length > 0 && (
                <button 
                  className="btn btn-success flex items-center"
                  style={{ gap: '0.5rem', padding: '0.5rem 1.5rem', fontWeight: 500, height: '42px' }}
                  onClick={() => handlePrint(filteredStudents.map(s => s.id))}
                >
                  <Printer size={18} /> In {filteredStudents.length} phiếu
                </button>
              )}
            </div>
          </div>
        </div>

        {students.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm theo tên hoặc số CCCD..." 
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ maxWidth: '400px' }}
              />
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline-success flex items-center" style={{ gap: '0.5rem' }} onClick={handleExportExcel}>
                  <Download size={16} /> Xuất Excel
                </button>
                <button className="btn btn-outline-primary flex items-center" style={{ gap: '0.5rem' }} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Import Excel (Cập nhật thứ tự)
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImportExcel} />
              </div>
            </div>

            {selectedStudentIds.length > 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <strong style={{ color: '#1e3a8a', whiteSpace: 'nowrap' }}>Đã chọn {selectedStudentIds.length} học viên</strong>
                <span style={{ color: '#6b7280' }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap' }}>Đổi thứ tự trạm thi:</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder={`Ví dụ: ${assignedTestTypes.map(t => t.name).join(', ')}`}
                    value={batchOrderInput}
                    onChange={e => setBatchOrderInput(e.target.value)}
                    style={{ flex: 1, maxWidth: '500px' }}
                  />
                  <button className="btn btn-primary flex items-center" style={{ gap: '0.25rem' }} onClick={handleUpdateBatchOrder} disabled={isLoading || !batchOrderInput}>
                    <Edit2 size={16} /> Áp dụng
                  </button>
                </div>
              </div>
            )}

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" checked={isAllCurrentPageSelected} onChange={handleSelectAll} />
                    </th>
                    <th style={{ width: '60px' }}>STT</th>
                    <th>Họ tên</th>
                    <th>CCCD</th>
                    <th>Thứ tự trạm thi</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length > 0 ? paginatedStudents.map((student, idx) => {
                    const studentOrder = getStudentTestOrder(student);
                    return (
                      <tr key={student.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => handleSelectOne(student.id)} />
                        </td>
                        <td>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td><strong>{student.name}</strong></td>
                        <td>{student.cccd}</td>
                        <td>
                          <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                            {studentOrder.map(t => t.name).join(' → ')}
                          </div>
                        </td>
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
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                        Không tìm thấy học viên phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Only Area */}
      <div className="print-only">
        {printingStudentIds.map((id) => {
          const student = students.find(s => s.id === id);
          if (!student) return null;
          const studentOrder = getStudentTestOrder(student);
          
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
                <QRCodeSVG value={student.cccd || ''} size={100} />
              </div>
              
              <div className="ticket-body">
                <div style={{ marginBottom: '8px' }}>Học viên phải thực hiện đầy đủ các trạm thi sau:</div>
                <ul className="exam-list">
                  {studentOrder.map((testType, i) => (
                    <li key={testType.id}>
                      <span style={{ color: '#0047AB', marginRight: '4px' }}>■</span> 
                      Trạm {i + 1}: {testType.name}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                  Học viên hoàn thành {studentOrder.length} trạm thi, về phòng Hội đồng ký Phiếu kết quả thi.
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
