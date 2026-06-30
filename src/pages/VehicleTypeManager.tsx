import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const VehicleTypeManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchVehicleTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/vehicle-types`);
      setVehicleTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/vehicle-types`, {
        name, description
      });
      toast.success('Thêm loại xe thành công!');
      setName('');
      setDescription('');
      fetchVehicleTypes();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Loại xe
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Thêm Loại xe mới
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm loại xe..." 
              style={{ maxWidth: '300px' }}
            />
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>Tên loại xe</th>
                <th>Mô tả</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.length > 0 ? vehicleTypes.map((v: any) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.description || '-'}</td>
                  <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn btn-edit">Sửa</button>
                    <button className="action-btn btn-delete">Xóa</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có loại xe nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 className="mb-4">Thêm Loại xe mới</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Tên loại xe (VD: B1, B2, C...)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mô tả</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu loại xe</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default VehicleTypeManager;
