const fs = require('fs');
const path = require('path');

// 1. Patch student.ts
const studentApi = path.join(__dirname, 'api', 'routes', 'student.ts');
let studentApiContent = fs.readFileSync(studentApi, 'utf-8');
studentApiContent = studentApiContent.replace(/\r\n/g, '\n');

const oldApi = `    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {`;

const newApi = `    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const assignments = await prisma.testAssignment.findMany({
      where: { examiner: { role: 'STATION_MANAGER' } },
      include: { testType: true, course: true }
    });

    res.json({
      ...student,
      assignments
    });
  } catch (error) {`;

studentApiContent = studentApiContent.replace(oldApi, newApi);
fs.writeFileSync(studentApi, studentApiContent, 'utf-8');
console.log('Patched student.ts');

// 2. Patch StudentSearch.tsx
const searchPath = path.join(__dirname, 'src', 'pages', 'StudentSearch.tsx');
let searchContent = fs.readFileSync(searchPath, 'utf-8');
searchContent = searchContent.replace(/\r\n/g, '\n');

// Import useMemo
searchContent = searchContent.replace(
  `import { useState, useEffect, useRef } from 'react';`,
  `import { useState, useEffect, useRef, useMemo } from 'react';`
);

// Add state and hooks before return
const hooksInsertionPoint = `  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);`;

const newHooks = `  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const uniqueDates = useMemo(() => {
    if (!student?.testResults) return [];
    const dts = [...new Set(student.testResults.map((r: any) => {
      const d = new Date(r.createdAt);
      return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).toISOString().split('T')[0];
    }))];
    return (dts as string[]).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [student]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (uniqueDates.length > 0 && (!selectedDate || !uniqueDates.includes(selectedDate))) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const displayResults = useMemo(() => {
    if (!student?.testResults || !selectedDate) return [];
    return student.testResults.filter((r: any) => {
      const d = new Date(r.createdAt);
      const dateStr = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).toISOString().split('T')[0];
      return dateStr === selectedDate;
    });
  }, [student, selectedDate]);

  const overallResult = useMemo(() => {
    if (!student || !selectedDate) return null;
    
    const courseId = student.courseId;
    const courseName = student.course?.name;
    const activeAssignments = (student.assignments || []).filter((a: any) => {
      let dateMatch = true;
      if (a.assignmentDate) {
        const ad = new Date(a.assignmentDate);
        const adStr = new Date(ad.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).toISOString().split('T')[0];
        dateMatch = adStr === selectedDate;
      }
      const courseMatch = a.courseId === courseId || (courseName && a.course?.name === courseName);
      return dateMatch && courseMatch;
    });

    const activeTestTypes = new Set(activeAssignments.map((a: any) => a.testType?.id));
    
    let isFail = false;
    let isAbsent = false;
    let completedCount = 0;
    
    activeTestTypes.forEach(ttId => {
      const tr = displayResults.find((r: any) => r.testTypeId === ttId);
      if (tr) {
        if (tr.status === 'ABSENT') {
          isAbsent = true;
          completedCount++;
        } else if (['TRANSFERRED', 'FINISHED', 'FAILED'].includes(tr.status)) {
          completedCount++;
          const passScore = tr.testType?.passingScore ?? 80;
          if (tr.totalScore < passScore || tr.status === 'FAILED') isFail = true;
        }
      }
    });

    if (isAbsent) return 'VẮNG';
    if (isFail) return 'RỚT';
    if (activeTestTypes.size > 0 && completedCount >= activeTestTypes.size) return 'ĐẬU';
    return 'ĐANG THI';
  }, [student, selectedDate, displayResults]);`;

searchContent = searchContent.replace(hooksInsertionPoint, newHooks);

// Replace `{student.testResults?.map((result: any) => (` with mapping over displayResults and inject UI
const uiOld = `                <div>
                  <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    Kết quả Sát hạch
                  </h3>
                  
                  {student.testResults?.map((result: any) => (
                    <div key={result.id} style={{ 
                      background: '#fff', 
                      borderRadius: '8px', 
                      padding: '1.5rem', 
                      marginBottom: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}>`;

const uiNew = `                <div>
                  <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    Kết quả Sát hạch
                  </h3>

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
                  
                  {displayResults.map((result: any) => (
                    <div key={result.id} style={{ 
                      background: '#fff', 
                      borderRadius: '8px', 
                      padding: '1.5rem', 
                      marginBottom: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}>`;

searchContent = searchContent.replace(uiOld, uiNew);

fs.writeFileSync(searchPath, searchContent, 'utf-8');
console.log('Patched StudentSearch.tsx');
