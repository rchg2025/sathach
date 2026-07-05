import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, CheckCircle, XCircle, UserX, TrendingUp, AlertTriangle, Download, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { getLocalDateString } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];

const StatisticsManager = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => getLocalDateString());
  const [filterTestType, setFilterTestType] = useState('ALL');
  const [filterExam, setFilterExam] = useState('ALL');
  const [filterTeacher, setFilterTeacher] = useState<number | null>(null);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'MANAGER') {
        window.location.href = '/manager';
        return;
      }
      fetchData(parsedUser, filterDate, filterCourse);
    } else {
      window.location.href = '/login';
    }
  }, [filterDate, filterCourse]);

  const fetchData = async (currentUser: any, date: string, courseId: string) => {
    try {
      const queryDate = date ? date : 'ALL';
      const [studentsRes, coursesRes, testTypesRes, teachersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}&date=${queryDate}&courseId=${courseId}`),
        axios.get(`${API_BASE_URL}/api/manager/courses`),
        axios.get(`${API_BASE_URL}/api/manager/test-types`),
        axios.get(`${API_BASE_URL}/api/manager/users?role=TEACHER`)
      ]);
      setStudents(studentsRes.data.students || []);
      setAssignments(studentsRes.data.assignments || []);
      setCourses(coursesRes.data || []);
      setTestTypes(testTypesRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi lấy dữ liệu');
    }
  };

  const displayedTestTypes = useMemo(() => {
    const assignedIds = new Set(assignments.map((a: any) => a.testTypeId));
    return testTypes.filter(tt => assignedIds.has(tt.id));
  }, [testTypes, assignments]);

  const displayedExams = useMemo(() => {
    const examMap = new Map<number, { id: number; name: string }>();
    students.forEach(s => {
      s.testResults?.forEach((tr: any) => {
        if (filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType) return;
        tr.scores?.forEach((score: any) => {
          if (score.criterion?.exam) {
            examMap.set(score.criterion.exam.id, {
              id: score.criterion.exam.id,
              name: score.criterion.exam.name,
            });
          }
        });
      });
    });
    return Array.from(examMap.values());
  }, [students, filterTestType]);

  const activeTestTypes = useMemo(() => {
    if (filterTestType === 'ALL') return displayedTestTypes;
    return displayedTestTypes.filter(tt => String(tt.id) === filterTestType);
  }, [displayedTestTypes, filterTestType]);

  const processedStudents = useMemo(() => {
    return students.map(student => {
      const allTrs = student.testResults || [];
      const todayTrs: any[] = [];
      const pastTrs: any[] = [];
      
      allTrs.forEach((t: any) => {
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
      
      activeTestTypes.forEach((tt: any) => {
        let tr = todayTrs.find((t: any) => t.testTypeId === tt.id);
        if (!tr) {
          const pastPassed = pastTrs.filter(t => 
            t.testTypeId === tt.id && 
            ['TRANSFERRED', 'FINISHED'].includes(t.status) && 
            t.totalScore >= (tt.passingScore ?? 80) &&
            t.status !== 'FAILED'
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (pastPassed.length > 0) tr = pastPassed[0];
        }

        if (tr) {
          if (tr.status === 'ABSENT') {
            isAbsent = true;
            completedCount++;
          } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
            completedCount++;
            const passingScore = tt.passingScore ?? 80;
            if (tr.totalScore < passingScore) isFail = true;
            if (tr.status === 'FAILED') isFail = true;
          }
        }
      });

      let finalStatus = '';
      if (isAbsent) finalStatus = 'VẮNG';
      else if (isFail) finalStatus = 'RỚT';
      else if (activeTestTypes.length > 0 && completedCount >= activeTestTypes.length) finalStatus = 'ĐẬU';
      else finalStatus = 'CHƯA HOÀN THÀNH';

      return { ...student, finalStatus };
    });
  }, [students, activeTestTypes, filterDate]);

  const courseFilteredStudents = useMemo(() => {
    return processedStudents.filter(s => {
      if (filterCourse !== 'ALL') {
        const selectedCourseObj = courses.find(c => String(c.id) === filterCourse);
        const selectedCourseName = selectedCourseObj ? selectedCourseObj.name : null;
        return (s.courseId === parseInt(filterCourse) || s.courseName === selectedCourseName || (s.course && s.course.name === selectedCourseName));
      }
      return true;
    });
  }, [processedStudents, filterCourse, courses]);

  const stats = useMemo(() => {
    const totalCourseStudents = courseFilteredStudents.length;
    const totalPass = courseFilteredStudents.filter(s => s.finalStatus === 'ĐẬU').length;
    const totalFail = courseFilteredStudents.filter(s => s.finalStatus === 'RỚT').length;
    const totalAbsent = courseFilteredStudents.filter(s => s.finalStatus === 'VẮNG').length;
    const totalIncomplete = courseFilteredStudents.filter(s => s.finalStatus === 'CHƯA HOÀN THÀNH').length;
    const totalCompleted = totalPass + totalFail + totalAbsent;
    const passRate = totalCompleted > 0 ? Math.round((totalPass / totalCompleted) * 100) : 0;
    
    return { totalCourseStudents, totalPass, totalFail, totalAbsent, totalIncomplete, passRate };
  }, [courseFilteredStudents]);

  const passFailData = [
    { name: 'Đậu', value: stats.totalPass },
    { name: 'Rớt', value: stats.totalFail },
    { name: 'Vắng', value: stats.totalAbsent },
    { name: 'Chưa thi', value: stats.totalIncomplete }
  ].filter(item => item.value > 0);

  const commonErrors = useMemo(() => {
    const errorCounts: Record<string, number> = {};
    courseFilteredStudents.forEach(s => {
      s.testResults?.forEach((tr: any) => {
        if (filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType) return;
        tr.scores?.forEach((score: any) => {
          if (score.criterion) {
            if (filterExam !== 'ALL' && String(score.criterion.examId) !== filterExam) return;
            const criterionName = score.criterion.name;
            errorCounts[criterionName] = (errorCounts[criterionName] || 0) + score.timesDeducted;
          }
        });
      });
    });

    return Object.entries(errorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [courseFilteredStudents, filterTestType, filterExam]);

  const testTypeViolationStats = useMemo(() => {
    const stats: Record<string, { totalStudents: number, studentsWithErrors: number }> = {};
    
    courseFilteredStudents.forEach(s => {
      s.testResults?.forEach((tr: any) => {
        if (tr.testType) {
          const ttName = tr.testType.name;
          if (!stats[ttName]) stats[ttName] = { totalStudents: 0, studentsWithErrors: 0 };
          stats[ttName].totalStudents++;
          if (tr.scores && tr.scores.length > 0) {
            stats[ttName].studentsWithErrors++;
          }
        }
      });
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      'Tỉ lệ lỗi (%)': data.totalStudents > 0 ? Math.round((data.studentsWithErrors / data.totalStudents) * 100) : 0
    }));
  }, [courseFilteredStudents]);

  const teacherStudents = useMemo(() => {
    if (!filterTeacher) return [];
    return courseFilteredStudents.filter(s => s.teacherId === filterTeacher);
  }, [courseFilteredStudents, filterTeacher]);

  const teacherStats = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let absent = 0;
    let errorCount = 0;
    
    teacherStudents.forEach(s => {
      if (s.finalStatus === 'ĐẬU') pass++;
      if (s.finalStatus === 'RỚT') fail++;
      if (s.finalStatus === 'VẮNG') absent++;
      
      s.testResults?.forEach((tr: any) => {
        if (filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType) return;
        tr.scores?.forEach((score: any) => {
          if (score.points < 0 && score.criterion) {
            if (filterExam === 'ALL' || String(score.criterion.examId) === filterExam) {
              errorCount++;
            }
          }
        });
      });
    });

    return { total: teacherStudents.length, pass, fail, absent, errorCount };
  }, [teacherStudents, filterTestType, filterExam]);

  const allTeacherStats = useMemo(() => {
    const teacherData: Record<number, { name: string, 'Đậu': number, 'Rớt': number, 'Vắng': number }> = {};
    
    courseFilteredStudents.forEach(s => {
      if (s.teacherId) {
        if (!teacherData[s.teacherId]) {
          const tName = s.teacher?.name || 'Giáo viên không xác định';
          teacherData[s.teacherId] = { name: tName, 'Đậu': 0, 'Rớt': 0, 'Vắng': 0 };
        }
        if (s.finalStatus === 'ĐẬU') teacherData[s.teacherId]['Đậu']++;
        else if (s.finalStatus === 'RỚT') teacherData[s.teacherId]['Rớt']++;
        else if (s.finalStatus === 'VẮNG') teacherData[s.teacherId]['Vắng']++;
      }
    });

    return Object.values(teacherData).filter(d => (d['Đậu'] + d['Rớt'] + d['Vắng']) > 0);
  }, [courseFilteredStudents]);

  const handleExportTeacherStats = () => {
    if (teacherStudents.length === 0) {
      toast.error('Không có dữ liệu để xuất Excel');
      return;
    }
    
    const teacherName = teachers.find(t => t.id === filterTeacher)?.name || 'Giao_Vien';
    
    const exportData = teacherStudents.map((s, index) => {
      let errorCount = 0;
      let errorDetails: string[] = [];
      
      s.testResults?.forEach((tr: any) => {
        if (filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType) return;
        tr.scores?.forEach((score: any) => {
          if (score.points < 0 && score.criterion) {
            if (filterExam === 'ALL' || String(score.criterion.examId) === filterExam) {
              errorCount++;
              errorDetails.push(score.criterion.name);
            }
          }
        });
      });

      return {
        'STT': index + 1,
        'Họ tên': s.name,
        'Mã đăng ký': s.registrationCode,
        'CCCD': s.cccd,
        'Khóa': s.course?.name || '-',
        'Trạng thái': s.finalStatus || 'CHƯA THI',
        'Tổng lỗi VP': errorCount,
        'Chi tiết lỗi': errorDetails.join('; ')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThongKe_GiaoVien');
    XLSX.writeFile(workbook, `Thong_Ke_${teacherName}_${Date.now()}.xlsx`);
  };

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2 style={{ margin: '0 0 1.5rem 0' }}>Thống kê Sát hạch</h2>

        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ minWidth: '100%' }}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Khóa đào tạo</label>
              <select className="form-control" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                <option value="ALL">Tất cả Khóa đào tạo</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: '100%' }}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Ngày sát hạch</label>
              <input type="date" className="form-control" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div style={{ minWidth: '100%' }}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Trạm thi</label>
              <select className="form-control" value={filterTestType} onChange={(e) => { setFilterTestType(e.target.value); setFilterExam('ALL'); }}>
                <option value="ALL">Tất cả Trạm thi</option>
                {displayedTestTypes.map((tt: any) => (
                  <option key={tt.id} value={tt.id.toString()}>{tt.name}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: '100%' }}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Bài thi</label>
              <select className="form-control" value={filterExam} onChange={(e) => setFilterExam(e.target.value)}>
                <option value="ALL">Tất cả Bài thi</option>
                {displayedExams.map((exam: any) => (
                  <option key={exam.id} value={exam.id.toString()}>{exam.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tổng số học viên</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalCourseStudents}</div>
            </div>
            <Users size={36} style={{ opacity: 0.2, color: 'var(--text-secondary)' }} />
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#dcfce7', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Đậu</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalPass}</div>
            </div>
            <CheckCircle size={36} style={{ opacity: 0.2 }} />
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Rớt</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalFail}</div>
            </div>
            <XCircle size={36} style={{ opacity: 0.2 }} />
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Vắng</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalAbsent}</div>
            </div>
            <UserX size={36} style={{ opacity: 0.2 }} />
          </div>
          <div className="stat-card" style={{ padding: '1.5rem', background: '#e0e7ff', borderRadius: '12px', border: '1px solid #c7d2fe', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tỉ lệ đậu</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.passRate}%</div>
            </div>
            <TrendingUp size={36} style={{ opacity: 0.2 }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          {/* Biểu đồ tròn Đậu/Rớt */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ lệ Đậu / Rớt</h3>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ height: 300, minWidth: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passFailData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {passFailData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Biểu đồ cột: Tỉ lệ lỗi theo từng bài thi */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ lệ vi phạm theo Trạm thi</h3>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ height: 300, minWidth: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testTypeViolationStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Tỉ lệ lỗi (%)" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ ngang: Lỗi phổ biến nhất */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Top 10 lỗi vi phạm phổ biến nhất</h3>
          {commonErrors.length > 0 ? (
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commonErrors} layout="vertical" margin={{ left: 150 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" name="Số lần vi phạm" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>Chưa có dữ liệu lỗi vi phạm trong khoảng thời gian này.</p>
          )}
        </div>

        {/* Biểu đồ tỉ lệ đậu rớt theo giáo viên */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ lệ Đậu / Rớt theo Giáo viên</h3>
          {allTeacherStats.length > 0 ? (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ height: 400, minWidth: Math.max(500, allTeacherStats.length * 80) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allTeacherStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Đậu" stackId="a" fill="#166534" />
                    <Bar dataKey="Rớt" stackId="a" fill="#991b1b" />
                    <Bar dataKey="Vắng" stackId="a" fill="#92400e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>Chưa có dữ liệu học viên của các giáo viên.</p>
          )}
        </div>

        {/* Thống kê theo Giáo viên */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Thống kê theo Giáo viên dạy thực hành</h3>
          
          <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Giáo viên</label>
            <Select
              isClearable
              placeholder="🔍 Tìm tên giáo viên..."
              options={teachers.map((t: any) => ({ value: t.id, label: `${t.name} (${t.username})` }))}
              value={filterTeacher ? { value: filterTeacher, label: teachers.find(t => t.id === filterTeacher) ? `${teachers.find(t => t.id === filterTeacher).name} (${teachers.find(t => t.id === filterTeacher).username})` : '' } : null}
              onChange={(selected: any) => setFilterTeacher(selected ? selected.value : null)}
              styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
            />
          </div>

          {filterTeacher ? (
            <div>
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="stat-card" style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Số học viên</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{teacherStats.total}</div>
                  </div>
                  <Users size={24} style={{ opacity: 0.2, color: 'var(--text-secondary)' }} />
                </div>
                <div className="stat-card" style={{ padding: '1rem', background: '#dcfce7', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Đậu</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{teacherStats.pass}</div>
                  </div>
                  <CheckCircle size={24} style={{ opacity: 0.2 }} />
                </div>
                <div className="stat-card" style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Rớt</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{teacherStats.fail}</div>
                  </div>
                  <XCircle size={24} style={{ opacity: 0.2 }} />
                </div>
                <div className="stat-card" style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Vắng</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{teacherStats.absent}</div>
                  </div>
                  <UserX size={24} style={{ opacity: 0.2 }} />
                </div>
                <div className="stat-card" style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tổng lỗi VP</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{teacherStats.errorCount}</div>
                  </div>
                  <AlertTriangle size={24} style={{ opacity: 0.2 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0 }}>Danh sách Học viên</h4>
                <button className="btn btn-primary" onClick={handleExportTeacherStats} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={16} />
                  Xuất Excel
                </button>
              </div>
              <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Khóa</th>
                      <th>Họ tên</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherStudents.length > 0 ? teacherStudents.map((s: any, idx: number) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td><span className="badge badge-info">{s.courseName || '-'}</span></td>
                        <td><strong>{s.name}</strong></td>
                        <td>
                          <span className={`badge badge-${s.finalStatus === 'ĐẬU' ? 'success' : s.finalStatus === 'RỚT' ? 'danger' : s.finalStatus === 'VẮNG' ? 'warning' : 'secondary'}`}>
                            {s.finalStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-sm" 
                            style={{ background: '#e0e7ff', color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => setSelectedStudentForDetails(s)}
                            title="Xem chi tiết điểm và lỗi"
                          >
                            <Eye size={14} /> Chi tiết
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center text-muted">Chưa có học viên nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-muted text-center" style={{ padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
              Vui lòng chọn một giáo viên để xem thống kê
            </p>
          )}
        </div>

      </div>

      {selectedStudentForDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 600 }}>Chi tiết bài thi - {selectedStudentForDetails.name}</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setSelectedStudentForDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {selectedStudentForDetails.testResults?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedStudentForDetails.testResults.map((tr: any) => {
                    const isFiltered = filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType;
                    if (isFiltered) return null;
                    
                    const score = tr.scores?.reduce((sum: number, s: any) => sum + s.points, 100) || 100;
                    
                    return (
                      <div key={tr.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{tr.testType?.name || 'Trạm thi'}</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              Trạng thái: <strong style={{ color: tr.status === 'FINISHED' || tr.status === 'TRANSFERRED' ? 'var(--success)' : 'inherit' }}>{tr.status}</strong>
                              {tr.vehicle && <span style={{ marginLeft: '1rem' }}>Xe: {tr.vehicle.name}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: score >= (tr.testType?.passingScore || 80) ? 'var(--success)' : 'var(--danger)' }}>
                              {score} điểm
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ padding: '1rem' }}>
                          <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Chi tiết các lỗi vi phạm:</h5>
                          {tr.scores && tr.scores.length > 0 ? (
                            <table className="table table-sm" style={{ margin: 0, fontSize: '0.9rem' }}>
                              <thead>
                                <tr>
                                  <th>Bài thi</th>
                                  <th>Lỗi vi phạm</th>
                                  <th style={{ textAlign: 'right' }}>Điểm trừ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tr.scores.map((s: any) => {
                                  if (s.points >= 0) return null;
                                  return (
                                    <tr key={s.id}>
                                      <td>{s.criterion?.exam?.name || '-'}</td>
                                      <td>{s.criterion?.name || '-'}</td>
                                      <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 'bold' }}>{s.points}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>Không có lỗi vi phạm nào.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>Chưa có dữ liệu bài thi</p>
              )}
            </div>
            
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', textAlign: 'right', background: 'var(--surface)' }}>
              <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setSelectedStudentForDetails(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StatisticsManager;
