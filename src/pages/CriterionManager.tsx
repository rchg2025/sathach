import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import Select from 'react-select';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const CriterionManager = () => {
  
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [criteria, setCriteria] = useState([]);
  const [exams, setExams] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [name, setName] = useState('');
  const [pointsToDeduct, setPointsToDeduct] = useState(5);
  const [examId, setExamId] = useState('');
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCriteria = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/criteria`);
      setCriteria(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/exams`);
      setExams(res.data);
    } catch (err: any) {
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
    } catch (err: any) {
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

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/criteria/${deleteModal.id}?username=${(JSON.parse(localStorage.getItem('user') || '{}')?.username) || ''}`);
      toast.success('Xóa Tiêu chí thành công!');
      fetchCriteria();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const uniqueTestTypesMap = new Map();
  exams.forEach((e: any) => {
    if (e.testType) uniqueTestTypesMap.set(e.testType.id, e.testType);
  });
  const availableTestTypes = Array.from(uniqueTestTypesMap.values());
  const availableExamsForFilter = testTypeFilter === 'all' 
    ? exams 
    : exams.filter((e: any) => e.testTypeId?.toString() === testTypeFilter);

  const filteredCriteria = criteria.filter((c: any) => {
    const keyword = removeAccents(searchKeyword);
    const matchSearch = removeAccents(c.name).includes(keyword) || 
                        removeAccents(c.exam?.name || '').includes(keyword) ||
                        removeAccents(c.exam?.testType?.name || '').includes(keyword);
    const matchTestType = testTypeFilter === 'all' ? true : (c.exam?.testTypeId?.toString() === testTypeFilter);
    const matchExam = examFilter === 'all' ? true : (c.examId.toString() === examFilter);
    return matchSearch && matchTestType && matchExam;
  });
  
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
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: '1 1 100%', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="🔍 Tìm kiếm tiêu chí..." 
                  value={searchKeyword}
                  onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <Select
                  options={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...availableTestTypes.map((t: any) => ({ value: t.id, label: t.name }))]}
                  value={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...availableTestTypes.map((t: any) => ({ value: t.id, label: t.name }))].find((opt: any) => opt.value.toString() === testTypeFilter)}
                  onChange={(selected: any) => { setTestTypeFilter(selected ? selected.value.toString() : 'all'); setExamFilter('all'); setCurrentPage(1); }}
                  placeholder="Lọc Trạm thi..."
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>
              <div style={{ flex: '1 1 220px' }}>
                <Select
                  options={[{ value: 'all', label: 'Tất cả Bài thi' }, ...availableExamsForFilter.map((e: any) => ({ value: e.id, label: `${e.testType?.name} ➔ ${e.name}` }))]}
                  value={[{ value: 'all', label: 'Tất cả Bài thi' }, ...availableExamsForFilter.map((e: any) => ({ value: e.id, label: `${e.testType?.name} ➔ ${e.name}` }))].find((opt: any) => opt.value.toString() === examFilter)}
                  onChange={(selected: any) => { setExamFilter(selected ? selected.value.toString() : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc Bài thi..."
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content', flexShrink: 0 }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên Tiêu chí (Lỗi vi phạm)</th>
                <th>Trạm thi ➔ Bài thi</th>
                <th>Điểm trừ</th>
                <th className="sticky-col-right">Hành động</th>
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
                  <td className="sticky-col-right">
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(criterion)}><Edit size={16} /></button>
                      <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(criterion.id)}><Trash2 size={16} /></button>
                    </div>
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
</div>

          {totalPages > 1 && (
            <div className="pagination-wrapper mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredCriteria.length)} trong tổng số {filteredCriteria.length}
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
        message="Bạn có chắc chắn muốn xóa Tiêu chí này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Tiêu chí' : 'Thêm Tiêu chí mới'}</h3>
          <form onSubmit={handleAddCriterion}>
            <div className="form-group">
              <label>Thuộc Bài thi (Gồm cả Trạm thi)</label>
              <Select
                options={exams.map((e: any) => ({ value: e.id, label: `${e.testType?.name} ➔ ${e.name}` }))}
                value={exams.map((e: any) => ({ value: e.id, label: `${e.testType?.name} ➔ ${e.name}` })).find((opt: any) => opt.value.toString() === examId) || null}
                onChange={(selected: any) => setExamId(selected ? selected.value.toString() : '')}
                placeholder="-- Chọn Bài thi (có thể gõ tìm kiếm) --"
                isClearable
                styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
              />
            </div>
            <div className="form-group">
              <label>Tên Tiêu chí (VD: Xe bị chết máy)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Số điểm trừ (Mặc định: 5)</label>
              <input type="number" className="form-control" value={pointsToDeduct} onChange={e => setPointsToDeduct(Number(e.target.value))} required min={0.1} max={100} step="any" />
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Tiêu chí</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CriterionManager;
