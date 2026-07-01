const express = require('express');
const app = express();
app.use(express.json());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.put('/api/manager/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { examinerId, testTypeId, examId, courseId, assignmentDate, vehicleIds } = req.body;
  try {
    const data = {
      examinerId: Number(examinerId),
      testTypeId: Number(testTypeId),
      examId: examId ? Number(examId) : null,
      courseId: courseId ? Number(courseId) : null,
      assignmentDate: assignmentDate ? new Date(assignmentDate) : null,
    };

    if (vehicleIds && Array.isArray(vehicleIds)) {
      data.vehicles = { set: vehicleIds.map((vId) => ({ id: Number(vId) })) };
    } else {
      data.vehicles = { set: [] };
    }

    const assignment = await prisma.testAssignment.update({
      where: { id: Number(id) },
      data,
      include: { vehicles: true }
    });
    res.json(assignment);
  } catch (error) { 
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

const server = app.listen(3005, async () => {
  const axios = require('axios');
  try {
    const assignment = await prisma.testAssignment.findFirst();
    if (assignment) {
      const res = await axios.put('http://localhost:3005/api/manager/assignments/' + assignment.id, {
        examinerId: assignment.examinerId,
        testTypeId: assignment.testTypeId,
        vehicleIds: ["1"]
      });
      console.log('Vehicles from API:', res.data.vehicles.map(v=>v.id));
    }
  } catch (err) {
    console.error('Axios error:', err.response ? err.response.data : err.message);
  } finally {
    server.close();
    await prisma.disconnect();
  }
});
