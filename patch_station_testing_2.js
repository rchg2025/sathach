const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'pages', 'StationTesting.tsx');
let uiContent = fs.readFileSync(uiPath, 'utf-8');
uiContent = uiContent.replace(/\r\n/g, '\n');

// 1. Add displayedTestTypes computation
uiContent = uiContent.replace(
  `  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;`,
  `  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const displayedTestTypes = React.useMemo(() => {
    // Only show test types that have been assigned
    const assignedIds = new Set(assignments.map((a: any) => a.testTypeId));
    return testTypes.filter(tt => assignedIds.has(tt.id));
  }, [testTypes, assignments]);`
);

// We need to import React if useMemo is used, but React might already be imported or we can just compute it directly.
// Wait, 'import React' might not be there or just 'import { useEffect, useState } from "react"'. Let's check imports.
// It's safer to just compute it without useMemo, or use useMemo from react.
uiContent = uiContent.replace(
  `const displayedTestTypes = React.useMemo`,
  `const displayedTestTypes = reactMemo` // wait, let's just do standard calculation without useMemo for simplicity
);

uiContent = uiContent.replace(
  `  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const displayedTestTypes = reactMemo(() => {
    // Only show test types that have been assigned
    const assignedIds = new Set(assignments.map((a: any) => a.testTypeId));
    return testTypes.filter(tt => assignedIds.has(tt.id));
  }, [testTypes, assignments]);`,
  `  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const displayedTestTypes = testTypes.filter(tt => assignments.some((a: any) => a.testTypeId === tt.id));`
);

// 2. Replace testTypes.map with displayedTestTypes.map
uiContent = uiContent.replace(
  `                  {testTypes.map((tt: any) => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}`,
  `                  {displayedTestTypes.map((tt: any) => (
                    <th key={tt.id} style={{ textAlign: 'center' }}>{tt.name}</th>
                  ))}`
);

uiContent = uiContent.replace(
  `                    {testTypes.map((tt: any) => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>`,
  `                    {displayedTestTypes.map((tt: any) => (
                      <td key={tt.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>`
);

fs.writeFileSync(uiPath, uiContent, 'utf-8');
console.log('Patched StationTesting.tsx dynamic headers');
