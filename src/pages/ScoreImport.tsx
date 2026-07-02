import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Download, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';

const ScoreImport = () => {
  const [user, setUser] = useState<any>(null);
  const [importLog, setImportLog] = useState<{ status: 'success' | 'error', message: string, row: any }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      setUser(JSON.parse(u));
    }
  }, []);

  const downloadTemplate = () => {
    const templateData = [{
      'CCCD': '031202003583',
      'Khóa đào tạo': 'Khóa 186',
      'Trạm thi': 'Đường trường',
      'Điểm còn lại': 80,
      'Các lỗi vi phạm': 'Không thắt dây an toàn (x1), Chết máy (x2)',
      'Trạng thái': 'ĐẬU'
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // CCCD
      { wch: 15 }, // Khóa đào tạo
      { wch: 20 }, // Trạm thi
      { wch: 15 }, // Điểm còn lại
      { wch: 50 }, // Các lỗi vi phạm
      { wch: 15 }  // Trạng thái
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Mau-import-diem.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        const payload = data.map((row: any) => ({
          cccd: row['CCCD']?.toString().trim() || '',
          courseName: row['Khóa đào tạo']?.toString().trim() || '',
          testTypeName: row['Trạm thi']?.toString().trim() || '',
          remainingScore: row['Điểm còn lại'] !== '' ? Number(row['Điểm còn lại']) : null,
          errorsText: row['Các lỗi vi phạm']?.toString().trim() || '',
          status: row['Trạng thái']?.toString().trim() || ''
        }));

        if (payload.length === 0) {
          toast.error('File Excel không có dữ liệu');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const toastId = toast.loading('Đang xử lý import...');
        
        try {
          const res = await axios.post(`${API_BASE_URL}/api/manager/scores/import`, { scores: payload, stationManagerId: user?.id });
          setImportLog(res.data.logs);
          toast.success(`Đã xử lý ${payload.length} dòng`, { id: toastId });
        } catch (apiErr: any) {
          toast.error(apiErr.response?.data?.error || 'Lỗi khi import dữ liệu', { id: toastId });
        }
      } catch (err: any) {
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.', { id: 'excel-error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const successCount = importLog.filter(l => l.status === 'success').length;
  const errorCount = importLog.filter(l => l.status === 'error').length;

  return (
    <AdminLayout user={user}>
      <div className="p-4" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Import Điểm Thi</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" style={{ background: '#6c757d', color: 'white' }} onClick={downloadTemplate}>
              <Download size={18} className="me-2" /> Tải File Mẫu
            </button>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button className="btn" style={{ background: '#17a2b8', color: 'white' }} onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} className="me-2" /> Import Excel
            </button>
          </div>
        </div>

        {importLog.length > 0 && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'var(--surface)' }}>
              <h5 className="mb-0">Kết quả Import</h5>
              <div className="d-flex gap-3">
                <span className="text-success"><CheckCircle size={16} className="me-1" /> Thành công: {successCount}</span>
                <span className="text-danger"><AlertTriangle size={16} className="me-1" /> Thất bại: {errorCount}</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ background: 'var(--border)' }}>
                    <tr>
                      <th>Trạng thái</th>
                      <th>CCCD</th>
                      <th>Khóa đào tạo</th>
                      <th>Trạm thi</th>
                      <th>Chi tiết / Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importLog.map((log, idx) => (
                      <tr key={idx} className={log.status === 'error' ? 'table-danger' : ''}>
                        <td>
                          {log.status === 'success' ? (
                            <span className="badge bg-success">Thành công</span>
                          ) : (
                            <span className="badge bg-danger">Lỗi</span>
                          )}
                        </td>
                        <td>{log.row.cccd || '-'}</td>
                        <td>{log.row.courseName || '-'}</td>
                        <td>{log.row.testTypeName || '-'}</td>
                        <td className={log.status === 'error' ? 'text-danger' : 'text-success'}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {importLog.length === 0 && (
          <div className="card text-center p-5">
            <div className="text-muted mb-3">
              <Upload size={48} />
            </div>
            <h5>Chưa có dữ liệu Import</h5>
            <p className="text-muted">Tải file mẫu về, điền thông tin và upload để import điểm vào hệ thống.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ScoreImport;
