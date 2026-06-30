import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';

const VehicleTypeManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
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

  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [seatsFilter, setSeatsFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const payload = {
        name, description, seats, brand, owner, contractStart, contractEnd, manufacturingYear, inspectionExpiry
      };
      
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/vehicle-types/${editingId}`, payload);
        toast.success('Cập nhật xe thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/vehicle-types`, payload);
        toast.success('Thêm xe thành công!');
      }
      
      resetForm();
      fetchVehicleTypes();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSeats('');
    setBrand('');
    setOwner('');
    setContractStart('');
    setContractEnd('');
    setManufacturingYear('');
    setInspectionExpiry('');
    setEditingId(null);
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setName(v.name);
    setDescription(v.description || '');
    setSeats(v.seats?.toString() || '');
    setBrand(v.brand || '');
    setOwner(v.owner || '');
    setContractStart(v.contractStart ? v.contractStart.split('T')[0] : '');
    setContractEnd(v.contractEnd ? v.contractEnd.split('T')[0] : '');
    setManufacturingYear(v.manufacturingYear?.toString() || '');
    setInspectionExpiry(v.inspectionExpiry ? v.inspectionExpiry.split('T')[0] : '');
    setActiveTab('add');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa xe này không?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/manager/vehicle-types/${id}`);
        toast.success('Xóa xe thành công!');
        fetchVehicleTypes();
      } catch (err) {
        toast.error('Lỗi khi xóa xe');
      }
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

  const filteredVehicles = vehicleTypes.filter((v: any) => {
    const keyword = removeAccents(searchKeyword);
    const matchSearch = removeAccents(v.name).includes(keyword) || 
                        removeAccents(v.description || '').includes(keyword) ||
                        removeAccents(v.brand || '').includes(keyword) ||
                        removeAccents(v.owner || '').includes(keyword);
    const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'active' ? v.isActive : !v.isActive);
    const matchSeats = seatsFilter === 'all' ? true : (v.seats?.toString() === seatsFilter);
    return matchSearch && matchStatus && matchSeats;
  });
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const displayedVehicles = filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredVehicles.map((v: any, index: number) => ({
      'STT': index + 1,
      'Tên / Biển số': v.name,
      'Số chỗ': v.seats || '',
      'Hãng xe': v.brand || '',
      'Chủ xe': v.owner || '',
      'Năm SX': v.manufacturingYear || '',
      'Hạn GĐK': v.inspectionExpiry ? new Date(v.inspectionExpiry).toLocaleDateString('vi-VN') : '',
      'Hạn HĐ (Từ)': v.contractStart ? new Date(v.contractStart).toLocaleDateString('vi-VN') : '',
      'Hạn HĐ (Đến)': v.contractEnd ? new Date(v.contractEnd).toLocaleDateString('vi-VN') : '',
      'Trạng thái': v.isActive ? 'Hoạt động' : 'Tạm ngưng',
      'Ghi chú': v.description || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'QuanLyXe');
    XLSX.writeFile(workbook, 'danh-sach-xe.xlsx');
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
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Xe' : 'Thêm Xe mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm biển số, hãng, chủ xe..." 
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                style={{ minWidth: '200px', flex: 1, maxWidth: '250px' }}
              />
              <select className="form-control" style={{ maxWidth: '180px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
              <select className="form-control" style={{ maxWidth: '150px' }} value={seatsFilter} onChange={e => { setSeatsFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">Tất cả số chỗ</option>
                <option value="4">4 chỗ</option>
                <option value="5">5 chỗ</option>
                <option value="7">7 chỗ</option>
                <option value="16">16 chỗ</option>
                <option value="29">29 chỗ</option>
                <option value="45">45 chỗ</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
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
              {displayedVehicles.length > 0 ? displayedVehicles.map((v: any, idx: number) => (
                <tr key={v.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
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
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(v)}><Edit size={16} /></button>
                      <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(v.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có xe nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredVehicles.length)} trong tổng số {filteredVehicles.length}
              </span>
              <div className="pagination flex" style={{ gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật thông tin xe' : 'Thêm Xe mới'}</h3>
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
