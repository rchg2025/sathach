import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userStr));
    }
  }, [navigate]);

  if (!user) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Xin chào, Quản lý {user.name}</h2>
        <button className="btn btn-danger" onClick={() => { localStorage.clear(); navigate('/login'); }}>
          Đăng xuất
        </button>
      </div>

      <div className="flex" style={{ gap: '20px' }}>
        <div className="card" style={{ flex: 1 }}>
          <h3>Quản lý Khóa học</h3>
          <p className="text-muted">Tính năng đang được phát triển...</p>
          <button className="btn btn-primary btn-block mt-4">Thêm Khóa Học Mới</button>
        </div>
        
        <div className="card" style={{ flex: 1 }}>
          <h3>Quản lý Học viên</h3>
          <p className="text-muted">Tính năng đang được phát triển...</p>
          <button className="btn btn-primary btn-block mt-4">Nhập Danh Sách Học Viên</button>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3>Phân công Giám khảo</h3>
          <p className="text-muted">Tính năng đang được phát triển...</p>
          <button className="btn btn-primary btn-block mt-4">Tạo Phân Công</button>
        </div>
      </div>

      <div className="card mt-4">
        <h3>Báo Cáo Tổng Hợp & Real-time</h3>
        <p className="text-muted">Khu vực này sẽ hiển thị điểm số được giám khảo gửi về theo thời gian thực (Socket.io).</p>
        
        <table className="table mt-4">
          <thead>
            <tr>
              <th>CCCD</th>
              <th>Họ và Tên</th>
              <th>Khóa Học</th>
              <th>Loại Sát Hạch</th>
              <th>Điểm</th>
              <th>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center text-muted">Chưa có dữ liệu real-time</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerDashboard;
