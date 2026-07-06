const fs = require('fs');
let content = fs.readFileSync('src/pages/UserManager.tsx', 'utf8');

const regex = /<button className="btn" style={{ background: '#28a745', color: 'white', flex: 1, padding: '0\.4rem 0\.2rem', fontSize: '0\.75rem', whiteSpace: 'nowrap', minWidth: 0 }} onClick=\{exportExcel\}>Export<\/button>\s*<button className="btn" style={{ background: '#17a2b8', color: 'white', flex: 1, padding: '0\.4rem 0\.2rem', fontSize: '0\.75rem', whiteSpace: 'nowrap', minWidth: 0 }} onClick=\{.*?\}\>Import<\/button>\s*<button className="btn" style={{ background: '#6c757d', color: 'white', flex: 1, padding: '0\.4rem 0\.2rem', fontSize: '0\.75rem', whiteSpace: 'nowrap', minWidth: 0 }} onClick=\{downloadTemplate\}\>.*?<\/button>/;

const newButtons = `<button className="btn" style={{ backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={downloadTemplate}>
              <ClipboardList size={16} />
              <span>File Mẫu</span>
            </button>
            <button className="btn" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              <span>Nhập Excel</span>
            </button>
            <button className="btn" style={{ backgroundColor: '#0056b3', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={exportExcel}>
              <Download size={16} />
              <span>Xuất Excel</span>
            </button>`;

content = content.replace(regex, newButtons);
fs.writeFileSync('src/pages/UserManager.tsx', content, 'utf8');
console.log('done');
