import React, { useState } from 'react';
import axios from 'axios';

const StudentSearch = () => {
  const [cccd, setCccd] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.get(`http://localhost:5000/api/student/lookup/${cccd}`);
      setStudent(res.data);
      setError('');
    } catch (err) {
      setError('Không tìm thấy học viên với CCCD này');
      setStudent(null);
    }
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="text-center">Tra Cứu Kết Quả Sát Hạch</h2>
        <p className="text-center text-muted mb-4">Vui lòng nhập số Căn Cước Công Dân (CCCD) để tra cứu điểm.</p>
        
        <form onSubmit={handleSearch} className="flex" style={{ gap: '10px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Nhập CCCD..."
            value={cccd}
            onChange={(e) => setCccd(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Tra Cứu</button>
        </form>
      </div>

      {error && <div className="card text-center" style={{ maxWidth: '600px', margin: '1rem auto' }}><span className="badge badge-danger">{error}</span></div>}

      {student && (
        <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            Thông tin Học viên
          </h3>
          <div className="flex" style={{ gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <p><strong>Họ và tên:</strong> {student.name}</p>
              <p><strong>CCCD:</strong> {student.cccd}</p>
            </div>
            <div>
              <p><strong>Ngày sinh:</strong> {student.dob || 'N/A'}</p>
            </div>
          </div>

          <h4>Kết Quả Thi</h4>
          {student.testResults && student.testResults.length > 0 ? (
            student.testResults.map((tr: any) => (
              <div key={tr.id} className="card" style={{ backgroundColor: 'var(--background)' }}>
                <div className="flex justify-between items-center mb-4">
                  <h5 style={{ margin: 0 }}>Bài thi: {tr.testType.name}</h5>
                  <span className={`badge ${tr.status === 'PASSED' ? 'badge-success' : tr.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                    {tr.status}
                  </span>
                </div>
                <h1 className="text-center" style={{ fontSize: '3rem', color: tr.totalScore >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                  {tr.totalScore} / 100
                </h1>
                
                {tr.scores && tr.scores.length > 0 && (
                  <div className="mt-4">
                    <strong>Chi tiết lỗi vi phạm:</strong>
                    <ul>
                      {tr.scores.map((s: any) => (
                        <li key={s.id} style={{ color: 'var(--danger)' }}>
                          - {s.criterion.name} (-{s.criterion.pointsToDeduct} điểm)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted">Chưa có kết quả thi nào.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
