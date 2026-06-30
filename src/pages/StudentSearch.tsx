import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const StudentSearch = () => {
  const [cccd, setCccd] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  
  const pollingRef = useRef<any>(null);

  const lookupStudent = async (searchCccd: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student/lookup/${searchCccd}`);
      setStudent(res.data);
      setError('');
      return res.data;
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        setError('Không tìm thấy học viên với CCCD này');
      } else {
        setError('Lỗi kết nối đến máy chủ');
      }
      setStudent(null);
      return null;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cccd) return;
    
    // Initial fetch
    const data = await lookupStudent(cccd);
    
    // If student is found and has a PENDING test result, start polling
    if (data && data.testResults && data.testResults.length > 0) {
      const latestResult = data.testResults[data.testResults.length - 1];
      if (latestResult.status === 'PENDING') {
        startPolling(data.cccd);
      } else {
        stopPolling();
      }
    } else {
      stopPolling();
    }
  };

  const startPolling = (searchCccd: string) => {
    stopPolling();
    setIsPolling(true);
    
    // Poll every 3 seconds
    pollingRef.current = setInterval(async () => {
      const data = await lookupStudent(searchCccd);
      
      if (data && data.testResults && data.testResults.length > 0) {
        const latestResult = data.testResults[data.testResults.length - 1];
        
        // Stop polling if test is finished (FAILED or PASSED) or score drops below 80
        if (latestResult.status !== 'PENDING' || latestResult.totalScore < 80) {
          stopPolling();
        }
      } else {
        stopPolling();
      }
    }, 3000);
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
      <div className="card text-center shadow-lg" style={{ borderTop: '4px solid var(--primary)' }}>
        <h2>Tra Cứu Kết Quả Sát Hạch</h2>
        <p className="text-muted mb-4">Nhập CCCD để xem điểm thi trực tiếp (Real-time)</p>
        
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex" style={{ gap: '10px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nhập số CCCD của bạn..." 
              value={cccd}
              onChange={e => setCccd(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Tra cứu</button>
          </div>
        </form>

        {error && <div className="badge badge-danger mb-4" style={{ display: 'block' }}>{error}</div>}

        {student && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{student.name}</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>CCCD: {student.cccd}</p>
            </div>

            {student.testResults && student.testResults.length > 0 ? (
              student.testResults.map((result: any) => (
                <div key={result.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', position: 'relative' }}>
                  
                  {isPolling && result.status === 'PENDING' && (
                    <span className="badge badge-warning" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: 'red', borderRadius: '50%', marginRight: '5px' }}></span>
                      Đang thi (Live)
                    </span>
                  )}
                  
                  <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{result.testType?.name}</h4>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-muted text-sm">Điểm số</div>
                      <div style={{ fontSize: '3rem', fontWeight: 'bold', color: result.totalScore >= 80 ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                        {result.totalScore}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-muted text-sm">Trạng thái</div>
                      <h4>
                        {result.status === 'PASSED' ? <span className="text-success">ĐẠT</span> : 
                         result.status === 'FAILED' || result.totalScore < 80 ? <span className="text-danger">KHÔNG ĐẠT</span> : 
                         <span className="text-warning">ĐANG THI</span>}
                      </h4>
                    </div>
                  </div>

                  {result.scores && result.scores.length > 0 && (
                    <div className="mt-4">
                      <h5 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Lịch sử trừ điểm:</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {result.scores.map((score: any) => (
                          <li key={score.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border)' }}>
                            <span>{score.criterion?.name}</span>
                            <span className="text-danger">-{score.criterion?.pointsToDeduct} điểm</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-muted" style={{ padding: '2rem 0' }}>
                Học viên chưa tham gia bài thi nào.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSearch;
