import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const CriterionManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [criteria, setCriteria] = useState([]);
  const [exams, setExams] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [pointsToDeduct, setPointsToDeduct] = useState(5);
  const [examId, setExamId] = useState('');
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCriteria = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/criteria`);
      setCriteria(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/exams`);
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCriteria();
    fetchExams();
  }, []);

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) {
      toast.error('Vui lòng chọn Bài thi');
      return;
    }
    
    try {
      const payload = { name, pointsToDeduct, examId };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/criteria/${editingId}`, payload);
        toast.success('Cập nhật Tiêu chí thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/criteria`, payload);
        toast.success('Thêm Tiêu chí thành công!');
      }
      resetForm();
      fetchCriteria();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setPointsToDeduct(5);
    setExamId('');
    setEditingId(null);
  };

  const handleEdit = (criterion: any) => {
    setEditingId(criterion.id);
    setName(criterion.name);
    setPointsToDeduct(criterion.pointsToDeduct);
    setExamId(criterion.examId.toString());
    setActiveTab('add');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa Tiêu chí này không?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/manager/criteria/${id}`);
        toast.success('Xóa Tiêu chí thành công!');
        fetchCriteria();
      } catch (err) {
        toast.error('Lỗi khi xóa Tiêu chí');
      }
    }
  };

  const filteredCriteria = criteria.filter((c: any) => 
    c.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
    (c.exam?.name || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (c.exam?.testType?.name || '').toLowerCase().includes(searchKeyword.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredCriteria.length / itemsPerPage);
  const displayedCriteria = filteredCriteria.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredCriteria.map((c: any, index: number) => ({
      'STT': index + 1,
      'Tên Tiêu chí': c.name,
      'Thuộc Bài thi': c.exam?.name || '',
      'Thuộc Trạm thi': c.exam?.testType?.name || '',
      'Điểm trừ': c.pointsToDeduct
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TieuChi');
    XLSX.writeFile(workbook, 'danh-sach-tieu-chi.xlsx');
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Tiêu chí
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Tiêu chí' : 'Thêm Tiêu chí mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <input 
              type="text" 
              className="form-control" 
              placeholder="🔍 Tìm kiếm tiêu chí..." 
              value={searchKeyword}
              onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              style={{ maxWidth: '300px' }}
            />
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên Tiêu chí (Lỗi vi phạm)</th>
                <th>Trạm thi ➔ Bài thi</th>
                <th>Điểm trừ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedCriteria.length > 0 ? displayedCriteria.map((criterion: any, idx: number) => (
                <tr key={criterion.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td><strong>{criterion.name}</strong></td>
                  <td>
                    <span className="badge badge-info">{criterion.exam?.testType?.name}</span>
                    <span style={{ margin: '0 5px', color: 'var(--text-muted)' }}>➔</span>
                    <span className="badge badge-warning">{criterion.exam?.name}</span>
                  </td>
                  <td><strong style={{ color: 'var(--danger)' }}>-{criterion.pointsToDeduct}</strong></td>
                  <td>
                    <button className="action-btn btn-edit" onClick={() => handleEdit(criterion)}>Sửa</button>
                    <button className="action-btn btn-delete" onClick={() => handleDelete(criterion.id)}>Xóa</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có Tiêu chí nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredCriteria.length)} trong tổng số {filteredCriteria.length}
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
          <h3 className="mb-4">{editingId ? 'Cập nhật Tiêu chí' : 'Thêm Tiêu chí mới'}</h3>
          <form onSubmit={handleAddCriterion}>
            <div className="form-group">
              <label>Thuộc Bài thi (Gồm cả Trạm thi)</label>
              <select className="form-control" value={examId} onChange={e => setExamId(e.target.value)} required>
                <option value="">-- Chọn Bài thi --</option>
                {exams.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.testType?.name} ➔ {e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tên Tiêu chí (VD: Xe bị chết máy)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Số điểm trừ (Mặc định: 5)</label>
              <input type="number" className="form-control" value={pointsToDeduct} onChange={e => setPointsToDeduct(Number(e.target.value))} required min={1} max={100} />
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Tiêu chí</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CriterionManager;
