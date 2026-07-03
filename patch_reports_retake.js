const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, 'src', 'pages', 'ReportsManager.tsx');
let content = fs.readFileSync(reportsPath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

// Update getStudentReport logic
const oldLogic = `  const getStudentReport = (student: any, activeTestTypes: any[]) => {
    const trs = student.testResults || [];
    let isFail = false;
    let isAbsent = false;
    let completedCount = 0;
    
    const scores: any = {};
    
    activeTestTypes.forEach((tt: any) => {
      const tr = trs.find((t: any) => t.testTypeId === tt.id);
      if (!tr) {
         scores[tt.id] = '-';
      } else {
        let scoreVal: number | string = '-';
        if (tr.status === 'ABSENT') {
          scoreVal = 'Vắng';
          isAbsent = true;
          completedCount++;
        } else if (tr.status === 'IN_PROGRESS') {
          scoreVal = 'Đang thi';
        } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
          scoreVal = tr.totalScore;
          completedCount++;
          const passingScore = tt.passingScore ?? 80;
          if (tr.totalScore < passingScore) isFail = true;
          if (tr.status === 'FAILED') isFail = true;
        }
        scores[tt.id] = scoreVal;
      }
    });

    let finalStatus = '';
    if (isAbsent) finalStatus = 'VẮNG';
    else if (isFail) finalStatus = 'RỚT';
    else if (activeTestTypes.length > 0 && completedCount >= activeTestTypes.length) finalStatus = 'ĐẬU';
    else finalStatus = 'CHƯA HOÀN THÀNH';

    return {
      ...student,
      scores,
      finalStatus
    };
  };`;

const newLogic = `  const getStudentReport = (student: any, activeTestTypes: any[]) => {
    const allTrs = student.testResults || [];
    // Split into today and past
    const todayTrs: any[] = [];
    const pastTrs: any[] = [];
    
    allTrs.forEach((t: any) => {
      const tDate = new Date(t.createdAt).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }).split(',')[0];
      const fDate = new Date(filterDate).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }).split(',')[0];
      // simplified comparison, filterDate is YYYY-MM-DD
      const tDateObj = new Date(t.createdAt);
      const tDateStr = new Date(tDateObj.getTime() + 7*3600*1000).toISOString().split('T')[0];
      if (tDateStr === filterDate) {
        todayTrs.push(t);
      } else {
        pastTrs.push(t);
      }
    });

    let isFail = false;
    let isAbsent = false;
    let completedCount = 0;
    const scores: any = {};
    const originalScores: any = {};
    
    activeTestTypes.forEach((tt: any) => {
      // 1. Try to find today's result
      let tr = todayTrs.find((t: any) => t.testTypeId === tt.id);
      
      // 2. If no today's result, find a PAST PASSED result (Bảo lưu)
      let isPreserved = false;
      if (!tr) {
        const pastPassed = pastTrs.filter(t => 
          t.testTypeId === tt.id && 
          ['TRANSFERRED', 'FINISHED'].includes(t.status) && 
          t.totalScore >= (tt.passingScore ?? 80) &&
          t.status !== 'FAILED'
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (pastPassed.length > 0) {
          tr = pastPassed[0];
          isPreserved = true;
        }
      }

      if (!tr) {
         scores[tt.id] = '-';
      } else {
        let scoreVal: number | string = '-';
        if (tr.status === 'ABSENT') {
          scoreVal = 'Vắng';
          isAbsent = true;
          completedCount++;
        } else if (tr.status === 'IN_PROGRESS') {
          scoreVal = 'Đang thi';
        } else if (['TRANSFERRED', 'FINISHED'].includes(tr.status)) {
          scoreVal = tr.totalScore;
          completedCount++;
          const passingScore = tt.passingScore ?? 80;
          if (tr.totalScore < passingScore) isFail = true;
          if (tr.status === 'FAILED') isFail = true;
        }
        
        if (isPreserved && typeof scoreVal === 'number') {
           scores[tt.id] = scoreVal + ' (BL)';
           originalScores[tt.id] = scoreVal;
        } else {
           scores[tt.id] = scoreVal;
           originalScores[tt.id] = scoreVal;
        }
      }
    });

    let finalStatus = '';
    if (isAbsent) finalStatus = 'VẮNG';
    else if (isFail) finalStatus = 'RỚT';
    else if (activeTestTypes.length > 0 && completedCount >= activeTestTypes.length) finalStatus = 'ĐẬU';
    else finalStatus = 'CHƯA HOÀN THÀNH';

    return {
      ...student,
      scores,
      originalScores,
      finalStatus
    };
  };`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(reportsPath, content, 'utf-8');
console.log('Patched ReportsManager.tsx for Bao luu diem');
