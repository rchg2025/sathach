const fs = require('fs');
const path = require('path');

const searchPath = path.join(__dirname, 'src', 'pages', 'StudentSearch.tsx');
let searchContent = fs.readFileSync(searchPath, 'utf-8');
searchContent = searchContent.replace(/\r\n/g, '\n');

const uiOld = `              {student.testResults && student.testResults.length === 3 && (
                <div>
                  {student.testResults.every((r: any) => r.totalScore >= 80 && r.status !== 'FAILED') ? (
                    <span className="badge badge-success" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>ĐẬU</span>
                  ) : (
                    <span className="badge badge-danger" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>RỚT</span>
                  )}
                </div>
              )}
            </div>

            {student.testResults && student.testResults.length > 0 ? (
              student.testResults.map((result: any) => (`;

const uiNew = `            </div>

            {uniqueDates.length > 1 && (
              <div style={{ marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>Chọn ngày thi:</label>
                <select 
                  className="form-control" 
                  style={{ width: 'auto', display: 'inline-block' }}
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {uniqueDates.map(d => (
                    <option key={d} value={d}>{d.split('-').reverse().join('/')}</option>
                  ))}
                </select>
              </div>
            )}

            {student && selectedDate && (
              <div style={{ marginBottom: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>Kết quả tổng hợp ({selectedDate.split('-').reverse().join('/')})</h4>
                  <div className="text-muted text-sm mt-1">
                    Đã hoàn thành: {displayResults.filter((r: any) => ['TRANSFERRED', 'FINISHED', 'FAILED', 'ABSENT'].includes(r.status)).length} trạm
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: overallResult === 'ĐẬU' ? 'var(--success)' : overallResult === 'RỚT' ? 'var(--danger)' : overallResult === 'VẮNG' ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    {overallResult}
                  </div>
                </div>
              </div>
            )}

            {displayResults.length > 0 ? (
              displayResults.map((result: any) => (`;

searchContent = searchContent.replace(uiOld, uiNew);
fs.writeFileSync(searchPath, searchContent, 'utf-8');
console.log('Patched StudentSearch.tsx UI');
