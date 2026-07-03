const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

const oldLayout = `            <div style={{ minWidth: '100%' }}>
              <input type="date" className="form-control mb-2" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
              <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>`;

const newLayout = `            <div style={{ minWidth: '100%' }}>
              <input type="date" className="form-control" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div style={{ minWidth: '100%' }}>
              <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>`;

reportsContent = reportsContent.replace(oldLayout, newLayout);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched layout in ReportsManager.tsx');
