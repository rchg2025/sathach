import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Car, Map, List, Grid, Download, Search, Filter, ClipboardList, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        return 'Đang mở đăng ký';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let result = 'Sắp mở (Còn ';
      if (days > 0) result += `${days} ngày `;
      if (hours > 0 || days > 0) result += `${hours} giờ `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes} phút `;
      result += `${seconds} giây)`;
      
      return result;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
};

const TrainingRegistration = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin / Manager features
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'ALLOCATE'>('GRID');
  const [editModal, setEditModal] = useState<any>({ isOpen: false, reg: null, newVehicle: '' });
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

  
  const handleEditRegistration = async () => {
    if (!editModal.newVehicle) {
      toast.error('Vui lòng chọn xe');
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/api/training-registrations/${editModal.reg.id}`, {
        userId: user.id,
        vehicle: editModal.newVehicle
      });
      toast.success('Cập nhật đăng ký thành công!');
      setEditModal({ isOpen: false, reg: null, newVehicle: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi cập nhật đăng ký');
    }
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
        <div className="tabs mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
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
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-primary rounded-full mb-4">
                <ClipboardList size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Phân bổ xe thủ công</h3>
              <p className="text-gray-500 mt-2">Dành cho quản lý/admin: Cho phép gán xe trống cho người dùng bất kể thời gian đóng/mở đăng ký của đợt tập.</p>
            </div>
            
            <div className="space-y-6">
              <div className="form-group">
                <label className="block mb-2 font-semibold text-gray-700">1. Chọn Đợt tập xe</label>
                <Select 
                  options={sessions.map(s => ({
                    value: s.id,
                    label: `${formatDateDisplay(s.date)} - ${s.trainingGround?.name} - ${s.trainingShift?.name}`
                  }))}
                  onChange={(val: any) => {
                    setAllocateSessionId(val?.value || null);
                    setAllocateVehicle('');
                  }}
                  placeholder="Tìm kiếm đợt tập..."
                  isClearable
                  noOptionsMessage={() => "Không tìm thấy đợt tập nào"}
                  styles={{ control: (base) => ({ ...base, padding: '4px', borderRadius: '8px' }) }}
                />
              </div>
              
              {allocateSessionId && (
                <div className="form-group animate-fadeIn">
                  <label className="block mb-2 font-semibold text-gray-700">2. Chọn Xe trống</label>
                  <Select 
                    options={(sessions.find(s => s.id === allocateSessionId)?.vehicles.split(',').map((v: string) => v.trim()).filter((v: string) => v) || [])
                      .filter((v: string) => !(sessions.find(s => s.id === allocateSessionId)?.registrations || []).some((r: any) => r.vehicle === v))
                      .map((v: string) => ({ value: v, label: v }))
                    }
                    onChange={(val: any) => setAllocateVehicle(val?.value || '')}
                    placeholder="Chọn xe..."
                    isClearable
                    noOptionsMessage={() => "Không còn xe nào trống trong đợt tập này"}
                    styles={{ control: (base) => ({ ...base, padding: '4px', borderRadius: '8px' }) }}
                  />
                </div>
              )}

              {allocateSessionId && allocateVehicle && (
                <div className="form-group animate-fadeIn">
                  <label className="block mb-2 font-semibold text-gray-700">3. Chọn Người dùng</label>
                  <Select 
                    options={users.map(u => ({
                      value: u.id,
                      label: `${u.name || 'Không tên'} (${u.email || u.phone || u.username}) - ${u.role}`
                    }))}
                    onChange={(val: any) => setAllocateUserId(val?.value || null)}
                    placeholder="Tìm kiếm theo tên, email, sđt..."
                    isClearable
                    styles={{ control: (base) => ({ ...base, padding: '4px', borderRadius: '8px' }) }}
                  />
                </div>
              )}
              
              {allocateSessionId && allocateVehicle && allocateUserId && (
                <div className="pt-6 mt-6 border-t animate-fadeIn">
                  <button 
                    className="btn btn-primary w-full py-3 text-lg font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
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
                        fetchData();
                      } catch (err: any) {
                        toast.error(err.response?.data?.error || 'Lỗi khi phân bổ xe');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận phân bổ'}
                  </button>
                </div>
              )}
            </div>
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
                  <th>Hành động</th>
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
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="action-btn" title="Sửa" onClick={() => setEditModal({ isOpen: true, reg, newVehicle: reg.vehicle })}><Edit size={16} /></button>
                          <button className="action-btn text-danger" title="Xóa" onClick={() => handleCancelRegistration(reg.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
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
              <div className="space-y-4">
                {sessions.map((session: any) => {
                  const now = new Date();
                  const openTime = session.registrationStartTime ? new Date(session.registrationStartTime) : null;
                  const closeTime = session.registrationEndTime ? new Date(session.registrationEndTime) : null;
                  
                  let status = 'OPEN';
                  let statusText: React.ReactNode = 'Đang mở đăng ký';
                  if (openTime && now < openTime) {
                    status = 'UPCOMING';
                    statusText = <CountdownTimer targetDate={openTime} />;
                  } else if (closeTime && now > closeTime) {
                    status = 'CLOSED';
                    statusText = 'Đã đóng đăng ký';
                  }

                  const vehicles = (session.vehicles || '').split(',').map((v: string) => v.trim()).filter((v: string) => v);
                  const registrations = session.registrations || [];

                  if (vehicles.length === 0) return null;

                  return (
                    <div key={session.id} className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md">
                      <div style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)', padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', color: '#1f2937', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={18} className="text-primary" />
                            <span>{formatDateDisplay(session.date)}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} className="text-primary" />
                            <span>{session.trainingGround?.name || 'Chưa xác định'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} className="text-primary" />
                            <span>
                              {session.trainingShift?.name} 
                              {(session.startTime || session.endTime) && (
                                <span className="text-gray-500 font-normal ml-1">
                                  ({session.startTime || '?'} - {session.endTime || '?'})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {(openTime || closeTime) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', paddingLeft: '1.5rem', borderLeft: '1px solid #e5e7eb' }}>
                              <span style={{fontWeight: 'normal'}}>
                                Đăng ký: {openTime ? openTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' ' + openTime.toLocaleDateString() : '...'} - {closeTime ? closeTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' ' + closeTime.toLocaleDateString() : '...'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {session.trainingGround?.mapUrl && (
                            <a 
                              href={session.trainingGround.mapUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn-outline-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
                            >
                              <Map size={16} /> Xem bản đồ
                            </a>
                          )}
                          <span className="vehicle-card-badge m-0" style={{ backgroundColor: status === 'OPEN' ? '#e6f4ea' : status === 'UPCOMING' ? '#fef7e0' : '#f1f3f4', color: status === 'OPEN' ? '#137333' : status === 'UPCOMING' ? '#b06000' : '#3c4043', padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}>
                            {statusText}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="vehicle-grid">
                          {vehicles.map((vehicle: string) => {
                            const reg = registrations.find((r: any) => r.vehicle === vehicle);
                            const isMine = reg?.userId === user.id;
                            const isTaken = !!reg;
                            const disabled = status !== 'OPEN' || (isTaken && !isMine);

                            let cardClass = 'vehicle-card';
                            if (isMine) cardClass += ' mine';
                            else if (isTaken) cardClass += ' taken';
                            else if (disabled) cardClass += ' disabled';

                            return (
                              <div 
                                key={vehicle} 
                                className={cardClass}
                                onClick={() => !disabled && handleRegister(session.id, vehicle)}
                              >
                                <Car size={24} className="vehicle-card-icon" style={{ 
                                  color: isMine ? 'white' : isTaken ? '#adb5bd' : 'var(--primary)' 
                                }} />
                                <div className="vehicle-card-title">{vehicle}</div>
                                {isMine ? (
                                  <div className="vehicle-card-badge badge-mine">Của bạn</div>
                                ) : isTaken ? (
                                  <div className="vehicle-card-badge badge-taken">{reg.user?.name || 'Đã có người ĐK'}</div>
                                ) : disabled ? (
                                  <div className="vehicle-card-badge badge-taken">Không khả dụng</div>
                                ) : (
                                  <div className="vehicle-card-badge badge-free">Trống</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
              <div className="registered-vehicle-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myRegistrations.map(reg => (
                  <div key={reg.id} className="registered-vehicle-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', flex: 1 }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', minWidth: '60px' }}>{reg.vehicle}</span>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Calendar size={14} /> {formatDateDisplay(reg.trainingSession?.date)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={14} /> {reg.trainingSession?.trainingGround?.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Clock size={14} /> {reg.trainingSession?.trainingShift?.name}
                          {(reg.trainingSession?.startTime || reg.trainingSession?.endTime) && (
                            <span style={{ marginLeft: '4px' }}>
                              ({reg.trainingSession?.startTime || '?'} - {reg.trainingSession?.endTime || '?'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginLeft: '0.5rem' }}>
                      <button 
                        onClick={() => handleCancelRegistration(reg.id)}
                        className="action-btn"
                        style={{ color: 'var(--danger)', backgroundColor: '#fee2e2', border: '1px solid #fecaca', display: 'flex', padding: '0.5rem', borderRadius: '8px' }}
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
    
      {editModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 className="mb-4">Sửa đăng ký xe</h3>
            <div className="form-group mb-4">
              <label>Học viên: <strong>{editModal.reg.user?.name}</strong></label>
            </div>
            <div className="form-group mb-4">
              <label>Đợt tập: <strong>{formatDateDisplay(editModal.reg.session?.date)} ({editModal.reg.session?.trainingShift?.name})</strong></label>
            </div>
            <div className="form-group mb-4">
              <label>Chọn xe mới</label>
              <select 
                className="form-control" 
                value={editModal.newVehicle} 
                onChange={e => setEditModal({...editModal, newVehicle: e.target.value})}
              >
                <option value="">-- Chọn xe --</option>
                {editModal.reg.session?.vehicles.split(',').map((v: string) => v.trim()).filter((v: string) => v).map((v: string) => {
                  const isTaken = editModal.reg.session.registrations?.some((r: any) => r.vehicle === v && r.id !== editModal.reg.id);
                  return (
                    <option key={v} value={v} disabled={isTaken}>
                      {v} {isTaken ? '(Đã có người đăng ký)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setEditModal({ isOpen: false, reg: null, newVehicle: '' })}>Hủy</button>
              <button className="btn btn-primary" onClick={handleEditRegistration}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default TrainingRegistration;
