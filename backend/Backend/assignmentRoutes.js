const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getMySubmissions
} = require('./assignmentController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./rolemiddleware');
const upload = require('./multerConfig');

// Add specific non-ID routes before ID parameter routes
router.get('/my-submissions', protect, authorize('student'), getMySubmissions);

router.route('/')
  .get(protect, getAssignments)
  .post(protect, authorize('faculty'), createAssignment);

router.route('/:id')
  .get(protect, getAssignment)
  .put(protect, authorize('faculty'), updateAssignment)
  .delete(protect, authorize('faculty'), deleteAssignment);

router.post('/:id/submit', protect, authorize('student'), upload.array('files', 5), submitAssignment);
router.get('/:id/submissions', protect, authorize('faculty'), getAssignmentSubmissions);
router.put('/submissions/:id/grade', protect, authorize('faculty'), gradeSubmission);

module.exports = router;
