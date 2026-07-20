import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const TrainingShiftManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [shifts, setShifts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchShifts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/training-shifts`);
      setShifts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, startTime, endTime };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/training-shifts/${editingId}`, payload);
        toast.success('Cập nhật Ca tập thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/training-shifts`, payload);
        toast.success('Thêm Ca tập thành công!');
      }
      resetForm();
      fetchShifts();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setStartTime('');
    setEndTime('');
    setEditingId(null);
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name || '');
    setStartTime(s.startTime || '');
    setEndTime(s.endTime || '');
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/training-shifts/${deleteModal.id}`);
      toast.success('Xóa Ca tập thành công!');
      fetchShifts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredShifts = shifts.filter((s: any) => {
    const keyword = removeAccents(searchKeyword);
    return removeAccents(s.name || '').includes(keyword);
  });

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Ca tập
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Ca tập' : 'Thêm Ca tập'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm Ca tập..." 
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
            />
          </div>
          
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>Tên ca</th>
                  <th>Thời gian bắt đầu</th>
                  <th>Thời gian kết thúc</th>
                  <th className="sticky-col-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredShifts.length > 0 ? filteredShifts.map((s: any, idx: number) => (
                  <tr key={s.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.startTime}</td>
                    <td>{s.endTime}</td>
                    <td className="sticky-col-right">
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(s)}><Edit size={16} /></button>
                        <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Chưa có Ca tập nào.
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
        message="Bạn có chắc chắn muốn xóa Ca tập này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
      
      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Ca tập' : 'Thêm Ca tập mới'}</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group mb-3">
              <label>Tên ca</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="flex" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Thời gian bắt đầu</label>
                <input type="time" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Thời gian kết thúc</label>
                <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-2">Lưu thông tin</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TrainingShiftManager;
