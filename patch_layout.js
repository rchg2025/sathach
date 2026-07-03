const fs = require('fs');
const path = require('path');

const retakePath = path.join(__dirname, 'src', 'pages', 'RetakeManager.tsx');
let retakeContent = fs.readFileSync(retakePath, 'utf-8');
retakeContent = retakeContent.replace(/\r\n/g, '\n');

// 1. Add AdminLayout import
retakeContent = retakeContent.replace(
  `import { API_BASE_URL } from '../config';`,
  `import { API_BASE_URL } from '../config';\nimport AdminLayout from '../components/AdminLayout';`
);

// 2. Add user state inside RetakeManager
const oldUserDec = `const RetakeManager = () => {
  const [students, setStudents] = useState<any[]>([]);`;
const newUserDec = `const RetakeManager = () => {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);`;

retakeContent = retakeContent.replace(oldUserDec, newUserDec);

// 3. Load user in useEffect
const oldUseEffect = `  useEffect(() => {
    fetchData();
  }, []);`;
const newUseEffect = `  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      setUser(JSON.parse(u));
    }
    fetchData();
  }, []);`;

retakeContent = retakeContent.replace(oldUseEffect, newUseEffect);

// 4. Wrap with AdminLayout
retakeContent = retakeContent.replace(
  `  return (
    <div>
      <div className="flex justify-between items-center mb-6">`,
  `  return (
    <AdminLayout user={user}>
      <div className="container mt-4">
      <div className="flex justify-between items-center mb-6">`
);

// Close AdminLayout and container
retakeContent = retakeContent.replace(
  `      )}
    </div>
  );
};`,
  `      )}
      </div>
    </AdminLayout>
  );
};`
);

fs.writeFileSync(retakePath, retakeContent, 'utf-8');
console.log('Wrapped RetakeManager with AdminLayout');
