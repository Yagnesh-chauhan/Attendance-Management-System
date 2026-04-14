const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Subject = require('./Subject');
const Enrollment = require('./Enrollment');

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private/Faculty
const createAssignment = async (req, res) => {
  try {
    const { title, description, subjectId, dueDate, maxMarks, attachments } = req.body;

    // Verify subject belongs to faculty
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create assignment for this subject' });
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject: subjectId,
      createdBy: req.user._id,
      dueDate,
      maxMarks,
      attachments
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
const getAssignments = async (req, res) => {
  try {
    const { subjectId } = req.query;

    let query = {};

    if (subjectId) {
      query.subject = subjectId;
    }

    // If user is faculty, show assignments they created
    if (req.user.role === 'faculty') {
      query.createdBy = req.user._id;
    }

    // If user is student, show assignments for enrolled subjects
    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ 
        student: req.user._id,
        status: 'active'
      }).select('subject');
      
      const subjectIds = enrollments.map(e => e.subject);
      query.subject = { $in: subjectIds };
    }

    const assignments = await Assignment.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Faculty
const updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user created this assignment
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Faculty
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user created this assignment
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private/Student
const submitAssignment = async (req, res) => {
  try {
    const { content } = req.body;
    let attachments = [];

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        url: `/uploads/${file.filename}`
      }));
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the subject
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      subject: assignment.subject,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this subject' });
    }

    // Student cannot edit or re-submit after first submission.
    const existingSubmission = await Submission.findOne({
      assignment: req.params.id,
      student: req.user._id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    const submission = await Submission.create({
      assignment: req.params.id,
      student: req.user._id,
      content,
      attachments
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get submissions for an assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private/Faculty
const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify faculty owns this assignment
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const submissions = await Submission.find({ assignment: req.params.id })
      .populate('student', 'name email studentId')
      .populate('assignment', 'title maxMarks')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Grade/Update Status of submission
// @route   PUT /api/assignments/submissions/:id/grade
// @access  Private/Faculty
const gradeSubmission = async (req, res) => {
  try {
    const { marksObtained, feedback, status } = req.body;

    let submission = await Submission.findById(req.params.id).populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify faculty owns the assignment
    const assignment = await Assignment.findById(submission.assignment._id);
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    if (marksObtained !== undefined) submission.marksObtained = marksObtained;
    if (feedback !== undefined) submission.feedback = feedback;
    if (status !== undefined) submission.status = status;
    
    submission.gradedBy = req.user._id;
    submission.gradedAt = Date.now();

    await submission.save();

    res.json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get student's own submissions
// @route   GET /api/assignments/my-submissions
// @access  Private/Student
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('assignment', 'title description maxMarks dueDate subject')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getMySubmissions
};
