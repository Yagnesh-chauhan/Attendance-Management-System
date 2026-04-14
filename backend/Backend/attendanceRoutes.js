const express = require('express');
const router = express.Router();
const {
  markAttendance,
  bulkMarkAttendance,
  getSubjectAttendance,
  getStudentAttendance,
  getMyAttendance,
  getAttendanceStats
} = require('./attendanceController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./rolemiddleware');

router.post('/', protect, authorize('faculty'), markAttendance);
router.post('/bulk', protect, authorize('faculty'), bulkMarkAttendance);
router.get('/my', protect, authorize('student'), getMyAttendance);
router.get('/subject/:subjectId', protect, getSubjectAttendance);
router.get('/student/:studentId', protect, getStudentAttendance);
router.get('/stats/:studentId/:subjectId', protect, getAttendanceStats);

module.exports = router;
