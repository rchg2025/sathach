const fs = require('fs');
const path = require('path');

// 1. ReportsManager.tsx
const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let reportsContent = fs.readFileSync(reportsPath, 'utf-8');
reportsContent = reportsContent.replace(/\r\n/g, '\n');

// Fix useEffect dependencies and fetchData call
reportsContent = reportsContent.replace(
  `      fetchData(parsedUser, new Date().toISOString().split('T')[0]);
    } else {
      window.location.href = '/login';
    }
  }, []);`,
  `      fetchData(parsedUser, filterDate);
    } else {
      window.location.href = '/login';
    }
  }, [filterDate]);`
);

// Fix fetchData call in handleSaveScore
reportsContent = reportsContent.replace(
  `      setEditingStudent(null);
      fetchData(user);
    } catch (e: any) {`,
  `      setEditingStudent(null);
      fetchData(user, filterDate);
    } catch (e: any) {`
);

// Fix UI
reportsContent = reportsContent.replace(
  `              <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>`,
  `              <input type="date" className="form-control mb-2" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
              <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>`
);

// Fix totalScore < 80 logic
reportsContent = reportsContent.replace(
  `          if (tr.totalScore < 80) isFail = true;`,
  `          const passingScore = tt.passingScore ?? 80;
          if (tr.totalScore < passingScore) isFail = true;`
);

fs.writeFileSync(reportsPath, reportsContent, 'utf-8');
console.log('Patched ReportsManager.tsx');

// 2. StudentSearch.tsx
const studentSearchPath = path.join(__dirname, 'src', 'pages', 'StudentSearch.tsx');
let studentSearchContent = fs.readFileSync(studentSearchPath, 'utf-8');
studentSearchContent = studentSearchContent.replace(/\r\n/g, '\n');

studentSearchContent = studentSearchContent.replace(
  `        if (latestResult.status !== 'PENDING' || latestResult.totalScore < 80) {`,
  `        const passScore = latestResult.testType?.passingScore ?? 80;
        if (latestResult.status !== 'PENDING' || latestResult.totalScore < passScore) {`
);

studentSearchContent = studentSearchContent.replace(
  `color: result.totalScore >= 80 ?`,
  `color: result.totalScore >= (result.testType?.passingScore ?? 80) ?`
);

studentSearchContent = studentSearchContent.replace(
  `{result.totalScore < 80 || result.status === 'FAILED' ? <span className="text-danger">RỚT</span> :`,
  `{result.totalScore < (result.testType?.passingScore ?? 80) || result.status === 'FAILED' ? <span className="text-danger">RỚT</span> :`
);

fs.writeFileSync(studentSearchPath, studentSearchContent, 'utf-8');
console.log('Patched StudentSearch.tsx');
