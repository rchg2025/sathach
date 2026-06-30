import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import Select from 'react-select';
import { removeAccents } from '../utils/stringUtils';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const ExamManager = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [exams, setExams] = useState([]);
  const [testTypes, setTestTypes] = useState([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testTypeId, setTestTypeId] = useState('');
  
  // Pagination & Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchExams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/exams`);
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTestTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/test-types`);
      setTestTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchTestTypes();
  }, []);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTypeId) {
      toast.error('Vui lòng chọn Trạm thi');
      return;
    }
    
    try {
      const payload = { name, description, testTypeId };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/manager/exams/${editingId}`, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await axios.post(`${API_BASE_URL}/api/manager/exams`, payload);
        toast.success('Thêm Bài thi thành công!');
      }
      resetForm();
      fetchExams();
      setActiveTab('list');
    } catch (err) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTestTypeId('');
    setEditingId(null);
  };

  const handleEdit = (exam: any) => {
    setEditingId(exam.id);
    setName(exam.name);
    setDescription(exam.description || '');
    setTestTypeId(exam.testTypeId.toString());
    setActiveTab('add');
  };

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/manager/exams/${deleteModal.id}`);
      toast.success('Xóa bài thi thành công!');
      fetchExams();
    } catch (err) {
      toast.error('Lỗi khi xóa bài thi');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredExams = exams.filter((e: any) => {
    const keyword = removeAccents(searchKeyword);
    const matchSearch = removeAccents(e.name).includes(keyword) || 
                        removeAccents(e.testType?.name || '').includes(keyword) || 
                        removeAccents(e.description || '').includes(keyword);
    const matchTestType = testTypeFilter === 'all' ? true : (e.testTypeId.toString() === testTypeFilter);
    return matchSearch && matchTestType;
  });
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const displayedExams = filteredExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredExams.map((e: any, index: number) => ({
      'STT': index + 1,
      'Tên Bài thi': e.name,
      'Thuộc Trạm thi': e.testType?.name || '',
      'Mô tả': e.description || '',
      'Số lượng tiêu chí': e.criteria?.length || 0,
      'Ngày tạo': new Date(e.createdAt).toLocaleDateString('vi-VN')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BaiThi');
    XLSX.writeFile(workbook, 'danh-sach-bai-thi.xlsx');
  };

  return (
    <div>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Danh sách Bài thi
        </div>
        <div 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { resetForm(); setActiveTab('add'); }}
        >
          {editingId ? 'Sửa Bài thi' : 'Thêm Bài thi mới'}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex" style={{ gap: '1rem', flex: 1, alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm bài thi, mô tả..." 
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                style={{ maxWidth: '300px' }}
              />
              <div style={{ width: '250px' }}>
                <Select
                  options={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...testTypes.map((t: any) => ({ value: t.id, label: t.name }))]}
                  value={[{ value: 'all', label: 'Tất cả Trạm thi' }, ...testTypes.map((t: any) => ({ value: t.id, label: t.name }))].find((opt: any) => opt.value.toString() === testTypeFilter)}
                  onChange={(selected: any) => { setTestTypeFilter(selected ? selected.value.toString() : 'all'); setCurrentPage(1); }}
                  placeholder="Lọc theo Trạm thi..."
                  styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}>
              <span>📥 Xuất Excel</span>
            </button>
          </div>
          
          <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
<table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tên Bài thi</th>
                <th>Thuộc Trạm thi</th>
                <th>Mô tả</th>
                <th>Số lượng tiêu chí</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedExams.length > 0 ? displayedExams.map((exam: any, idx: number) => (
                <tr key={exam.id}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td><strong>{exam.name}</strong></td>
                  <td><span className="badge badge-info">{exam.testType?.name}</span></td>
                  <td>{exam.description || '-'}</td>
                  <td><span className="badge badge-warning">{exam.criteria?.length || 0}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="action-btn btn-edit" title="Sửa" onClick={() => handleEdit(exam)}><Edit size={16} /></button>
                      <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(exam.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Chưa có bài thi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-muted">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredExams.length)} trong tổng số {filteredExams.length}
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa bài thi này không?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {activeTab === 'add' && (
        <div className="card">
          <h3 className="mb-4">{editingId ? 'Cập nhật Bài thi' : 'Thêm Bài thi mới'}</h3>
          <form onSubmit={handleAddExam}>
            <div className="form-group">
              <label>Thuộc Trạm thi</label>
              <Select
                options={testTypes.map((t: any) => ({ value: t.id, label: t.name }))}
                value={testTypes.map((t: any) => ({ value: t.id, label: t.name })).find((opt: any) => opt.value.toString() === testTypeId) || null}
                onChange={(selected: any) => setTestTypeId(selected ? selected.value.toString() : '')}
                placeholder="-- Chọn Trạm thi (có thể gõ tìm kiếm) --"
                isClearable
                styles={{ control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '6px', padding: '2px', boxShadow: 'none' }) }}
              />
            </div>
            <div className="form-group">
              <label>Tên Bài thi (VD: Xuất phát, Lùi chuồng)</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={4}></textarea>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Lưu Bài thi</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExamManager;
