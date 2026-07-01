import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { LogIn, LogOut, Shield, CheckCircle, XCircle } from 'lucide-react';

const SystemLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const u = userStr ? JSON.parse(userStr) : null;
    if (u) {
      axios.get(`${API_BASE_URL}/api/manager/system-logs?userId=${u.id}&role=${u.role}`)
        .then(res => {
          setLogs(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, []);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const getRoleName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Quản trị viên';
      case 'MANAGER': return 'Quản lý';
      case 'STATION_MANAGER': return 'Trưởng trạm';
      case 'EXAMINER': return 'Giám khảo';
      default: return role;
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="card">
        <h2 className="mb-4">Nhật ký Hệ thống</h2>
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-5 text-muted">
            Không có dữ liệu nhật ký.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ position: 'relative' }}>
                          <Shield size={24} className="text-muted" />
                          {log.user?.isOnline && (
                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', border: '2px solid white' }} title="Đang trực tuyến"></div>
                          )}
                        </div>
                        <div>
                          <strong>{log.user?.name}</strong>
                          <div className="text-muted small">@{log.user?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{getRoleName(log.user?.role)}</span>
                    </td>
                    <td>
                      {log.user?.isOnline ? (
                        <span className="text-success" style={{ fontWeight: '500' }}>
                          <CheckCircle size={14} className="me-1" /> Đang trực tuyến
                        </span>
                      ) : (
                        <span className="text-muted">
                          <XCircle size={14} className="me-1" /> Ngoại tuyến
                        </span>
                      )}
                    </td>
                    <td>
                      {log.action === 'LOGIN' ? (
                        <span className="text-primary fw-bold">
                          <LogIn size={16} className="me-1" /> Đăng nhập
                        </span>
                      ) : (
                        <span className="text-danger fw-bold">
                          <LogOut size={16} className="me-1" /> Đăng xuất
                        </span>
                      )}
                    </td>
                    <td>
                      {new Date(log.createdAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemLogs;
