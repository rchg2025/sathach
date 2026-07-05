import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  const [user, setUser] = useState<any>(null);
  
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => getLocalDateString());
  const [filterTestType, setFilterTestType] = useState('ALL');

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
      const [studentsRes, coursesRes, testTypesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/station/students-v2?userId=${currentUser.id}&role=${currentUser.role}&date=${queryDate}&courseId=${courseId}`),
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
      
      displayedTestTypes.forEach((tt: any) => {
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
      else if (displayedTestTypes.length > 0 && completedCount >= displayedTestTypes.length) finalStatus = 'ĐẬU';
      else finalStatus = 'CHƯA HOÀN THÀNH';

      return { ...student, finalStatus };
    });
  }, [students, displayedTestTypes, filterDate]);

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

  // Thống kê tổng quan
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

  // Thống kê lỗi vi phạm nhiều nhất
  const commonErrors = useMemo(() => {
    const errorCounts: Record<string, number> = {};
    courseFilteredStudents.forEach(s => {
      s.testResults?.forEach((tr: any) => {
        if (filterTestType !== 'ALL' && String(tr.testTypeId) !== filterTestType) return;
        tr.scores?.forEach((score: any) => {
          if (score.criterion) {
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
  }, [courseFilteredStudents, filterTestType]);

  // Tỉ lệ vi phạm theo bài thi
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
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>Bài thi (Trạm thi)</label>
              <select className="form-control" value={filterTestType} onChange={(e) => setFilterTestType(e.target.value)}>
                <option value="ALL">Tất cả các bài thi</option>
                {displayedTestTypes.map((tt: any) => (
                  <option key={tt.id} value={tt.id.toString()}>{tt.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Biểu đồ tròn Đậu/Rớt */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ lệ Đậu / Rớt</h3>
            <div style={{ height: 300 }}>
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

          {/* Biểu đồ cột: Tỉ lệ lỗi theo từng bài thi */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ lệ vi phạm theo Trạm thi</h3>
            <div style={{ height: 300 }}>
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

      </div>
    </AdminLayout>
  );
};

export default StatisticsManager;
