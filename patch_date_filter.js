const fs = require('fs');
const path = require('path');

// 1. Patch ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

// Add filterDate state
const statePattern = `  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');`;
const newState = `  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);`;
reportsContent = reportsContent.replace(statePattern, newState);

// Update fetchData call
const fetchDataCallPattern = `      fetchData(parsedUser);`;
const newFetchDataCall = `      fetchData(parsedUser, new Date().toISOString().split('T')[0]);`;
reportsContent = reportsContent.replace(fetchDataCallPattern, newFetchDataCall);

// Update useEffect to watch filterDate
const oldUseEffect = `  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'MANAGER') {
        window.location.href = '/manager';
        return;
      }
      fetchData(parsedUser);
    } else {
      window.location.href = '/login';
    }
  }, []);`;
const newUseEffect = `  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'MANAGER') {
        window.location.href = '/manager';
        return;
      }
      fetchData(parsedUser, filterDate);
    } else {
      window.location.href = '/login';
    }
  }, [filterDate]);`;
reportsContent = reportsContent.replace(oldUseEffect, newUseEffect);

// Update fetchData
const oldFetchData = `  const fetchData = async (currentUser: any) => {
    try {
      const [studentsRes, coursesRes, testTypesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}\`),`;
const newFetchData = `  const fetchData = async (currentUser: any, date: string) => {
    try {
      const [studentsRes, coursesRes, testTypesRes] = await Promise.all([
        axios.get(\`\${API_BASE_URL}/api/manager/station/students-v2?userId=\${currentUser.id}&role=\${currentUser.role}&date=\${date}\`),`;
reportsContent = reportsContent.replace(oldFetchData, newFetchData);

// Add Date picker to UI
const uiPattern = `          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PASS">Đậu</option>
            <option value="FAIL">Rớt</option>
            <option value="ABSENT">Vắng</option>
            <option value="INCOMPLETE">Chưa hoàn thành</option>
          </select>`;
const newUi = `          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PASS">Đậu</option>
            <option value="FAIL">Rớt</option>
            <option value="ABSENT">Vắng</option>
            <option value="INCOMPLETE">Chưa hoàn thành</option>
          </select>
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />`;
reportsContent = reportsContent.replace(uiPattern, newUi);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched ReportsManager.tsx');

// 2. Patch manager.ts
const managerPath = path.join(__dirname, 'api', 'routes', 'manager.ts');
let managerContent = fs.readFileSync(managerPath, 'utf-8');
managerContent = managerContent.replace(/\r\n/g, '\n');

const oldManagerPattern = `router.get('/station/students-v2', async (req, res) => {
  const { userId, role } = req.query;
  if (!userId || !role) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnTime = new Date(vnTimeString);
    const vnYear = vnTime.getFullYear();
    const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
    const vnDate = String(vnTime.getDate()).padStart(2, '0');
    const todayUtcMidnight = new Date(\`\${vnYear}-\${vnMonth}-\${vnDate}T00:00:00+07:00\`);`;

const newManagerPattern = `router.get('/station/students-v2', async (req, res) => {
  const { userId, role, date } = req.query;
  if (!userId || !role) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    let targetDateMidnight: Date;
    let nextDateMidnight: Date;

    if (date && typeof date === 'string') {
      targetDateMidnight = new Date(\`\${date}T00:00:00+07:00\`);
      nextDateMidnight = new Date(\`\${date}T00:00:00+07:00\`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    } else {
      const vnTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      const vnTime = new Date(vnTimeString);
      const vnYear = vnTime.getFullYear();
      const vnMonth = String(vnTime.getMonth() + 1).padStart(2, '0');
      const vnDate = String(vnTime.getDate()).padStart(2, '0');
      targetDateMidnight = new Date(\`\${vnYear}-\${vnMonth}-\${vnDate}T00:00:00+07:00\`);
      nextDateMidnight = new Date(\`\${vnYear}-\${vnMonth}-\${vnDate}T00:00:00+07:00\`);
      nextDateMidnight.setDate(nextDateMidnight.getDate() + 1);
    }`;

managerContent = managerContent.replace(oldManagerPattern, newManagerPattern);

const assignmentQueryOld = `          OR: [
            { assignmentDate: null },
            { assignmentDate: { gte: todayUtcMidnight } }
          ]`;
const assignmentQueryNew = `          OR: [
            { assignmentDate: null },
            { 
              assignmentDate: { 
                gte: targetDateMidnight,
                lt: nextDateMidnight
              } 
            }
          ]`;
// replace all occurrences of assignmentQueryOld
managerContent = managerContent.split(assignmentQueryOld).join(assignmentQueryNew);

const oldTestResultsInclude = `        testResults: {
          include: { 
            stationManager: true, 
            vehicle: true, 
            testType: true,
            scores: {
              include: {
                criterion: {
                  include: { exam: true }
                }
              }
            }
          }
        }`;
const newTestResultsInclude = `        testResults: {
          where: {
            createdAt: {
              gte: targetDateMidnight,
              lt: nextDateMidnight
            }
          },
          include: { 
            stationManager: true, 
            vehicle: true, 
            testType: true,
            scores: {
              include: {
                criterion: {
                  include: { exam: true }
                }
              }
            }
          }
        }`;
managerContent = managerContent.replace(oldTestResultsInclude, newTestResultsInclude);

fs.writeFileSync(managerPath, managerContent, 'utf-8');
console.log('Patched manager.ts');
