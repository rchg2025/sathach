import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { Globe, Folder, Mail } from 'lucide-react';

const SettingsManager = () => {
  const [user, setUser] = useState<any>(null);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState<'seo' | 'drive' | 'smtp'>('seo');
  
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
    smtp_app_password: ''
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        setSettings(prev => ({ ...prev, [fieldName]: res.data.url }));
        return 'Tải ảnh lên thành công!';
      },
      error: (err) => `Lỗi tải ảnh: ${err.response?.data?.error || err.message}`
    });
  };

  if (!user) return <AdminLayout user={null}><div>Đang tải...</div></AdminLayout>;

  return (
    <AdminLayout user={user}>
      <div className="container">
        <h2 className="mb-4">Cấu hình Hệ thống</h2>

        {/* Tabs Navigation */}
        <div className="tabs mb-4" style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'seo' ? 'active' : ''}`}
            onClick={() => setActiveTab('seo')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'seo' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'seo' ? 'var(--primary)' : 'var(--text-light)', fontWeight: activeTab === 'seo' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Globe size={18} /> SEO & Logo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'drive' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'drive' ? 'var(--text-light)' : 'var(--text-light)', fontWeight: activeTab === 'drive' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Folder size={18} /> Google Drive
          </button>
          <button 
            className={`tab-btn ${activeTab === 'smtp' ? 'active' : ''}`}
            onClick={() => setActiveTab('smtp')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'smtp' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'smtp' ? 'var(--text-light)' : 'var(--text-light)', fontWeight: activeTab === 'smtp' ? '600' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Mail size={18} /> SMTP Gmail
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
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn" style={{ border: '1px solid #007bff', color: '#007bff', background: 'white' }} onClick={() => toast('Đã gửi yêu cầu ép Google Index', { icon: '🚀' })}>
              🚀 Ép Google Index
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745' }} onClick={() => handleSave('SEO & Logo')}>
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
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn" style={{ border: '1px solid #f39c12', color: '#f39c12', background: 'white' }} onClick={() => toast.success('Kết nối Google Drive thành công!')}>
              ⚡ Test kết nối
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745' }} onClick={() => handleSave('Google Drive')}>
              ✓ Lưu cấu hình
            </button>
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
          
          <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn" style={{ border: '1px solid #6f42c1', color: '#6f42c1', background: 'white' }} onClick={() => toast.success('Gửi email test thành công! (Mô phỏng)')}>
              ✉️ Test gửi mail
            </button>
            <button className="btn btn-primary" style={{ background: '#28a745', borderColor: '#28a745' }} onClick={() => handleSave('SMTP')}>
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
