import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Car, Map, List, Grid, Download, Search, Filter, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
const TrainingRegistration = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin / Manager features
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'ALLOCATE'>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterGround, setFilterGround] = useState('');

  // Allocation state
  const [users, setUsers] = useState<any[]>([]);
  const [allocateSessionId, setAllocateSessionId] = useState<number | null>(null);
  const [allocateVehicle, setAllocateVehicle] = useState<string>('');
  const [allocateUserId, setAllocateUserId] = useState<number | null>(null);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';

  const fetchData = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) setLoading(true);
      const [sessionsRes, myRegRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/training-registrations/sessions`),
        axios.get(`${API_BASE_URL}/api/training-registrations/my-registrations?userId=${user.id}`)
      ]);
      
      // Lọc bỏ những ngày đã qua theo múi giờ local của người dùng
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingSessions = sessionsRes.data.filter((session: any) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() >= today.getTime();
      });

      setSessions(upcomingSessions);
      setMyRegistrations(myRegRes.data);
    } catch (err) {
      console.error(err);
      if (!isAutoRefresh) toast.error('Không thể tải danh sách đợt tập xe');
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách người dùng');
    }
  };

  useEffect(() => {
    if (viewMode === 'ALLOCATE' && users.length === 0) {
      fetchUsers();
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
    // Auto-refresh data every 5 seconds to keep data synced with other users
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = (sessionId: number, vehicle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận đăng ký',
      message: `Bạn có chắc chắn muốn đăng ký ${vehicle} không?\nLưu ý: Mỗi tài khoản chỉ được đăng ký 1 xe trong cùng một ngày.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.post(`${API_BASE_URL}/api/training-registrations/register`, {
            trainingSessionId: sessionId,
            userId: user.id,
            vehicle
          });
          toast.success(`Đăng ký xe ${vehicle} thành công!`);
          fetchData();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Lỗi khi đăng ký xe');
        }
      }
    });
  };

  const handleCancelRegistration = (registrationId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hủy đăng ký',
      message: 'Bạn có chắc chắn muốn hủy đăng ký xe này không?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await axios.delete(`${API_BASE_URL}/api/training-registrations/${registrationId}`, {
            data: { userId: user.id }
          });
          toast.success('Hủy đăng ký thành công!');
          fetchData();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Lỗi khi hủy đăng ký');
        }
      }
    });
  };

  // Prepare data for Admin LIST view
  const allRegistrations = sessions.flatMap(session => 
    (session.registrations || []).map((reg: any) => ({
      ...reg,
      session
    }))
  );

  const filteredRegistrations = allRegistrations.filter((reg: any) => {
    const matchesSearch = reg.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          reg.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? reg.session.date.startsWith(filterDate) : true;
    const matchesGround = filterGround ? reg.session.trainingGround?.id.toString() === filterGround : true;
    return matchesSearch && matchesDate && matchesGround;
  });

  const exportToExcel = () => {
    const dataToExport = filteredRegistrations.map((reg: any) => ({
      'Ngày tập': formatDateDisplay(reg.session.date),
      'Ca tập': reg.session.trainingShift?.name || '',
      'Giờ tập': `${reg.session.startTime || '?'} - ${reg.session.endTime || '?'}`,
      'Trung tâm': reg.session.trainingGround?.name || '',
      'Xe đăng ký': reg.vehicle,
      'Họ và tên': reg.user?.name || '',
      'Email': reg.user?.email || '',
      'Số điện thoại': reg.user?.phone || '',
      'Thời gian đăng ký': new Date(reg.createdAt).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_dang_ky_xe");
    XLSX.writeFile(wb, "danh_sach_dang_ky_xe.xlsx");
  };

  const uniqueGrounds = Array.from(new Set(sessions.map(s => s.trainingGround?.id))).filter(Boolean)
                             .map(id => sessions.find(s => s.trainingGround?.id === id)?.trainingGround);

  return (
    <AdminLayout user={user}>
      <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Đăng ký tập xe</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            {viewMode === 'GRID' ? 'Chọn các ca tập và xe còn trống để đăng ký' : viewMode === 'LIST' ? 'Danh sách thông tin người đăng ký tập xe' : 'Phân bổ xe thủ công cho người dùng'}
          </p>
        </div>
      </div>
      
      {isAdmin && (
        <div className="tabs">
          <div 
            className={`tab ${viewMode === 'GRID' ? 'active' : ''}`}
            onClick={() => setViewMode('GRID')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Grid size={16} /> Giao diện đăng ký
          </div>
          <div 
            className={`tab ${viewMode === 'LIST' ? 'active' : ''}`}
            onClick={() => setViewMode('LIST')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <List size={16} /> Danh sách đăng ký
          </div>
          <div 
            className={`tab ${viewMode === 'ALLOCATE' ? 'active' : ''}`}
            onClick={() => setViewMode('ALLOCATE')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ClipboardList size={16} /> Phân bổ xe
          </div>
        </div>
      )}

            {viewMode === 'ALLOCATE' && isAdmin ? (
        <div className="card mb-6">
          <h3 className="mb-4 flex items-center gap-2"><ClipboardList size={20} className="text-primary"/> Phân bổ xe thủ công</h3>
          <p className="text-muted mb-4">Dành cho quản lý/admin: Cho phép gán xe trống cho người dùng bất kể thời gian đóng mở đăng ký.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gap: '1.5rem' }}>
            <div>
              <label className="block mb-2 font-medium">Đợt tập xe</label>
              <Select 
                options={sessions.map(s => ({
                  value: s.id,
                  label: `${formatDateDisplay(s.date)} - ${s.trainingGround?.name} - ${s.trainingShift?.name}`
                }))}
                onChange={(val: any) => {
                  setAllocateSessionId(val?.value || null);
                  setAllocateVehicle('');
                }}
                placeholder="Tìm kiếm hoặc chọn đợt tập..."
                isClearable
                noOptionsMessage={() => "Không tìm thấy đợt tập nào"}
              />
            </div>
            
            {allocateSessionId && (
              <div>
                <label className="block mb-2 font-medium">Chọn Xe trống</label>
                <Select 
                  options={(sessions.find(s => s.id === allocateSessionId)?.vehicles.split(',').map((v: string) => v.trim()).filter((v: string) => v) || [])
                    .filter((v: string) => !(sessions.find(s => s.id === allocateSessionId)?.registrations || []).some((r: any) => r.vehicle === v))
                    .map((v: string) => ({ value: v, label: v }))
                  }
                  onChange={(val: any) => setAllocateVehicle(val?.value || '')}
                  placeholder="Chọn xe..."
                  isClearable
                  noOptionsMessage={() => "Không còn xe nào trống trong đợt tập này"}
                />
              </div>
            )}

            {allocateSessionId && allocateVehicle && (
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium">Chọn người dùng</label>
                <Select 
                  options={users.map(u => ({
                    value: u.id,
                    label: `${u.name || 'Không tên'} (${u.email || u.phone || u.username}) - ${u.role}`
                  }))}
                  onChange={(val: any) => setAllocateUserId(val?.value || null)}
                  placeholder="Tìm kiếm theo tên, email, sđt..."
                  isClearable
                />
              </div>
            )}
            
            {allocateSessionId && allocateVehicle && allocateUserId && (
              <div className="md:col-span-2 mt-2">
                <button 
                  className="btn btn-primary w-full md:w-auto px-6 py-2"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await axios.post(`${API_BASE_URL}/api/training-registrations/register`, {
                        trainingSessionId: allocateSessionId,
                        vehicle: allocateVehicle,
                        userId: allocateUserId,
                        isAdminAction: true
                      });
                      toast.success('Phân bổ xe thành công!');
                      setAllocateSessionId(null);
                      setAllocateVehicle('');
                      setAllocateUserId(null);
                      fetchData(true);
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || 'Lỗi khi phân bổ xe');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Phân bổ xe này'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'LIST' && isAdmin ? (
        <div className="card mb-6" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem 1.5rem 0' }}>
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Danh sách đăng ký ({filteredRegistrations.length})</h3>
              <button onClick={exportToExcel} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={16} /> Xuất Excel
              </button>
            </div>

            <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm tên, email, tên xe..."
                  className="form-control"
                  style={{ paddingLeft: '35px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={{ width: '200px', position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="date"
                  className="form-control"
                  style={{ paddingLeft: '35px' }}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              
              <div style={{ width: '200px', position: 'relative' }}>
                <Filter size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <select
                  className="form-control"
                  style={{ paddingLeft: '35px' }}
                  value={filterGround}
                  onChange={(e) => setFilterGround(e.target.value)}
                >
                  <option value="">Tất cả trung tâm</option>
                  {uniqueGrounds.map((ground: any) => (
                    <option key={ground.id} value={ground.id}>{ground.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Ngày tập</th>
                  <th>Ca tập</th>
                  <th>Giờ tập</th>
                  <th>Trung tâm</th>
                  <th>Xe đăng ký</th>
                  <th>Họ và tên</th>
                  <th>Email / SĐT</th>
                  <th>Thời gian ĐK</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      Không tìm thấy dữ liệu đăng ký nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg: any) => (
                    <tr key={reg.id}>
                      <td className="font-medium">{formatDateDisplay(reg.session.date)}</td>
                      <td>{reg.session.trainingShift?.name}</td>
                      <td className="text-sm text-gray-600">{reg.session.startTime || '?'} - {reg.session.endTime || '?'}</td>
                      <td>{reg.session.trainingGround?.name}</td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{reg.vehicle}</span>
                      </td>
                      <td className="font-medium">{reg.user?.name}</td>
                      <td>
                        <div className="text-sm">{reg.user?.email}</div>
                        <div className="text-xs text-gray-500">{reg.user?.phone}</div>
                      </td>
                      <td className="text-xs text-gray-500">{new Date(reg.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left side: Available sessions */}
        <div className="md:col-span-2">
          <div className="card">
            <h3 className="mb-4">Danh sách Đợt tập xe</h3>
            {loading ? (
              <p>Đang tải...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center p-8 text-muted">
                Không có đợt tập xe nào đang mở đăng ký.
              </div>
            ) : (
              <div className="space-y-8">
                {Object.keys(
                  sessions.reduce((acc: any, session: any) => {
                    const dateStr = session.date.split('T')[0];
                    if (!acc[dateStr]) acc[dateStr] = [];
                    acc[dateStr].push(session);
                    return acc;
                  }, {})
                ).map((dateStr) => {
                  const dateSessions = sessions.filter((s: any) => s.date.split('T')[0] === dateStr);
                  
                  return (
                    <div key={dateStr} className="bg-white rounded-xl shadow-sm border p-5">
                      <h3 className="text-xl font-bold flex items-center gap-2 mb-5 text-primary border-b pb-3">
                        <Calendar size={24} /> 
                        {formatDateDisplay(dateSessions[0].date)}
                      </h3>
                      
                      <div className="space-y-6">
                        {(() => {
                          // Group sessions by training ground for this date
                          const sessionsByGround = dateSessions.reduce((acc: any, session: any) => {
                            const groundName = session.trainingGround?.name || 'Chưa xác định';
                            if (!acc[groundName]) {
                              acc[groundName] = { ground: session.trainingGround, sessions: [] };
                            }
                            acc[groundName].sessions.push(session);
                            return acc;
                          }, {});

                          return Object.values(sessionsByGround).map(({ ground, sessions: groundSessions }: any) => (
                            <div key={ground?.id || 'unknown'} className="mb-6 border rounded-xl overflow-hidden">
                              {/* Training Ground Header */}
                              <div className="bg-gray-100 p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                                  <MapPin size={20} />
                                  {ground?.name || 'Chưa xác định'}
                                </h4>
                                {ground?.mapUrl && (
                                  <a 
                                    href={ground.mapUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-primary flex items-center gap-1"
                                    style={{ display: 'inline-flex', padding: '6px 12px', border: '1px solid var(--primary)', borderRadius: '6px', color: 'var(--primary)', background: 'transparent', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}
                                  >
                                    <Map size={16} /> Xem bản đồ
                                  </a>
                                )}
                              </div>
                              
                              <div className="p-4 space-y-4 bg-white">
                                {groundSessions.map((session: any) => {
                                  const now = new Date();
                                  const openTime = session.registrationStartTime ? new Date(session.registrationStartTime) : null;
                                  const closeTime = session.registrationEndTime ? new Date(session.registrationEndTime) : null;
                                  
                                  let status = 'OPEN';
                                  let statusText = 'Đang mở đăng ký';
                                  if (openTime && now < openTime) {
                                    status = 'UPCOMING';
                                    statusText = `Sắp mở (${openTime.toLocaleString()})`;
                                  } else if (closeTime && now > closeTime) {
                                    status = 'CLOSED';
                                    statusText = 'Đã đóng đăng ký';
                                  }

                                  const vehicles = (session.vehicles || '').split(',').map((v: string) => v.trim()).filter((v: string) => v);
                                  const registrations = session.registrations || [];

                                  if (vehicles.length === 0) return null;

                                  return (
                                    <div key={session.id} className="bg-gray-50/50 rounded-lg p-4 border border-gray-100 mb-4 last:mb-0">
                                      {/* Session Header */}
                                      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                          <div className="flex items-center gap-2 font-semibold text-gray-800">
                                            <Clock size={16} className="text-primary" />
                                            {session.trainingShift?.name} 
                                            {(session.startTime || session.endTime) && (
                                              <span className="text-sm font-normal text-gray-600">
                                                ({session.startTime || '?'} - {session.endTime || '?'})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="vehicle-card-badge" style={{ backgroundColor: status === 'OPEN' ? '#e6f4ea' : status === 'UPCOMING' ? '#fef7e0' : '#f1f3f4', color: status === 'OPEN' ? '#137333' : status === 'UPCOMING' ? '#b06000' : '#3c4043', padding: '4px 10px', fontSize: '12px' }}>
                                            {statusText}
                                          </span>
                                        </div>
                                      </div>

                              {/* Vehicles Grid - Simple Square Cards */}
                              <div className="vehicle-grid">
                                {vehicles.map((vehicle: string) => {
                                  const reg = registrations.find((r: any) => r.vehicle === vehicle);
                                  const isMine = reg?.userId === user.id;
                                  const isTaken = !!reg;
                                  const disabled = status !== 'OPEN' || (isTaken && !isMine);

                                  let cardClass = 'vehicle-card';
                                  if (isMine) cardClass += ' mine';
                                  else if (isTaken) cardClass += ' taken';
                                  else if (status !== 'OPEN') cardClass += ' disabled';

                                  return (
                                    <div
                                      key={vehicle}
                                      onClick={() => {
                                        if (!disabled) handleRegister(session.id, vehicle);
                                      }}
                                      className={cardClass}
                                    >
                                      <Car size={36} className="vehicle-card-icon" style={{ color: isMine ? 'var(--primary)' : isTaken ? '#999' : '#333' }} />
                                      <span className="vehicle-card-title">{vehicle}</span>
                                      
                                      {/* Status Text inside card */}
                                      {isMine && (
                                        <span className="vehicle-card-badge badge-mine">
                                          Của bạn
                                        </span>
                                      )}
                                      {isTaken && !isMine && reg?.user && (
                                        <span className="vehicle-card-badge badge-taken" title={reg.user.name}>
                                          {reg.user.name}
                                        </span>
                                      )}
                                      {!isTaken && status === 'OPEN' && (
                                        <span className="vehicle-card-badge badge-free">
                                          Trống
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side: My registrations */}
        <div className="md:col-span-1">
          <div className="card sticky top-4">
            <h3 className="mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-success" />
              Xe đã đăng ký
            </h3>
            
            {myRegistrations.length === 0 ? (
              <p className="text-sm text-muted">Bạn chưa đăng ký xe nào.</p>
            ) : (
              <div className="registered-vehicle-list">
                {myRegistrations.map(reg => (
                  <div key={reg.id} className="registered-vehicle-card">
                    <div className="registered-vehicle-card-header">
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>{reg.vehicle}</span>
                    </div>
                    <div className="registered-vehicle-card-body">
                      <div className="registered-vehicle-card-item">
                        <Calendar size={14} /> {formatDateDisplay(reg.trainingSession?.date)}
                      </div>
                      <div className="registered-vehicle-card-item">
                        <MapPin size={14} /> {reg.trainingSession?.trainingGround?.name}
                      </div>
                      <div className="registered-vehicle-card-item">
                        <Clock size={14} /> {reg.trainingSession?.trainingShift?.name}
                      </div>
                    </div>
                    <div>
                      <button 
                        onClick={() => handleCancelRegistration(reg.id)}
                        className="action-btn"
                        style={{ color: 'var(--danger)', backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}
                        title="Hủy đăng ký"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </AdminLayout>
  );
};

export default TrainingRegistration;
