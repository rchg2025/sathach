import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const ExaminerDashboard = () => {
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

  const handleScore = () => {
    // Fake event
    socket.emit('score_updated', { studentId: 1, testTypeId: 1, totalScore: 95 });
    alert('Đã trừ 5 điểm (Fake Event)');
  };

  if (!user) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Xin chào Giám khảo {user.name}</h2>
        <button className="btn btn-danger" onClick={() => { localStorage.clear(); navigate('/login'); }}>
          Đăng xuất
        </button>
      </div>

      <div className="card">
        <h3>Danh Sách Học Viên Cần Chấm Thi</h3>
        <p className="text-muted">Tính năng đang được phát triển...</p>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>CCCD</th>
              <th>Họ và Tên</th>
              <th>Khóa Học</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>00123456789</td>
              <td>Nguyễn Văn A</td>
              <td>Khóa K1 - 2026</td>
              <td>
                <button className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>Bắt đầu chấm</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-4">
        <h3>Giao Diện Chấm Điểm (Mẫu)</h3>
        <p>Đang chấm: <strong>Nguyễn Văn A</strong> - Loại sát hạch: <strong>Sa hình</strong></p>
        <h1 className="text-center" style={{ fontSize: '4rem', color: 'var(--primary)' }}>100</h1>
        
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-danger" onClick={handleScore}>-5 điểm (Chạm vạch)</button>
          <button className="btn btn-danger" onClick={handleScore}>-5 điểm (Không xi nhan)</button>
          <button className="btn btn-danger" onClick={handleScore}>-10 điểm (Chết máy)</button>
          <button className="btn btn-danger" style={{ backgroundColor: '#333' }}>TRUẤT QUYỀN THI</button>
        </div>
      </div>
    </div>
  );
};

export default ExaminerDashboard;
