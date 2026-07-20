import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Car, Map, List, Grid, Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
const TrainingRegistration = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin / Manager features
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterGround, setFilterGround] = useState('');

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

  const fetchData = async () => {
    try {
      setLoading(true);
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
      toast.error('Không thể tải danh sách đợt tập xe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh data every 5 seconds to keep data synced with other users
    const interval = setInterval(() => {
      fetchData();
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
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Đăng ký tập xe</h2>
          <p className="text-muted">
            {viewMode === 'GRID' ? 'Chọn các ca tập và xe còn trống để đăng ký' : 'Danh sách thông tin người đăng ký tập xe'}
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'GRID' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setViewMode('GRID')}
            >
              <Grid size={18} /> Giao diện đăng ký
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setViewMode('LIST')}
            >
              <List size={18} /> Danh sách đăng ký
            </button>
          </div>
        )}
      </div>

      {viewMode === 'LIST' && isAdmin ? (
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="mb-0">Danh sách đăng ký ({filteredRegistrations.length})</h3>
            <button onClick={exportToExcel} className="btn btn-success flex items-center gap-2">
              <Download size={18} /> Xuất Excel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm tên, email, tên xe..."
                className="form-control pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                className="form-control pl-10"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                className="form-select pl-10"
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
                        <span className="badge bg-primary text-white px-2 py-1 rounded">{reg.vehicle}</span>
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
              <div className="space-y-4">
                {myRegistrations.map(reg => (
                  <div key={reg.id} className="p-3 border rounded-lg bg-gray-50 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg text-primary">{reg.vehicle}</span>
                      <button 
                        onClick={() => handleCancelRegistration(reg.id)}
                        className="text-red-500 hover:text-red-700 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hủy đăng ký"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                    <div className="text-sm space-y-1 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} /> {formatDateDisplay(reg.trainingSession?.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} /> {reg.trainingSession?.trainingGround?.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} /> {reg.trainingSession?.trainingShift?.name}
                      </div>
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
