import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const TestTypeManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [testTypes, setTestTypes] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState(80);
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // const user = JSON.parse(localStorage.getItem('user') || '{}'); // No longer needed here

  const fetchTestTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/test-types`);
      setTestTypes(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTestTypes();
  }, []);

  const handleAddTestType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, description, maxScore, passingScore };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/test-types/${editingId}`, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/test-types`, payload);
        toast.success('Thêm loại sát hạch thành công!');
      }
      resetForm();
      fetchTestTypes();
      setActiveTab('list');
    } catch (err: any) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setMaxScore(100);
    setPassingScore(80);
    setEditingId(null);
  };

  const handleEdit = (testType: any) => {
    setEditingId(testType.id);
    setName(testType.name);
    setDescription(testType.description || '');
    setMaxScore(testType.maxScore || 100);
    setPassingScore(testType.passingScore || 80);
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/test-types/${deleteModal.id}?username=${(JSON.parse(localStorage.getItem('user') || '{}')?.username) || ''}`);
      toast.success('Xóa loại sát hạch thành công!');
      fetchTestTypes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredTestTypes = testTypes.filter((t: any) => {
    const keyword = removeAccents(searchKeyword);
    return removeAccents(t.name).includes(keyword) || removeAccents(t.description || '').includes(keyword);
  });
  const totalPages = Math.ceil(filteredTestTypes.length / itemsPerPage);
  const displayedTestTypes = filteredTestTypes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredTestTypes.map((t: any, index: number) => ({
      'STT': index + 1,
      'Tên loại sát hạch': t.name,
      'Mô tả': t.description || '',
      'Điểm tối đa': t.maxScore || 100,
      'Điểm đạt': t.passingScore || 80,
      'Ngày tạo': new Date(t.createdAt).toLocaleDateString('vi-VN')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LoaiSatHach');
    XLSX.writeFile(workbook, 'danh-sach-loai-sat-hach.xlsx');
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Trạm thi
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Trạm thi' : 'Thêm Trạm thi mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm tên trạm, mô tả..." 
              value={searchKeyword}
              onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              style={{ maxWidth: '300px' }}
            />
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên Trạm thi</th>
                <th>Mô tả</th>
                <th>Điểm tối đa</th>
                <th>Điểm đạt</th>
                <th className="sticky-col-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedTestTypes.length > 0 ? displayedTestTypes.map((type: any, idx: number) => (
                <tr key={type.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td><strong>{type.name}</strong></td>
                  <td>{type.description || '-'}</td>
                  <td><span className="badge badge-info">{type.maxScore || 100}</span></td>
                  <td><span className="badge badge-success">{type.passingScore || 80}</span></td>
                  <td className="sticky-col-right">
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(type)}><Edit size={16} /></button>
                      <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(type.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                  </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>

          {totalPages > 1 && (
            <div className="pagination-wrapper mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredTestTypes.length)} trong tổng số {filteredTestTypes.length}
              </span>
              <div className="pagination flex" style={{ gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa loại sát hạch này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Trạm thi' : 'Thêm Trạm thi mới'}</h3>
          <form onSubmit={handleAddTestType}>
            <div className="form-group">
              <label>Tên Trạm thi (VD: Sa hình, Đường trường)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={4}></textarea>
            </div>
            <div className="flex" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Điểm tối đa</label>
                <input type="number" className="form-control" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} required min={1} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Điểm đạt</label>
                <input type="number" className="form-control" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} required min={1} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Trạm thi</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TestTypeManager;
