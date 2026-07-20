import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2, Calendar, MapPin, Clock, Car } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateDisplay } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';

const TrainingSessionManager = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'add'>('active');
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [trainingGroundId, setTrainingGroundId] = useState('');
  const [trainingShiftId, setTrainingShiftId] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [date, setDate] = useState('');
  
  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterGroundId, setFilterGroundId] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      const [sessRes, grndRes, shftRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/manager/training-sessions`),
        axios.get(`${API_BASE_URL}/api/manager/training-grounds`),
        axios.get(`${API_BASE_URL}/api/manager/training-shifts`)
      ]);
      setSessions(sessRes.data);
      setGrounds(grndRes.data);
      setShifts(shftRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingGroundId || !trainingShiftId || !date) {
      toast.error('Vui lòng chọn Sân, Ca và Ngày thực hiện!');
      return;
    }

    try {
      const payload = { trainingGroundId, trainingShiftId, vehicles, date };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/training-sessions/${editingId}`, payload);
        toast.success('Cập nhật Đợt tập xe thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/training-sessions`, payload);
        toast.success('Thêm Đợt tập xe thành công!');
      }
      resetForm();
      fetchData();
      setActiveTab('active');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setTrainingGroundId('');
    setTrainingShiftId('');
    setVehicles('');
    setDate('');
    setEditingId(null);
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setTrainingGroundId(s.trainingGroundId.toString());
    setTrainingShiftId(s.trainingShiftId.toString());
    setVehicles(s.vehicles || '');
    setDate(s.date ? new Date(s.date).toISOString().split('T')[0] : '');
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/training-sessions/${deleteModal.id}`);
      toast.success('Xóa Đợt tập xe thành công!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSessions = sessions.filter((s: any) => {
    const keyword = removeAccents(searchKeyword);
    const dateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
    
    // Tab filtering
    if (activeTab === 'active' && dateStr < todayStr) return false;
    if (activeTab === 'archived' && dateStr >= todayStr) return false;
    
    // Search filtering
    const searchMatch = removeAccents(s.vehicles || '').includes(keyword) ||
                        removeAccents(s.trainingGround?.name || '').includes(keyword) ||
                        removeAccents(s.trainingShift?.name || '').includes(keyword);
    
    // Dropdown filter
    const groundMatch = filterGroundId ? s.trainingGroundId.toString() === filterGroundId : true;

    return searchMatch && groundMatch;
  });

  const exportToExcel = () => {
    const dataToExport = filteredSessions.map((s: any, index: number) => ({
      'STT': index + 1,
      'Sân tập': s.trainingGround?.name || '',
      'Ca tập': s.trainingShift?.name || '',
      'Danh sách xe': s.vehicles || '',
      'Ngày thực hiện': s.date ? formatDateDisplay(s.date) : ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'QuanLyTapXe');
    XLSX.writeFile(workbook, `DanhSachTapXe_${activeTab}.xlsx`);
  };

  return (
    <AdminLayout user={user}>
      <h2 className="mb-4">Quản lý Đợt tập xe</h2>
      
      <div className="tabs mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Đang & Sắp diễn ra
        </div>
        <div 
          className={`tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Lưu trữ (Đã qua)
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Đợt tập' : 'Thêm Đợt tập mới'}
        </div>
      </div>

      {(activeTab === 'active' || activeTab === 'archived') && (
        <div className="card">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1, minWidth: 0, alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm xe, tên sân, tên ca..." 
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
              <select 
                className="form-control" 
                style={{ flex: 1, minWidth: 0 }} 
                value={filterGroundId} 
                onChange={e => setFilterGroundId(e.target.value)}
              >
                <option value="">Tất cả Sân tập</option>
                {grounds.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-export" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>Ngày thực hiện</th>
                  <th>Sân tập</th>
                  <th>Ca tập</th>
                  <th>Danh sách Xe</th>
                  <th className="sticky-col-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.length > 0 ? filteredSessions.map((s: any, idx: number) => (
                  <tr key={s.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} className="text-muted" />
                        <strong>{formatDateDisplay(s.date)}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} className="text-primary" />
                        {s.trainingGround?.name || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} className="text-warning" />
                        {s.trainingShift?.name || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Car size={16} className="text-success" />
                        <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.vehicles}>
                          {s.vehicles || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="sticky-col-right">
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(s)}><Edit size={16} /></button>
                        <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Chưa có Đợt tập xe nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa Đợt tập xe này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
      
      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Đợt tập xe' : 'Thêm Đợt tập xe mới'}</h3>
          <form onSubmit={handleAdd}>
            <div className="flex" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Sân tập</label>
                <select className="form-control" value={trainingGroundId} onChange={e => setTrainingGroundId(e.target.value)} required>
                  <option value="">-- Chọn Sân tập --</option>
                  {grounds.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ca tập</label>
                <select className="form-control" value={trainingShiftId} onChange={e => setTrainingShiftId(e.target.value)} required>
                  <option value="">-- Chọn Ca tập --</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Danh sách Xe (cách nhau bằng dấu phẩy)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={vehicles} 
                  onChange={e => setVehicles(e.target.value)} 
                  placeholder="VD: 51H-123.45, 51G-987.65" 
                  required 
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ngày thực hiện</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4">Lưu thông tin</button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default TrainingSessionManager;
