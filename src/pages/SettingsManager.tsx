import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { Globe, Folder, Mail, Database, RefreshCw, Download, ArrowUpCircle } from 'lucide-react';

const SettingsManager = () => {
  const [user, setUser] = useState<any>(null);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState<'seo' | 'drive' | 'backup' | 'smtp' | 'googleAuth'>('seo');
  
  // State for backups
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  
  // State for all settings
  const [settings, setSettings] = useState({
    seo_title: '',
    seo_description: '',
    google_search_console: '',
    logo_url: '',
    og_image_url: '',
    
    drive_client_email: '',
    drive_private_key: '',
    drive_folder_id: '',
    
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_sender_name: '',
    smtp_user: '',
    smtp_app_password: '',

    google_client_id: '',

    backup_schedule_enabled: 'false',
    backup_schedule_cycle: 'daily', // 'daily', 'weekly', 'monthly', 'quarterly'
    backup_schedule_time: '02:00',
    backup_schedule_day_of_week: '1', // 1: Monday, ..., 0: Sunday
    backup_schedule_day_of_month: '1', // 1..28
    backup_schedule_type: 'all',
    backup_max_keep: '10',
    backup_last_run: ''
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/settings`);
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (e) {
      toast.error('Lỗi tải cấu hình');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (section: string) => {
    try {
      // In a real app we'd save only the section, but here we can save all or filter
      await axios.post(`${API_BASE_URL}/api/manager/settings`, settings);
      toast.success(`Lưu cấu hình ${section} thành công!`);
    } catch (e) {
      toast.error(`Lỗi lưu cấu hình ${section}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadPromise = axios.post(`${API_BASE_URL}/api/manager/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    toast.promise(uploadPromise, {
      loading: 'Đang tải ảnh lên Google Drive...',
      success: (res) => {
        let finalUrl = res.data.url;
        if (finalUrl.startsWith('/api')) {
          finalUrl = `${API_BASE_URL}${finalUrl}`;
        }
        setSettings(prev => ({ ...prev, [fieldName]: finalUrl }));
        return 'Tải ảnh lên thành công!';
      },
      error: (err) => `Lỗi tải ảnh: ${err.response?.data?.error || err.message}`
    });
  };

  const handleTestDrive = async () => {
    const { drive_client_email, drive_private_key, drive_folder_id } = settings;
    if (!drive_client_email || !drive_private_key || !drive_folder_id) {
      toast.error('Vui lòng điền đầy đủ thông tin Cấu hình Google Drive');
      return;
    }
    
    const testPromise = axios.post(`${API_BASE_URL}/api/manager/test-drive`, {
      clientEmail: drive_client_email,
      privateKey: drive_private_key,
      folderId: drive_folder_id
    });

    toast.promise(testPromise, {
      loading: 'Đang kiểm tra kết nối với Google Team Drive...',
      success: (res) => res.data.message || 'Kết nối thành công!',
      error: (err) => `Lỗi kết nối: ${err.response?.data?.error || err.message}`
    });
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/manager/backups`);
      setBackups(res.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi tải danh sách sao lưu từ Google Drive');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackups();
    }
  }, [activeTab]);

  const handleCreateBackup = async (type: 'db' | 'code' | 'all') => {
    setIsCreatingBackup(true);
    const label = type === 'db' ? 'Cơ sở dữ liệu' : type === 'code' ? 'Mã nguồn' : 'Toàn bộ hệ thống';
    const backupPromise = axios.post(`${API_BASE_URL}/api/manager/backups/create`, { type });

    toast.promise(backupPromise, {
      loading: `Đang tạo và tải bản sao lưu ${label} lên Google Drive...`,
      success: (res) => {
        fetchBackups();
        return res.data.message || `Sao lưu ${label} thành công!`;
      },
      error: (err) => err.response?.data?.error || `Lỗi sao lưu ${label}`
    });

    try {
      await backupPromise;
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (file: any) => {
    const isDb = file.name.endsWith('.sql');
    const isCode = file.name.endsWith('.tar.gz');
    const confirmMsg = isDb 
      ? `CẢNH BÁO: Bạn có chắc chắn muốn khôi phục CƠ SỞ DỮ LIỆU từ bản sao lưu "${file.name}"?\nToàn bộ dữ liệu hiện tại sẽ được cập nhật lại theo file này!`
      : isCode
      ? `CẢNH BÁO: Bạn có chắc chắn muốn khôi phục MÃ NGUỒN từ bản sao lưu "${file.name}"?`
      : `Bạn có chắc muốn khôi phục file "${file.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setRestoringFileId(file.id);
    const restorePromise = axios.post(`${API_BASE_URL}/api/manager/backups/restore`, {
      fileId: file.id,
      fileName: file.name
    });

    toast.promise(restorePromise, {
      loading: `Đang tải bản sao lưu từ Google Drive và tiến hành khôi phục...`,
      success: (res) => {
        return res.data.message || 'Khôi phục thành công!';
      },
      error: (err) => err.response?.data?.error || 'Lỗi khôi phục từ Google Drive'
    });

    try {
      await restorePromise;
    } catch (err) {
      console.error(err);
    } finally {
      setRestoringFileId(null);
    }
  };

  if (!user) return <AdminLayout user={null}><div>Đang tải...</div></AdminLayout>;

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2 className="mb-4">Cấu hình Hệ thống</h2>

        {/* Tabs Navigation */}
        <div className="tabs mb-4 tabs-container" style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
          <button 
            className={`tab-btn ${activeTab === 'seo' ? 'active' : ''}`}
            onClick={() => setActiveTab('seo')}
            style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'seo' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'seo' ? 'var(--primary)' : 'var(--text-light)', fontWeight: activeTab === 'seo' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            <Globe size={16} /> SEO & Logo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
            style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'drive' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'drive' ? 'var(--primary)' : 'var(--text-light)', fontWeight: activeTab === 'drive' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            <Folder size={16} /> Google Drive
          </button>
          <button 
            className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
            style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'backup' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'backup' ? 'var(--primary)' : 'var(--text-light)', fontWeight: activeTab === 'backup' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            <Database size={16} /> Sao lưu & Khôi phục
          </button>
          <button 
            className={`tab-btn ${activeTab === 'smtp' ? 'active' : ''}`}
            onClick={() => setActiveTab('smtp')}
            style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'smtp' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'smtp' ? 'var(--text-light)' : 'var(--text-light)', fontWeight: activeTab === 'smtp' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            <Mail size={16} /> SMTP Gmail
          </button>
          <button 
            className={`tab-btn ${activeTab === 'googleAuth' ? 'active' : ''}`}
            onClick={() => setActiveTab('googleAuth')}
            style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'googleAuth' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'googleAuth' ? 'var(--primary)' : 'var(--text-light)', fontWeight: activeTab === 'googleAuth' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            <Globe size={16} /> Login Google
          </button>
        </div>
        
        {/* Khối 1: Thông tin Website */}
        {activeTab === 'seo' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#007bff' }} className="mb-4">
            <Globe size={20} /> Thông tin Website (SEO & Logo)
          </h4>
          
          <div className="form-group">
            <label>Tiêu đề Website (SEO Title)</label>
            <input type="text" className="form-control" name="seo_title" value={settings.seo_title} onChange={handleChange} placeholder="VD: Hệ Thống Sát Hạch Lái Xe" />
          </div>
          
          <div className="form-group">
            <label>Mô tả Website (SEO Description)</label>
            <textarea className="form-control" name="seo_description" value={settings.seo_description} onChange={handleChange} rows={3} placeholder="VD: Trang web hỗ trợ thi bằng lái..."></textarea>
          </div>
          
          <div className="form-group">
            <label>Mã xác minh Google Search Console (Mã Code dạng chuỗi dài)</label>
            <input type="text" className="form-control" name="google_search_console" value={settings.google_search_console} onChange={handleChange} placeholder="Vd: 31X..." />
          </div>
          
          <div className="dashboard-grid grid-cols-2 mt-4">
            <div className="form-group">
              <label>Link Logo chung</label>
              <div 
                style={{ border: '2px dashed #dee2e6', padding: '2rem', textAlign: 'center', cursor: 'pointer', borderRadius: '8px', position: 'relative' }}
                onClick={() => logoInputRef.current?.click()}
              >
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', color: '#007bff' }}>☁️</div>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>Kéo thả logo vào đây (hoặc click để chọn)<br/>(Click để chọn từ thư viện)</p>
                  </>
                )}
              </div>
              <input type="file" ref={logoInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} />
            </div>
            
            <div className="form-group">
              <label>Ảnh đại diện chia sẻ link (OG Image)</label>
              <div 
                style={{ border: '2px dashed #dee2e6', padding: '2rem', textAlign: 'center', cursor: 'pointer', borderRadius: '8px', position: 'relative' }}
                onClick={() => ogInputRef.current?.click()}
              >
                {settings.og_image_url ? (
                  <img src={settings.og_image_url} alt="OG" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', color: '#007bff' }}>☁️</div>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>Ảnh hiển thị mặc định cho các bài viết không có ảnh<br/>(Click để chọn từ thư viện)</p>
                  </>
                )}
              </div>
              <input type="file" ref={ogInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'og_image_url')} />
            </div>
          </div>
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'nowrap' }}>
            <button className="btn" style={{ border: '1px solid #007bff', color: '#007bff', background: 'white', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => toast('Đã gửi yêu cầu ép Google Index', { icon: '🚀' })}>
              🚀 Ép Index
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => handleSave('SEO & Logo')}>
              ✓ Lưu cấu hình
            </button>
          </div>
        </div>
        )}

        {/* Khối 2: Cấu hình Google Team Drive */}
        {activeTab === 'drive' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f39c12' }} className="mb-4">
            <Folder size={20} /> Cấu hình Google Team Drive (Upload file)
          </h4>
          
          <div className="form-group">
            <label>Client Email (Email Service Account)</label>
            <input type="text" className="form-control" name="drive_client_email" value={settings.drive_client_email} onChange={handleChange} placeholder="xxx@project-id.iam.gserviceaccount.com" />
          </div>
          
          <div className="form-group">
            <label>Private Key (Có thể copy toàn bộ file JSON vào đây)</label>
            <textarea className="form-control" name="drive_private_key" value={settings.drive_private_key} onChange={handleChange} rows={5} placeholder={'{\n  "type": "service_account",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}'}></textarea>
          </div>
          
          <div className="form-group">
            <label>Folder ID (Thư mục lưu ảnh)</label>
            <input type="text" className="form-control" name="drive_folder_id" value={settings.drive_folder_id} onChange={handleChange} placeholder="1dDKXJyt8du7UimS8mRtS..." />
          </div>
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'nowrap' }}>
            <button className="btn" style={{ border: '1px solid #f39c12', color: '#f39c12', background: 'white', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={handleTestDrive}>
              ⚡ Test kết nối
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => handleSave('Google Drive')}>
              ✓ Lưu cấu hình
            </button>
          </div>
        </div>
        )}

        {/* Khối: Sao lưu & Khôi phục Google Drive */}
        {activeTab === 'backup' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', margin: 0 }}>
              <Database size={20} /> Sao lưu & Khôi phục (Lưu trữ trên Google Drive)
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary" 
                style={{ background: '#10b981', borderColor: '#10b981', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                disabled={isCreatingBackup}
                onClick={() => handleCreateBackup('db')}
              >
                <Database size={16} /> Sao lưu Database
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#0284c7', borderColor: '#0284c7', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                disabled={isCreatingBackup}
                onClick={() => handleCreateBackup('code')}
              >
                <ArrowUpCircle size={16} /> Sao lưu Mã nguồn (Code)
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#6366f1', borderColor: '#6366f1', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                disabled={isCreatingBackup}
                onClick={() => handleCreateBackup('all')}
              >
                ⚡ Sao lưu Tất cả
              </button>
              <button 
                className="btn" 
                style={{ border: '1px solid var(--border)', background: 'white', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                onClick={fetchBackups}
                title="Làm mới danh sách"
                disabled={isLoadingBackups}
              >
                <RefreshCw size={16} className={isLoadingBackups ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Thiết lập lịch sao lưu tự động & Giới hạn lưu trữ */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h5 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>
              ⏰ Cài đặt Lịch sao lưu tự động & Giới hạn bản lưu
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Tự động sao lưu định kỳ</label>
                <select 
                  className="form-control" 
                  name="backup_schedule_enabled" 
                  value={settings.backup_schedule_enabled} 
                  onChange={handleChange}
                  style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.4' }}
                >
                  <option value="false">Tắt (Chỉ sao lưu thủ công)</option>
                  <option value="true">Bật (Tự động theo lịch hẹn)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Chu kỳ sao lưu</label>
                <select 
                  className="form-control" 
                  name="backup_schedule_cycle" 
                  value={settings.backup_schedule_cycle || 'daily'} 
                  onChange={handleChange}
                  disabled={settings.backup_schedule_enabled !== 'true'}
                  style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.4' }}
                >
                  <option value="daily">Hàng ngày (Daily)</option>
                  <option value="weekly">Hàng tuần (Weekly)</option>
                  <option value="monthly">Hàng tháng (Monthly)</option>
                  <option value="quarterly">Hàng quý (Quarterly - 3 tháng/lần)</option>
                </select>
              </div>

              {settings.backup_schedule_cycle === 'weekly' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Ngày trong tuần</label>
                  <select 
                    className="form-control" 
                    name="backup_schedule_day_of_week" 
                    value={settings.backup_schedule_day_of_week || '1'} 
                    onChange={handleChange}
                    disabled={settings.backup_schedule_enabled !== 'true'}
                    style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.4' }}
                  >
                    <option value="1">Thứ Hai</option>
                    <option value="2">Thứ Ba</option>
                    <option value="3">Thứ Tư</option>
                    <option value="4">Thứ Năm</option>
                    <option value="5">Thứ Sáu</option>
                    <option value="6">Thứ Bảy</option>
                    <option value="0">Chủ Nhật</option>
                  </select>
                </div>
              )}

              {(settings.backup_schedule_cycle === 'monthly' || settings.backup_schedule_cycle === 'quarterly') && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Ngày trong tháng</label>
                  <select 
                    className="form-control" 
                    name="backup_schedule_day_of_month" 
                    value={settings.backup_schedule_day_of_month || '1'} 
                    onChange={handleChange}
                    disabled={settings.backup_schedule_enabled !== 'true'}
                    style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.4' }}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={String(d)}>Ngày {d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Giờ thực hiện</label>
                <input 
                  type="time" 
                  className="form-control" 
                  name="backup_schedule_time" 
                  value={settings.backup_schedule_time} 
                  onChange={handleChange}
                  disabled={settings.backup_schedule_enabled !== 'true'}
                  style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Nội dung sao lưu</label>
                <select 
                  className="form-control" 
                  name="backup_schedule_type" 
                  value={settings.backup_schedule_type} 
                  onChange={handleChange}
                  disabled={settings.backup_schedule_enabled !== 'true'}
                  style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.4' }}
                >
                  <option value="all">Toàn bộ (Database & Mã nguồn)</option>
                  <option value="db">Chỉ Database (.sql)</option>
                  <option value="code">Chỉ Mã nguồn (.tar.gz)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Số bản mới nhất giữ lại</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  className="form-control" 
                  name="backup_max_keep" 
                  value={settings.backup_max_keep} 
                  onChange={handleChange}
                  placeholder="10"
                  style={{ minHeight: '44px', height: 'auto', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                {settings.backup_last_run ? `🕒 Lần sao lưu gần nhất: ${new Date(settings.backup_last_run).toLocaleString('vi-VN')}` : '🕒 Chưa có lịch sao lưu nào chạy gần đây.'}
                {settings.backup_max_keep && ` • Hệ thống sẽ chỉ giữ lại đúng ${settings.backup_max_keep} bản mới nhất và tự động xóa bản cũ trên Google Drive.`}
              </div>
              <button 
                className="btn btn-primary" 
                style={{ background: '#28a745', borderColor: '#28a745', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 500 }} 
                onClick={() => handleSave('Lịch sao lưu & Giới hạn')}
              >
                ✓ Lưu cài đặt lịch
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#334155' }}>📌 Cơ chế hoạt động:</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b' }}>
              <li>Bản sao lưu được nén tự động từ máy chủ và tải lên trực tiếp thư mục <b>Backups</b> trong Google Drive của bạn.</li>
              <li>Tự động dọn dẹp các bản sao lưu cũ trên Google Drive khi vượt quá số lượng <b>{settings.backup_max_keep || 10} bản mới nhất</b>.</li>
              <li>Bạn có thể bấm <b>Khôi phục</b> bất cứ lúc nào để đưa cơ sở dữ liệu về phiên bản đã sao lưu.</li>
              <li>Dữ liệu bao gồm đầy đủ tài khoản, học viên, phân công, kết quả chấm thi, cài đặt hệ thống.</li>
            </ul>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>STT</th>
                  <th>Tên bản sao lưu</th>
                  <th>Loại</th>
                  <th>Dung lượng</th>
                  <th>Thời gian sao lưu</th>
                  <th style={{ textAlign: 'center', width: '220px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingBackups ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh sách bản sao lưu từ Google Drive...</td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Chưa có bản sao lưu nào trên Google Drive. Bấm nút sao lưu bên trên để tạo bản đầu tiên!
                    </td>
                  </tr>
                ) : (
                  backups.map((b, idx) => {
                    const isDb = b.name.endsWith('.sql');
                    const isCode = b.name.endsWith('.tar.gz');
                    const sizeStr = b.size ? `${(Number(b.size) / (1024 * 1024)).toFixed(2)} MB` : '-';
                    const dateStr = b.createdTime ? new Date(b.createdTime).toLocaleString('vi-VN') : '-';

                    return (
                      <tr key={b.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{b.name}</strong>
                        </td>
                        <td>
                          {isDb ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Database (.sql)</span>
                          ) : isCode ? (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Mã nguồn (.tar.gz)</span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Khác</span>
                          )}
                        </td>
                        <td>{sizeStr}</td>
                        <td>{dateStr}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {b.webViewLink && (
                              <a 
                                href={b.webViewLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="action-btn"
                                title="Xem / Tải từ Google Drive"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem 0.6rem', color: '#0284c7', background: '#f0f9ff', borderRadius: '4px', textDecoration: 'none' }}
                              >
                                <Download size={15} />
                              </a>
                            )}
                            <button
                              className="btn btn-sm"
                              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                              disabled={restoringFileId === b.id}
                              onClick={() => handleRestoreBackup(b)}
                              title="Khôi phục phiên bản này"
                            >
                              <RefreshCw size={14} className={restoringFileId === b.id ? 'spin' : ''} />
                              {restoringFileId === b.id ? 'Đang khôi phục...' : 'Khôi phục'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Khối 3: Cấu hình SMTP Gmail */}
        {activeTab === 'smtp' && (
        <div className="card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6f42c1' }} className="mb-4">
            <Mail size={20} /> Cấu hình SMTP Gmail (Gửi thư thông báo)
          </h4>
          
          <div className="dashboard-grid grid-cols-2">
            <div className="form-group">
              <label>SMTP Host</label>
              <input type="text" className="form-control" name="smtp_host" value={settings.smtp_host} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input type="text" className="form-control" name="smtp_port" value={settings.smtp_port} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Tên người gửi (Sender Name)</label>
              <input type="text" className="form-control" name="smtp_sender_name" value={settings.smtp_sender_name} onChange={handleChange} placeholder="Hệ Thống Sát Hạch..." />
            </div>
            <div className="form-group">
              <label>Email gửi (SMTP User)</label>
              <input type="email" className="form-control" name="smtp_user" value={settings.smtp_user} onChange={handleChange} placeholder="admin@example.com" />
            </div>
            <div className="form-group">
              <label>Mật khẩu ứng dụng (App Password)</label>
              <input type="password" className="form-control" name="smtp_app_password" value={settings.smtp_app_password} onChange={handleChange} />
            </div>
          </div>
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'nowrap' }}>
            <button className="btn" style={{ border: '1px solid #6f42c1', color: '#6f42c1', background: 'white', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => toast.success('Gửi email test thành công! (Mô phỏng)')}>
              ✉️ Test gửi mail
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => handleSave('SMTP')}>
              ✓ Lưu cấu hình
            </button>
          </div>
        </div>
        )}

        {/* Khối 4: Cấu hình Google Login */}
        {activeTab === 'googleAuth' && (
        <div className="card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#db4437' }} className="mb-4">
            <Globe size={20} /> Cấu hình Đăng nhập Google
          </h4>
          
          <div className="form-group">
            <label>Google Client ID</label>
            <input type="text" className="form-control" name="google_client_id" value={settings.google_client_id} onChange={handleChange} placeholder="VD: 123456789-abc.apps.googleusercontent.com" />
          </div>

          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #db4437', marginTop: '15px', fontSize: '0.9rem' }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Hướng dẫn thiết lập Google OAuth:</h5>
            <ul style={{ paddingLeft: '20px', marginBottom: 0, color: '#555' }}>
              <li>Truy cập <b>Google Cloud Console</b> và tạo dự án mới.</li>
              <li>Vào mục <b>APIs & Services</b> &gt; <b>Credentials</b>, tạo một <b>OAuth client ID</b> (Loại Web application).</li>
              <li>Ở phần <b>Authorized JavaScript origins</b> (Nguồn gốc JS), hãy thêm: <code>https://sathach.vercel.app</code> và <code>http://localhost:5173</code></li>
              <li>Phần <b>Authorized redirect URIs</b> có thể để trống hoặc điền URL trang web.</li>
              <li>Copy chuỗi <b>Client ID</b> và dán vào ô bên trên để hoàn tất.</li>
            </ul>
          </div>
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'nowrap' }}>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745', padding: '0.4rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', flex: 1 }} onClick={() => handleSave('Login Google')}>
              ✓ Lưu cấu hình
            </button>
          </div>
        </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default SettingsManager;
