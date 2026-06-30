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
  const [seats, setSeats] = useState('');
  const [brand, setBrand] = useState('');
  const [owner, setOwner] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState('');
  const [inspectionExpiry, setInspectionExpiry] = useState('');

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
        name, description, seats, brand, owner, contractStart, contractEnd, manufacturingYear, inspectionExpiry
      });
      toast.success('Thêm xe thành công!');
      setName('');
      setDescription('');
      setSeats('');
      setBrand('');
      setOwner('');
      setContractStart('');
      setContractEnd('');
      setManufacturingYear('');
      setInspectionExpiry('');
      fetchVehicleTypes();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const handleToggleStatus = async (v: any) => {
    try {
      await axios.put(`${API_BASE_URL}/api/manager/vehicle-types/${v.id}`, {
        isActive: !v.isActive
      });
      fetchVehicleTypes();
      toast.success('Cập nhật trạng thái thành công!');
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const renderDateWithWarning = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const dateFormatted = d.toLocaleDateString('vi-VN');
    
    if (diffDays < 0) {
      return (
        <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
          {dateFormatted} <br/><span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>🚨 Đã quá hạn</span>
        </div>
      );
    }
    if (diffDays <= 15) {
      return (
        <div style={{ color: '#d97706', fontWeight: 'bold' }}>
          {dateFormatted} <br/><span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>⚠️ Còn {diffDays} ngày</span>
        </div>
      );
    }
    return dateFormatted;
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Xe
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Thêm Xe mới
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
                <th>Tên / Biển số</th>
                <th>Số chỗ</th>
                <th>Hãng xe</th>
                <th>Chủ xe</th>
                <th>Năm SX</th>
                <th>Hạn GĐK</th>
                <th>Hạn Hợp Đồng</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.length > 0 ? vehicleTypes.map((v: any) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.seats || '-'}</td>
                  <td>{v.brand || '-'}</td>
                  <td>{v.owner || '-'}</td>
                  <td>{v.manufacturingYear || '-'}</td>
                  <td>{renderDateWithWarning(v.inspectionExpiry)}</td>
                  <td>{renderDateWithWarning(v.contractEnd)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={v.isActive} onChange={() => handleToggleStatus(v)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ fontSize: '0.85rem', color: v.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {v.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </span>
                    </div>
                  </td>
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
          <h3 className="mb-4">Thêm Xe mới</h3>
          <form onSubmit={handleAdd}>
            <div className="flex" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tên / Biển số xe</label>
                <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Hãng xe</label>
                <input type="text" className="form-control" value={brand} onChange={e => setBrand(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Số chỗ</label>
                <input type="number" className="form-control" value={seats} onChange={e => setSeats(e.target.value)} />
              </div>
            </div>
            
            <div className="flex" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Chủ xe</label>
                <input type="text" className="form-control" value={owner} onChange={e => setOwner(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Năm sản xuất</label>
                <input type="number" className="form-control" value={manufacturingYear} onChange={e => setManufacturingYear(e.target.value)} placeholder="VD: 2023" />
              </div>
            </div>

            <div className="flex" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Từ ngày (HĐ)</label>
                <input type="date" className="form-control" value={contractStart} onChange={e => setContractStart(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Đến ngày (HĐ)</label>
                <input type="date" className="form-control" value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ngày hết hạn GĐK</label>
                <input type="date" className="form-control" value={inspectionExpiry} onChange={e => setInspectionExpiry(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Ghi chú / Mô tả</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu thông tin xe</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default VehicleTypeManager;
