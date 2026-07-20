import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const TrainingGroundManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [grounds, setGrounds] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchGrounds = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/training-grounds`);
      setGrounds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGrounds();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, address, phone, email, mapUrl };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/training-grounds/${editingId}`, payload);
        toast.success('Cập nhật Sân tập thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/training-grounds`, payload);
        toast.success('Thêm Sân tập thành công!');
      }
      resetForm();
      fetchGrounds();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setMapUrl('');
    setEditingId(null);
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setName(v.name || '');
    setAddress(v.address || '');
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setMapUrl(v.mapUrl || '');
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/training-grounds/${deleteModal.id}`);
      toast.success('Xóa Sân tập thành công!');
      fetchGrounds();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredGrounds = grounds.filter((g: any) => {
    const keyword = removeAccents(searchKeyword);
    return removeAccents(g.name || '').includes(keyword) || 
           removeAccents(g.address || '').includes(keyword);
  });

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Sân tập
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Sân tập' : 'Thêm Sân tập'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm Sân tập..." 
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
            />
          </div>
          
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>Tên cơ sở</th>
                  <th>Địa chỉ</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Bản đồ</th>
                  <th className="sticky-col-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrounds.length > 0 ? filteredGrounds.map((g: any, idx: number) => (
                  <tr key={g.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{g.name}</strong></td>
                    <td>{g.address}</td>
                    <td>{g.phone}</td>
                    <td>{g.email}</td>
                    <td>
                      {g.mapUrl ? (
                        <a href={g.mapUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                          Xem bản đồ
                        </a>
                      ) : '-'}
                    </td>
                    <td className="sticky-col-right">
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(g)}><Edit size={16} /></button>
                        <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(g.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                      Chưa có Sân tập nào.
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
        message="Bạn có chắc chắn muốn xóa Sân tập này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
      
      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Sân tập' : 'Thêm Sân tập mới'}</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group mb-3">
              <label>Tên cơ sở</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group mb-3">
              <label>Địa chỉ</label>
              <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} required />
            </div>
            <div className="flex" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Số điện thoại</label>
                <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Email</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-group mb-4">
              <label>Bản đồ (Link Google Maps)</label>
              <input type="text" className="form-control" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
            <button type="submit" className="btn btn-primary">Lưu thông tin</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TrainingGroundManager;
