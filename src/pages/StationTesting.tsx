import { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, Car, CheckCircle, UserX, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';
import Select from 'react-select';
import AdminLayout from '../components/AdminLayout';
import { toTitleCase } from '../utils/stringUtils';
import { Pagination } from '../components/Pagination';
import { API_BASE_URL } from '../config';

import ConfirmModal from '../components/ConfirmModal';

const StationTesting = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedTestType, setSelectedTestType] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [availableAssignments, setAvailableAssignments] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const displayedTestTypes = testTypes.filter(tt => assignments.some((a: any) => a.testTypeId === tt.id));

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      fetchData(parsedUser);

      const interval = setInterval(() => {
        fetchData(parsedUser);
      }, 15000); // 15 seconds polling for near real-time updates
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText) => {
          let value = decodedText;
          if (value.includes('|')) {
            const parts = value.split('|');
            if (parts[0] && parts[0].length === 12) {
              value = parts[0];
            }
          }
          setSearchQuery(value);
          setIsScannerOpen(false);
          scanner?.clear().catch(console.error);
        },
        () => {
          // ignore error
        }
      );
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isScannerOpen]);

  const fetchData = async (currentUser: any) => {
    try {
      const [studentsRes, vehiclesRes, testTypesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}`),
        axios.get(`${API_BASE_URL}/api/manager/vehicle-types`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`)
      ]);
      setStudents(studentsRes.data.students);
      setAssignments(studentsRes.data.assignments);
      setVehicles(vehiclesRes.data.filter((v: any) => v.isActive));
      setTestTypes(testTypesRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu');
    }
  };

  const openStartTestModal = (student: any) => {
    const studentAssignments = assignments.filter(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    if (!studentAssignments || studentAssignments.length === 0) {
      toast.error('Không tìm thấy bài thi được phân công cho khóa này');
      return;
    }
    
    const unstartedAssignments = studentAssignments.filter(a => {
      const tr = student.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
      return !tr || tr.status === 'Chưa thi';
    });
    
    if (unstartedAssignments.length === 0) {
       toast.error('Học viên đã hoàn thành hoặc đang thi tất cả bài thi được phân công');
       return;
    }

    setSelectedStudent(student);
    setAvailableAssignments(unstartedAssignments);
    setSelectedAssignment(unstartedAssignments[0]);
    setSelectedTestType(unstartedAssignments[0].testType);
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

  const handleEndTest = async (student: any) => {
    const inProgressTr = student.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (!inProgressTr) return toast.error('Không tìm thấy bài thi đang diễn ra');

    try {
      await axios.post(`${API_BASE_URL}/api/manager/station/end-test`, {
        studentId: student.id,
        testTypeId: inProgressTr.testTypeId
      });
      toast.success('Kết thúc và chuyển điểm thành công.');
      
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          const trIndex = newTestResults.findIndex(tr => tr.testTypeId === inProgressTr.testTypeId);
          if (trIndex > -1) {
            newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'TRANSFERRED' };
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi kết thúc thi');
    }
  };

  const handleMarkAbsent = async (student: any) => {
    const studentAssignments = assignments.filter(a => 
      a.courseId === student.courseId || 
      (a.course && a.course.name === student.courseName)
    );
    
    const unstartedAssignments = studentAssignments.filter(a => {
      const tr = student.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
      return !tr || tr.status === 'Chưa thi';
    });

    if (unstartedAssignments.length === 0) return toast.error('Không tìm thấy bài thi chưa bắt đầu');

    try {
      for (const assignment of unstartedAssignments) {
        await axios.post(`${API_BASE_URL}/api/manager/station/mark-absent`, {
          studentId: student.id,
          testTypeId: assignment.testType?.id,
          stationManagerId: user?.id
        });
      }
      toast.success('Đã đánh dấu vắng thành công.');
      
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newTestResults = [...(s.testResults || [])];
          for (const assignment of unstartedAssignments) {
            const trIndex = newTestResults.findIndex(tr => tr.testTypeId === assignment.testType?.id);
            if (trIndex > -1) {
              newTestResults[trIndex] = { ...newTestResults[trIndex], status: 'ABSENT', totalScore: 0 };
            } else {
              newTestResults.push({ testTypeId: assignment.testType?.id, status: 'ABSENT', totalScore: 0 });
            }
          }
          return { ...s, testResults: newTestResults };
        }
        return s;
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi đánh dấu vắng');
    }
  };

  const getStudentStatusText = (student: any) => {
    if (!student.testResults || student.testResults.length === 0) return 'Chưa thi';
    const completedCount = student.testResults.filter((tr: any) => ['TRANSFERRED', 'ABSENT', 'FINISHED'].includes(tr.status)).length;
    if (displayedTestTypes.length > 0 && completedCount >= displayedTestTypes.length) return 'Hoàn thành bài thi';
    
    const inProgress = student.testResults.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (inProgress) return 'Đang thi';
    const finished = student.testResults.find((tr: any) => tr.status === 'FINISHED');
    if (finished) return 'Đã kết thúc';
    
    const transferredCount = student.testResults.filter((tr: any) => tr.status === 'TRANSFERRED' || tr.status === 'ABSENT').length;
    if (transferredCount > 0) return 'Đã chuyển điểm';
    return 'Chưa thi';
  };

  const getStudentStatus = (student: any) => {
    if (!student.testResults || student.testResults.length === 0) return 'Chưa thi';
    
    const completedCount = student.testResults.filter((tr: any) => ['TRANSFERRED', 'ABSENT', 'FINISHED'].includes(tr.status)).length;
    if (displayedTestTypes.length > 0 && completedCount >= displayedTestTypes.length) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4', textAlign: 'left', whiteSpace: 'nowrap' }}>
          <span>Hoàn thành bài thi</span>
        </div>
      );
    }

    const inProgress = student.testResults.find((tr: any) => tr.status === 'IN_PROGRESS');
    if (inProgress) {
      const v = vehicles.find(v => v.id === inProgress.vehicleId);
      let line1 = `Đang thi (${v ? v.name : 'Xe ID ' + inProgress.vehicleId})`;
      if (inProgress.stationManager) {
        line1 += ` - Bắt đầu bởi ${inProgress.stationManager.name}`;
      }
      let line2 = inProgress.startTime ? `Lúc: ${new Date(inProgress.startTime).toLocaleTimeString()}` : '';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4', textAlign: 'left', whiteSpace: 'nowrap' }}>
          <span>{line1}</span>
          {line2 && <span style={{ fontSize: '0.85em', opacity: 0.9, fontWeight: 'normal' }}>{line2}</span>}
        </div>
      );
    }
    
    const finished = student.testResults.find((tr: any) => tr.status === 'FINISHED');
    if (finished) {
      const v = vehicles.find(v => v.id === finished.vehicleId);
      let line1 = `Đã kết thúc ${v ? `(${v.name})` : ''}`;
      if (finished.stationManager) {
        line1 += ` - Trưởng trạm: ${finished.stationManager.name}`;
      }
      let line2 = '';
      if (finished.startTime) line2 += `Bắt đầu: ${new Date(finished.startTime).toLocaleTimeString()}`;
      if (finished.endTime) line2 += ` - Kết thúc: ${new Date(finished.endTime).toLocaleTimeString()}`;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4', textAlign: 'left', whiteSpace: 'nowrap' }}>
          <span>{line1}</span>
          {line2 && <span style={{ fontSize: '0.85em', opacity: 0.9, fontWeight: 'normal' }}>{line2}</span>}
        </div>
      );
    }
    
    const transferredCount = student.testResults.filter((tr: any) => tr.status === 'TRANSFERRED' || tr.status === 'ABSENT').length;
    if (transferredCount > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4', textAlign: 'left', whiteSpace: 'nowrap' }}>
          <span>Đã chuyển điểm ({transferredCount}/{displayedTestTypes.length || 3} trạm)</span>
        </div>
      );
    }
    
    return 'Đang chờ';
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Detect QR code scan from CCCD which uses '|' character separator
    // Example: 093088000220|363597757|Nguyễn Văn Luyến|20081988|Nam|...
    if (value.includes('|')) {
      const parts = value.split('|');
      if (parts[0] && parts[0].length === 12) {
        value = parts[0];
      }
    }
    setSearchQuery(value);
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
      if (filterStatus === 'TRANSFERRED' && st !== 'Đã chuyển điểm') match = false;
      if (filterStatus === 'COMPLETED' && st !== 'Hoàn thành bài thi') match = false;
    }
    return match;
  }).sort((a, b) => {
    const getWeight = (s: any) => {
      const st = getStudentStatusText(s);
      if (st === 'Đang thi') return 1;
      if (st === 'Đã kết thúc') return 2;
      if (st === 'Chưa thi') return 3;
      if (st === 'Đã chuyển điểm') return 4;
      if (st === 'Hoàn thành bài thi') return 5;
      return 6;
    };
    return getWeight(a) - getWeight(b);
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout user={user}>
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0 }}>
            Danh sách Sát hạch {(user?.role === 'STATION_MANAGER' || user?.username === 'quantri') ? '(Trưởng trạm)' : (user?.role === 'EXAMINER' || user?.username === 'quantri') ? '(Giám khảo)' : ''}
          </h2>
        </div>
        
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm theo Tên, CCCD hoặc Mã ĐK (Hỗ trợ quét mã CCCD)..." 
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button 
                className="btn btn-primary" 
                style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setIsScannerOpen(true)}
                title="Quét mã QR trên thẻ CCCD"
              >
                <Scan size={20} />
              </button>
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NOT_STARTED">Chưa thi</option>
                <option value="IN_PROGRESS">Đang thi</option>
                <option value="TRANSFERRED">Đã chuyển điểm</option>
                <option value="COMPLETED">Hoàn thành bài thi</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}>Họ và Tên</th>
                  <th>CCCD</th>
                  <th>Khóa đào tạo</th>
                  <th>Thời gian thực hiện</th>
                  <th>Trạng thái</th>
                  {displayedTestTypes.map((tt: any) => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}
                  {(user?.role === 'STATION_MANAGER' || user?.username === 'quantri') && <th className="sticky-col-right" style={{ textAlign: 'right' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s, index) => (
                  <tr key={s.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--card-bg, white)', zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}><strong>{toTitleCase(s.name)}</strong></td>
                    <td>{s.cccd}</td>
                    <td>{s.courseName || (s.course && s.course.name) || '-'}</td>
                    <td>
                      {(() => {
                        if (!s.testResults || s.testResults.length === 0) return '-';
                        
                        let targetTr = s.testResults.find((tr: any) => tr.status === 'IN_PROGRESS');
                        if (!targetTr) {
                          const completed = s.testResults.filter((tr: any) => tr.status === 'FINISHED' || tr.status === 'TRANSFERRED');
                          if (completed.length > 0) {
                            targetTr = completed.sort((a: any, b: any) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime())[0];
                          }
                        }

                        if (targetTr && targetTr.startTime) {
                          const start = new Date(targetTr.startTime).getTime();
                          const end = targetTr.endTime ? new Date(targetTr.endTime).getTime() : Date.now();
                          const diffMs = Math.max(0, end - start);
                          const diffMinutes = Math.floor(diffMs / 60000);
                          const diffSeconds = Math.floor((diffMs % 60000) / 1000);
                          
                          let timeStr = diffMinutes > 0 ? `${diffMinutes} phút ${diffSeconds} giây` : `${diffSeconds} giây`;
                          
                          if (targetTr.status === 'IN_PROGRESS') {
                            return <span style={{ color: 'var(--primary)', fontWeight: '500' }}>{timeStr} (đang thi)</span>;
                          }
                          return <span style={{ fontWeight: '500' }}>{timeStr}</span>;
                        }
                        
                        return '-';
                      })()}
                    </td>
                    <td>
                      <div className={`badge ${getStudentStatusText(s) === 'Đang thi' ? 'badge-primary' : (['Đã chuyển điểm', 'Hoàn thành bài thi'].includes(getStudentStatusText(s)) ? 'badge-success' : 'badge-secondary')}`} style={{ display: 'inline-flex', padding: '0.4rem 0.6rem' }}>
                        {getStudentStatus(s)}
                      </div>
                    </td>
                    {displayedTestTypes.map((tt: any) => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {(() => {
                          const tr = s.testResults?.find((t: any) => t.testTypeId === tt.id);
                          if (!tr) return '-';
                          if ((user?.role !== 'ADMIN' && user?.username !== 'quantri') && (user?.role !== 'MANAGER' && user?.username !== 'quantri')) {
                            const myAssignment = assignments.find((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                            if (myAssignment?.testType?.id !== tr.testTypeId) return <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>Ẩn</span>;
                          }
                          if (tr.status === 'ABSENT') return <span className="text-muted">Vắng</span>;
                          return <span style={{ color: tr.status === 'FAILED' ? 'var(--danger)' : 'inherit' }}>{tr.totalScore}</span>;
                        })()}
                      </td>
                    ))}
                    {(user?.role === 'STATION_MANAGER' || user?.username === 'quantri') && (
                      <td className="sticky-col-right" style={{ textAlign: 'right' }}>
                        {(() => {
                          const myAssignments = assignments.filter((a: any) => a.courseId === s.courseId || (a.course && a.course.name === s.courseName));
                          if (myAssignments.length === 0) return null;

                          const myInProgressTr = s.testResults?.find((tr: any) => tr.status === 'IN_PROGRESS' && myAssignments.find(a => a.testType?.id === tr.testTypeId));
                          const isTestingElsewhere = s.testResults?.some((tr: any) => tr.status === 'IN_PROGRESS' && !myAssignments.find(a => a.testType?.id === tr.testTypeId));

                          if (isTestingElsewhere && !myInProgressTr) {
                            return <span className="text-muted small">Đang thi ở trạm khác</span>;
                          }

                          if (myInProgressTr) {
                            const inProgressTestType = myAssignments.find(a => a.testType?.id === myInProgressTr.testTypeId)?.testType;
                            return (
                              <button 
                                className="btn" 
                                style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#10b981', color: 'white' }}
                                onClick={() => {
                                  setConfirmAction({
                                    isOpen: true,
                                    title: 'Kết thúc phần thi',
                                    message: `Xác nhận kết thúc phần thi của ${s.name}?`,
                                    onConfirm: () => {
                                      handleEndTest(s);
                                      setConfirmAction(null);
                                    }
                                  });
                                }}
                              >
                                <CheckCircle size={16} /> Kết thúc {myAssignments.length > 1 ? `(${inProgressTestType?.name})` : ''}
                              </button>
                            );
                          }

                          const unstartedAssignments = myAssignments.filter(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return !tr || tr.status === 'Chưa thi';
                          });

                          if (unstartedAssignments.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => openStartTestModal(s)}
                                >
                                  <Play size={16} /> Bắt đầu thi
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.3rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  onClick={() => {
                                    setConfirmAction({
                                      isOpen: true,
                                      title: 'Xác nhận vắng thi',
                                      message: `Xác nhận đánh dấu vắng thi cho ${s.name}?`,
                                      onConfirm: () => {
                                        handleMarkAbsent(s);
                                        setConfirmAction(null);
                                      }
                                    });
                                  }}
                                >
                                  <UserX size={16} /> Vắng
                                </button>
                              </div>
                            );
                          }

                          const hasFinished = myAssignments.some(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return tr && (tr.status === 'FINISHED' || tr.status === 'TRANSFERRED');
                          });
                          
                          const hasAbsent = myAssignments.some(a => {
                            const tr = s.testResults?.find((t: any) => t.testTypeId === a.testType?.id);
                            return tr && tr.status === 'ABSENT';
                          });

                          if (hasFinished) {
                             return <span className="text-success small">Đã chuyển điểm</span>;
                          } else if (hasAbsent) {
                             return <span className="text-muted small">Vắng</span>;
                          }

                          return null;
                        })()}
                      </td>
                    )}
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
          
          {totalPages > 1 && (
            <div className="pagination-wrapper mt-4">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Modal Start Test */}
        {isModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
              <h3 className="mb-4">Bắt đầu thi</h3>
              <p>Học viên: <strong>{selectedStudent?.name}</strong></p>
              
              <div style={{ padding: '10px', background: '#f5f7fa', borderRadius: '4px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>Trạm thi:</p>
                {availableAssignments && availableAssignments.length > 1 ? (
                  <select 
                    className="form-control"
                    value={selectedAssignment?.id || ''}
                    onChange={(e) => {
                      const ast = availableAssignments.find(a => a.id === Number(e.target.value));
                      if (ast) {
                        setSelectedAssignment(ast);
                        setSelectedTestType(ast.testType);
                        setSelectedVehicleId(null);
                      }
                    }}
                    style={{ marginBottom: '10px' }}
                  >
                    {availableAssignments.map(a => (
                      <option key={a.id} value={a.id}>{a.testType?.name}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px 0' }}><strong>{selectedTestType?.name}</strong></p>
                  </>
                )}
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>{selectedTestType?.description}</p>
              </div>

              <div className="form-group mt-3">
                <label>Tìm chọn Số Xe <Car size={14} style={{ display: 'inline', marginLeft: '5px' }}/></label>
                <Select
                  options={
                    (selectedAssignment?.vehicles?.length > 0 ? selectedAssignment.vehicles : vehicles)
                      .filter((v: any) => {
                         const inProgressCount = students.flatMap(s => s.testResults || [])
                            .filter((tr: any) => tr.status === 'IN_PROGRESS' && tr.vehicleId === v.id).length;
                         
                         const isDuongTruong = selectedTestType?.name?.toLowerCase().includes('đường trường');
                         const maxCount = isDuongTruong ? 4 : 1;
                         return inProgressCount < maxCount;
                      })
                      .map((v: any) => ({ value: v.id, label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))
                  }
                  value={vehicles.filter(v => v.id === selectedVehicleId).map(v => ({ value: v.id, label: `${v.name} ${v.brand ? `(${v.brand})` : ''}` }))[0] || null}
                  onChange={(selectedOption) => setSelectedVehicleId(selectedOption ? selectedOption.value : null)}
                  placeholder="-- Gõ để tìm xe --"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "Không tìm thấy xe phù hợp (hoặc đang bận)"}
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

      <ConfirmModal
        isOpen={confirmAction?.isOpen || false}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={confirmAction?.onConfirm || (() => {})}
        onCancel={() => setConfirmAction(null)}
      />

      {isScannerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', position: 'relative' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Quét mã QR trên thẻ CCCD</h3>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setIsScannerOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StationTesting;
