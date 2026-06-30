import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Users, BookOpen, ClipboardList, Shield } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const COLORS = ['#007bff', '#e6f0fa'];

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    totalCourses: 0,
    totalTestTypes: 0,
    activeExaminers: 0,
    passFail: [
      { name: 'Đậu (Passed)', value: 0 },
      { name: 'Rớt (Failed)', value: 0 },
    ],
    traffic: []
  });

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/dashboard/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userStr));
      fetchStats();
    }
  }, [navigate]);

  if (!user) return null;

  return (
    <AdminLayout user={user}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Bảng điều khiển</h2>

      {/* 4 Summary Cards */}
      <div className="dashboard-grid grid-cols-4 mb-4">
        <div className="card summary-card" style={{ marginBottom: 0 }}>
          <div>
            <div className="label">Tổng học viên</div>
            <div className="value" style={{ color: '#007bff' }}>{stats.totalStudents}</div>
          </div>
          <div className="icon-wrapper" style={{ color: '#28a745' }}><Users /></div>
        </div>
        <div className="card summary-card" style={{ marginBottom: 0 }}>
          <div>
            <div className="label">Tổng khóa học</div>
            <div className="value" style={{ color: '#6f42c1' }}>{stats.totalCourses}</div>
          </div>
          <div className="icon-wrapper" style={{ color: '#e83e8c' }}><BookOpen /></div>
        </div>
        <div className="card summary-card" style={{ marginBottom: 0 }}>
          <div>
            <div className="label">Loại sát hạch</div>
            <div className="value" style={{ color: '#dc3545' }}>{stats.totalTestTypes}</div>
          </div>
          <div className="icon-wrapper" style={{ color: '#ffc107' }}><ClipboardList /></div>
        </div>
        <div className="card summary-card" style={{ marginBottom: 0 }}>
          <div>
            <div className="label">Giám khảo / Đang làm việc</div>
            <div className="value" style={{ color: '#fd7e14' }}>{stats.activeExaminers}</div>
          </div>
          <div className="icon-wrapper" style={{ color: '#17a2b8' }}><Shield /></div>
        </div>
      </div>

      {/* 2 Charts Area */}
      <div className="dashboard-grid grid-cols-2 mb-4">
        <div className="card" style={{ marginBottom: 0, minHeight: '300px' }}>
          <h4 style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            Lưu lượng học viên đăng ký mới
          </h4>
          <div className="flex items-center justify-center" style={{ height: '200px', color: 'var(--text-muted)' }}>
            {stats.traffic.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#007bff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              'Chưa có dữ liệu thống kê.'
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, minHeight: '300px' }}>
          <h4 style={{ marginBottom: '1rem' }}>Tỷ lệ Đậu / Rớt toàn khóa</h4>
          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            {stats.passFail[0].value === 0 && stats.passFail[1].value === 0 ? (
              <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                Chưa có dữ liệu thi.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.passFail}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.passFail.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--primary)' }}>
                  <strong>Đậu {Math.round((stats.passFail[0].value / (stats.passFail[0].value + stats.passFail[1].value)) * 100)}%</strong><br/>
                  <span style={{ color: 'var(--text-muted)' }}>Rớt {Math.round((stats.passFail[1].value / (stats.passFail[0].value + stats.passFail[1].value)) * 100)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2 Tables Area */}
      <div className="dashboard-grid grid-cols-2">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="flex justify-between items-center mb-4">
            <h4 style={{ margin: 0 }}>Học viên thi gần đây</h4>
            <a href="#" style={{ fontSize: '0.875rem' }}>Xem tất cả &rarr;</a>
          </div>
          <table className="table" style={{ fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Tên Học Viên</th>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Khóa Học</th>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Thời gian</th>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="text-center text-muted" style={{ padding: '2rem 0' }}>
                  Chưa có học viên nào hoàn thành.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="flex justify-between items-center mb-4">
            <h4 style={{ margin: 0 }}>Giám khảo hoạt động nhiều nhất</h4>
            <a href="#" style={{ fontSize: '0.875rem' }}>Xem tất cả &rarr;</a>
          </div>
          <table className="table" style={{ fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Họ và tên</th>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Đã chấm</th>
                <th style={{ backgroundColor: 'transparent', padding: '0.5rem' }}>Loại sát hạch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem' }}><strong>Nguyễn Văn A</strong></td>
                <td style={{ padding: '0.5rem' }}>142 Học viên</td>
                <td style={{ padding: '0.5rem' }}>Sa hình</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}><strong>Trần Thị B</strong></td>
                <td style={{ padding: '0.5rem' }}>110 Học viên</td>
                <td style={{ padding: '0.5rem' }}>Đường trường</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}><strong>Lê Văn C</strong></td>
                <td style={{ padding: '0.5rem' }}>95 Học viên</td>
                <td style={{ padding: '0.5rem' }}>Đường trường</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerDashboard;
