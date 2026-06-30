import { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const StationTesting = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedTestType, setSelectedTestType] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      fetchData(parsedUser.id);
    }
  }, []);

  const fetchData = async (examinerId: number) => {
    try {
      const [studentsRes, vehiclesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students?examinerId=${examinerId}`),
        axios.get(`${API_BASE_URL}/api/manager/vehicle-types`)
      ]);
      setStudents(studentsRes.data.students);
      setAssignments(studentsRes.data.assignments);
      setVehicles(vehiclesRes.data.filter((v: any) => v.isActive));
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu');
    }
  };

  const openStartTestModal = (student: any) => {
    // Determine the testType based on assignments matching this student's course
    const studentAssignment = assignments.find(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignment) {
      toast.error('Không tìm thấy bài thi được phân công cho khóa này');
      return;
    }
    
    setSelectedStudent(student);
    setSelectedAssignment(studentAssignment);
    setSelectedTestType(studentAssignment.testType);
    setSelectedVehicleId(null);
    setIsModalOpen(true);
  };

  const handleStartTest = async () => {
    if (!selectedVehicleId) {
      toast.error('Vui lòng chọn Số xe');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/manager/station/start-test`, {
        studentId: selectedStudent.id,
        testTypeId: selectedTestType?.id,
        vehicleId: selectedVehicleId,
        stationManagerId: user.id
      });
      toast.success('Bắt đầu thi thành công. Đã chuyển thông tin tới Giám khảo.');
      setIsModalOpen(false);
      
      // Update local state to reflect IN_PROGRESS
      setStudents(prev => prev.map(s => {
        if (s.id === selectedStudent.id) {
          const newTestResults = [...(s.testResults || [])];
          const trIndex = newTestResults.findIndex(tr => tr.testTypeId === selectedTestType?.id);
          const trData = {
            testTypeId: selectedTestType?.id,
            status: 'IN_PROGRESS',
            vehicleId: selectedVehicleId,
            stationManager: user,
            startTime: new Date().toISOString()
          };
          if (trIndex > -1) {
            newTestResults[trIndex] = { ...newTestResults[trIndex], ...trData };
          } else {
            newTestResults.push(trData);
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi bắt đầu thi');
    }
  };

  const getStudentStatusText = (student: any) => {
    if (!student.testResults || student.testResults.length === 0) return 'Chưa thi';
    const inProgress = student.testResults.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (inProgress) return 'Đang thi';
    return 'Đã kết thúc';
  };

  const getStudentStatus = (student: any) => {
    if (!student.testResults || student.testResults.length === 0) return 'Chưa thi';
    // For simplicity, just check if any is IN_PROGRESS
    const inProgress = student.testResults.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (inProgress) {
      const v = vehicles.find(v => v.id === inProgress.vehicleId);
      let text = `Đang thi (${v ? v.name : 'Xe ID ' + inProgress.vehicleId})`;
      if (inProgress.stationManager && inProgress.startTime) {
        text += ` - Bắt đầu bởi ${inProgress.stationManager.name} lúc ${new Date(inProgress.startTime).toLocaleTimeString()}`;
      }
      return text;
    }
    return 'Đã kết thúc / Đang chờ';
  };

  const filteredStudents = students.filter(s => {
    let match = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      match = (s.name?.toLowerCase().includes(q) || s.cccd?.includes(q) || s.registrationCode?.toLowerCase().includes(q));
    }
    if (match && filterStatus !== 'ALL') {
      const st = getStudentStatusText(s);
      if (filterStatus === 'NOT_STARTED' && st !== 'Chưa thi') match = false;
      if (filterStatus === 'IN_PROGRESS' && st !== 'Đang thi') match = false;
      if (filterStatus === 'FINISHED' && st !== 'Đã kết thúc') match = false;
    }
    return match;
  });

  return (
    <AdminLayout user={user}>
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0 }}>Sát hạch (Trưởng trạm)</h2>
        </div>
        
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm theo Tên, CCCD hoặc Mã ĐK..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ width: '200px' }}>
              <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NOT_STARTED">Chưa thi</option>
                <option value="IN_PROGRESS">Đang thi</option>
                <option value="FINISHED">Đã kết thúc</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Mã ĐK</th>
                  <th>Họ và Tên</th>
                  <th>CCCD</th>
                  <th>Khóa đào tạo</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td>{s.registrationCode}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.cccd}</td>
                    <td>{s.courseName || (s.course && s.course.name) || '-'}</td>
                    <td>
                      <span className={`badge ${getStudentStatus(s).includes('Đang thi') ? 'badge-primary' : 'badge-secondary'}`}>
                        {getStudentStatus(s)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => openStartTestModal(s)}
                      >
                        <Play size={16} /> Bắt đầu thi
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Chưa có học viên nào được phân công.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Start Test */}
        {isModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
              <h3 className="mb-4">Bắt đầu thi</h3>
              <p>Học viên: <strong>{selectedStudent?.name}</strong></p>
              
              <div style={{ padding: '10px', background: '#f5f7fa', borderRadius: '4px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>Trạm thi: <strong>{selectedTestType?.name}</strong></p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>{selectedTestType?.description}</p>
              </div>

              <div className="form-group mt-3">
                <label>Tìm chọn Số Xe <Car size={14} style={{ display: 'inline', marginLeft: '5px' }}/></label>
                <Select
                  options={(selectedAssignment?.vehicles?.length > 0 ? selectedAssignment.vehicles : vehicles).map((v: any) => ({ value: v.id, label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))}
                  value={vehicles.filter(v => v.id === selectedVehicleId).map(v => ({ value: v.id, label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))[0] || null}
                  onChange={(selectedOption) => setSelectedVehicleId(selectedOption ? selectedOption.value : null)}
                  placeholder="-- Gõ để tìm xe --"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "Không tìm thấy xe"}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleStartTest}>Xác nhận & Bắt đầu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StationTesting;
