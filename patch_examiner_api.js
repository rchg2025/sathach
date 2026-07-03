const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'api', 'routes', 'examiner.ts');
let apiContent = fs.readFileSync(apiPath, 'utf-8');
apiContent = apiContent.replace(/\r\n/g, '\n');

const apiSearch = `      } else {
        // Find the first active exam the student has NOT completed
        const nextExam = activeExams.find(exam => 
          exam.testTypeId === result.testTypeId && !completedExamIds.includes(exam.id)
        );

        // If there is a next exam, check if the current examiner is assigned to it
        if (nextExam && nextExam.assignments.some(a => a.examinerId === examinerId)) {
          const myAssignment = assignments.find(a => 
            a.examinerId === examinerId && 
            (a.examId === nextExam.id || (a.testTypeId === nextExam.testTypeId && !a.examId))
          );

          if (myAssignment) {
            if (myAssignment.vehicles && myAssignment.vehicles.length > 0) {
              const hasVehicle = myAssignment.vehicles.some((v: any) => v.id === result.vehicleId);
              if (!hasVehicle) continue; // Skip if student's vehicle is not assigned to this examiner
            }

            const currentProgress = result.progress.find((p: any) => p.examId === nextExam.id);
            const studentData = { 
              ...result.student, 
              currentExam: nextExam, 
              testResultId: result.id,
              vehicle: result.vehicle,
              currentProgress,
              assignmentDate: myAssignment.assignmentDate
            };
            studentsForExaminer.push(studentData);
          }
        }
      }`;

const apiReplace = `      } else {
        // Find ALL active exams the student has NOT completed that are assigned to THIS examiner
        const myUncompletedExams = activeExams.filter(exam => 
          exam.testTypeId === result.testTypeId && 
          !completedExamIds.includes(exam.id) &&
          exam.assignments.some(a => a.examinerId === examinerId)
        );

        if (myUncompletedExams.length > 0) {
          const firstExam = myUncompletedExams[0];
          const myAssignment = assignments.find(a => 
            a.examinerId === examinerId && 
            (a.examId === firstExam.id || (a.testTypeId === firstExam.testTypeId && !a.examId))
          );

          if (myAssignment) {
            if (myAssignment.vehicles && myAssignment.vehicles.length > 0) {
              const hasVehicle = myAssignment.vehicles.some((v: any) => v.id === result.vehicleId);
              if (!hasVehicle) continue;
            }

            const inProgressExam = myUncompletedExams.find(e => result.progress.some((p: any) => p.examId === e.id && p.status === 'IN_PROGRESS'));
            const activeExamToUse = inProgressExam || firstExam;

            const currentProgress = result.progress.find((p: any) => p.examId === activeExamToUse.id);
            const studentData = { 
              ...result.student, 
              currentExam: activeExamToUse, 
              allAvailableExams: myUncompletedExams,
              testResultId: result.id,
              vehicle: result.vehicle,
              currentProgress: currentProgress || { status: 'PENDING' },
              assignmentDate: myAssignment.assignmentDate
            };
            studentsForExaminer.push(studentData);
          }
        }
      }`;

apiContent = apiContent.replace(apiSearch, apiReplace);
fs.writeFileSync(apiPath, apiContent, 'utf-8');
console.log('Patched API examiner.ts');
