const express = require('express');
const router = express.Router();
const {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  enrollInSubject,
  getEnrolledSubjects,
  getSubjectStudents,
  getAvailableSubjects,
} = require('./subjectController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./rolemiddleware');

router.route('/')
  .get(protect, getSubjects)
  .post(protect, authorize('faculty', 'admin'), createSubject);

router.get('/available', protect, authorize('student'), getAvailableSubjects);
router.get('/enrolled', protect, authorize('student'), getEnrolledSubjects);
router.get('/:id/students', protect, authorize('faculty', 'admin'), getSubjectStudents);

router.route('/:id')
  .get(protect, getSubject)
  .put(protect, authorize('faculty', 'admin'), updateSubject)
  .delete(protect, authorize('faculty', 'admin'), deleteSubject);

router.post('/:id/enroll', protect, authorize('student'), enrollInSubject);

module.exports = router;
