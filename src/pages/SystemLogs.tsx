import { useState, useEffect } from 'react';
import { Pagination } from '../components/Pagination';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { LogIn, LogOut, CheckCircle, XCircle } from 'lucide-react';
import Select from 'react-select';

const SystemLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
                    <th>Trạng thái</th>
                    <th>Đăng nhập gần nhất</th>
                    <th>Đăng xuất gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, index) => (
                    <tr key={log.user.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div>
                            <strong>
                              {log.user?.name}
                              <span 
                                style={{ 
                                  display: 'inline-block', 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  backgroundColor: log.user?.isOnline ? '#10b981' : '#9ca3af', 
                                  marginLeft: 6,
                                  marginBottom: 1
                                }} 
                                title={log.user?.isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
                              ></span>
                            </strong>
                            <div className="text-muted small">@{log.user?.username}</div>
                          </div>
                        </div>
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
                        {log.lastLoginAt ? (
                          <span>
                            <LogIn size={16} className="me-1 text-primary" />
                            {new Date(log.lastLoginAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {log.lastLogoutAt ? (
                          <span>
                            <LogOut size={16} className="me-1 text-danger" />
                            {new Date(log.lastLogoutAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-wrapper mt-4">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredLogs.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemLogs;
