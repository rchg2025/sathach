import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const TestTypeManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [testTypes, setTestTypes] = useState([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTestTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/test-types`);
      setTestTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTestTypes();
  }, []);

  const handleAddTestType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/manager/test-types`, {
        name, description
      });
      alert('Thêm loại sát hạch thành công!');
      setName('');
      setDescription('');
      fetchTestTypes();
      setActiveTab('list');
    } catch (err) {
      alert('Có lỗi xảy ra!');
    }
  };

  return (
    <AdminLayout user={user}>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Quản lý loại sát hạch
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Thêm loại mới
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm..." 
              style={{ maxWidth: '300px' }}
            />
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>Tên loại sát hạch</th>
                <th>Mô tả</th>
                <th>Số lượng tiêu chí</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {testTypes.length > 0 ? testTypes.map((type: any) => (
                <tr key={type.id}>
                  <td><strong>{type.name}</strong></td>
                  <td>{type.description || '-'}</td>
                  <td><span className="badge badge-warning">{type.criteria?.length || 0}</span></td>
                  <td>
                    <button className="action-btn btn-view">Xem/Thêm tiêu chí</button>
                    <button className="action-btn btn-edit">Sửa</button>
                    <button className="action-btn btn-delete">Xóa</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 className="mb-4">Thêm loại sát hạch mới</h3>
          <form onSubmit={handleAddTestType}>
            <div className="form-group">
              <label>Tên loại sát hạch (VD: Sa hình, Đường trường)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={4}></textarea>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu lại</button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default TestTypeManager;
