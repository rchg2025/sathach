import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { formatDateDisplay } from '../utils/dateUtils';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Car, UserCircle } from 'lucide-react';

const TrainingRegistration = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, myRegRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/training-registrations/sessions`),
        axios.get(`${API_BASE_URL}/api/training-registrations/my-registrations?userId=${user.id}`)
      ]);
      setSessions(sessionsRes.data);
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
  }, []);

  const handleRegister = async (sessionId: number, vehicle: string) => {
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
  };

  const handleCancelRegistration = async (registrationId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đăng ký xe này không?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/training-registrations/${registrationId}`, {
        data: { userId: user.id }
      });
      toast.success('Hủy đăng ký thành công!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi hủy đăng ký');
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="mb-4">
        <h2>Đăng ký tập xe</h2>
        <p className="text-muted">Chọn các ca tập và xe còn trống để đăng ký</p>
      </div>

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
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {dateSessions.map((session: any) => {
                          const now = new Date();
                          const openTime = session.registrationStartTime ? new Date(session.registrationStartTime) : null;
                          const closeTime = session.registrationEndTime ? new Date(session.registrationEndTime) : null;
                          
                          let status = 'OPEN';
                          if (openTime && now < openTime) status = 'UPCOMING';
                          else if (closeTime && now > closeTime) status = 'CLOSED';

                          const vehicles = (session.vehicles || '').split(',').map((v: string) => v.trim()).filter((v: string) => v);
                          const registrations = session.registrations || [];

                          if (vehicles.length === 0) return null;

                          return vehicles.map((vehicle: string) => {
                            const reg = registrations.find((r: any) => r.vehicle === vehicle);
                            const isMine = reg?.userId === user.id;
                            const isTaken = !!reg;
                            const disabled = status !== 'OPEN' || (isTaken && !isMine);

                            return (
                              <div
                                key={`${session.id}-${vehicle}`}
                                onClick={() => {
                                  if (!disabled) handleRegister(session.id, vehicle);
                                }}
                                className={`
                                  relative flex flex-col p-5 rounded-xl border-2 transition-all duration-200 overflow-hidden
                                  ${isMine ? 'bg-primary/5 border-primary shadow-md' : 
                                    isTaken ? 'bg-gray-100 border-gray-200 opacity-75' : 
                                    status === 'OPEN' ? 'hover:shadow-lg hover:-translate-y-1 hover:border-primary/40 cursor-pointer bg-white border-gray-100 shadow-sm' : 
                                    'bg-gray-50 border-gray-200 cursor-not-allowed'}
                                `}
                              >
                                {/* Status Banner */}
                                <div className={`absolute top-0 left-0 right-0 py-1 text-center text-[10px] font-bold uppercase tracking-wider
                                  ${isMine ? 'bg-primary text-white' : 
                                    isTaken ? 'bg-gray-300 text-gray-700' : 
                                    status === 'OPEN' ? 'bg-green-500 text-white' : 
                                    status === 'UPCOMING' ? 'bg-yellow-400 text-yellow-900' : 
                                    'bg-gray-400 text-white'}
                                `}>
                                  {isMine ? 'Xe của bạn' : isTaken ? 'Đã có người chọn' : status === 'OPEN' ? 'Còn trống - Nhấn để chọn' : status === 'UPCOMING' ? 'Sắp mở đăng ký' : 'Đã đóng đăng ký'}
                                </div>

                                <div className="flex justify-between items-center mt-4 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-full ${isMine ? 'bg-primary text-white' : isTaken ? 'bg-gray-300 text-gray-600' : 'bg-blue-50 text-primary'}`}>
                                      <Car size={24} />
                                    </div>
                                    <div>
                                      <h5 className="font-extrabold text-2xl text-gray-800">{vehicle}</h5>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2 mt-2 pt-3 border-t text-sm text-gray-600 flex-grow">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" /> 
                                    <span className="font-medium">{session.trainingGround?.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" /> 
                                    <span className="font-medium">{session.trainingShift?.name}</span>
                                    {(session.startTime || session.endTime) && (
                                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                                        {session.startTime || '?'} - {session.endTime || '?'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isTaken && reg?.user && (
                                  <div className="mt-4 p-2 bg-gray-100 rounded-lg flex items-center gap-2 text-sm text-gray-700 font-medium">
                                    <UserCircle size={18} className={isMine ? 'text-primary' : 'text-gray-500'} /> 
                                    {reg.user.name}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })}
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
    </AdminLayout>
  );
};

export default TrainingRegistration;
