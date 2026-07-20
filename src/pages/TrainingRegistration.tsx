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
              <div className="space-y-6">
                {sessions.map(session => {
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

                  return (
                    <div key={session.id} className="border rounded-lg p-4 bg-white shadow-sm" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-bold flex items-center gap-2 mb-1">
                            <Calendar size={18} className="text-primary" />
                            {formatDateDisplay(session.date)}
                          </h4>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                            <div className="flex items-center gap-1">
                              <MapPin size={16} /> {session.trainingGround?.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={16} /> {session.trainingShift?.name} 
                              {(session.startTime || session.endTime) && ` (${session.startTime || '?'} - ${session.endTime || '?'})`}
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            status === 'OPEN' ? 'bg-green-100 text-green-800' : 
                            status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {statusText}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Chọn xe tập:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {vehicles.length > 0 ? vehicles.map((vehicle: string) => {
                            const reg = registrations.find((r: any) => r.vehicle === vehicle);
                            const isMine = reg?.userId === user.id;
                            const isTaken = !!reg;
                            const disabled = status !== 'OPEN' || (isTaken && !isMine);

                            return (
                              <div
                                key={vehicle}
                                onClick={() => {
                                  if (!disabled) handleRegister(session.id, vehicle);
                                }}
                                className={`
                                  relative flex flex-col p-4 rounded-xl border shadow-sm transition-all
                                  ${isMine ? 'bg-primary/5 border-primary' : 
                                    isTaken ? 'bg-gray-100 border-gray-200 opacity-80' : 
                                    status === 'OPEN' ? 'hover:shadow-md hover:border-primary/50 cursor-pointer bg-white' : 
                                    'bg-gray-50 border-gray-200 cursor-not-allowed'}
                                `}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className={`p-2 rounded-lg ${isMine ? 'bg-primary text-white' : isTaken ? 'bg-gray-300 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <Car size={24} />
                                  </div>
                                  <div>
                                    {isMine && <span className="bg-primary text-white text-[10px] px-2 py-1 rounded-full font-medium">Của bạn</span>}
                                    {isTaken && !isMine && <span className="bg-gray-300 text-gray-700 text-[10px] px-2 py-1 rounded-full font-medium">Đã chọn</span>}
                                    {!isTaken && status === 'OPEN' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-medium">Còn trống</span>}
                                  </div>
                                </div>
                                
                                <h5 className="font-bold text-lg mb-2">{vehicle}</h5>
                                
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} /> {session.trainingShift?.name}
                                  </div>
                                  {(session.startTime || session.endTime) && (
                                    <div className="flex items-center gap-1 text-muted">
                                      {session.startTime || '?'} - {session.endTime || '?'}
                                    </div>
                                  )}
                                  {isTaken && reg?.user && (
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t text-primary font-medium">
                                      <UserCircle size={12} /> {reg.user.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }) : (
                            <span className="text-sm text-gray-500">Chưa có danh sách xe.</span>
                          )}
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
