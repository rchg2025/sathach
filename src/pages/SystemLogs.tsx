import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { LogIn, LogOut, Shield, CheckCircle, XCircle } from 'lucide-react';
import Select from 'react-select';

const SystemLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  const filteredLogs = logs.filter(log => {
    // Search
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchName = log.user?.name?.toLowerCase().includes(keyword);
      const matchUsername = log.user?.username?.toLowerCase().includes(keyword);
      if (!matchName && !matchUsername) return false;
    }
    // Role filter
    if (roleFilter !== 'all' && log.user?.role !== roleFilter) return false;
    // Action filter
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    // Status filter
    if (statusFilter !== 'all') {
      const isOnline = statusFilter === 'online';
      if (Boolean(log.user?.isOnline) !== isOnline) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout user={user}>
      <div className="card">
        <h2 className="mb-4">Nhật ký Hệ thống</h2>
        
        <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ flex: '1 1 250px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm tên, tài khoản..." 
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Select
              options={[
                { value: 'all', label: 'Tất cả vai trò' },
                { value: 'ADMIN', label: 'Quản trị viên' },
                { value: 'MANAGER', label: 'Quản lý' },
                { value: 'STATION_MANAGER', label: 'Trưởng trạm' },
                { value: 'EXAMINER', label: 'Giám khảo' }
              ]}
              value={[{ value: 'all', label: 'Tất cả vai trò' }, { value: 'ADMIN', label: 'Quản trị viên' }, { value: 'MANAGER', label: 'Quản lý' }, { value: 'STATION_MANAGER', label: 'Trưởng trạm' }, { value: 'EXAMINER', label: 'Giám khảo' }].find(opt => opt.value === roleFilter)}
              onChange={(selected: any) => setRoleFilter(selected ? selected.value : 'all')}
              placeholder="Lọc Vai trò..."
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Select
              options={[
                { value: 'all', label: 'Tất cả hành động' },
                { value: 'LOGIN', label: 'Đăng nhập' },
                { value: 'LOGOUT', label: 'Đăng xuất' }
              ]}
              value={[{ value: 'all', label: 'Tất cả hành động' }, { value: 'LOGIN', label: 'Đăng nhập' }, { value: 'LOGOUT', label: 'Đăng xuất' }].find(opt => opt.value === actionFilter)}
              onChange={(selected: any) => setActionFilter(selected ? selected.value : 'all')}
              placeholder="Lọc Hành động..."
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Select
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'online', label: 'Đang trực tuyến' },
                { value: 'offline', label: 'Ngoại tuyến' }
              ]}
              value={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'online', label: 'Đang trực tuyến' }, { value: 'offline', label: 'Ngoại tuyến' }].find(opt => opt.value === statusFilter)}
              onChange={(selected: any) => setStatusFilter(selected ? selected.value : 'all')}
              placeholder="Lọc Trạng thái..."
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-5 text-muted">
            Không có dữ liệu nhật ký.
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, index) => (
                    <tr key={log.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
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

            {totalPages > 1 && (
              <div className="pagination-wrapper mt-4">
                <span className="text-muted">
                  Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredLogs.length)} trong tổng số {filteredLogs.length}
                </span>
                <div className="pagination flex" style={{ gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-outline" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page} 
                      className={"btn " + (currentPage === page ? 'btn-primary' : 'btn-outline')}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button 
                    className="btn btn-outline" 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemLogs;
