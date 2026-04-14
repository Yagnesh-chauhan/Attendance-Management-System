const Subject = require('./Subject');
const Enrollment = require('./Enrollment');
const User = require('./User');

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private/Faculty
const createSubject = async (req, res) => {
  try {
    const { name, code, description, department, semester, credits, academicYear } = req.body;

    const subject = await Subject.create({
      name,
      code,
      description,
      department,
      semester,
      credits,
      faculty: req.user._id,
      academicYear
    });

    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res) => {
  try {
    if (req.user.role === 'faculty') {
      const facultySubjects = await Subject.find({ faculty: req.user._id }).populate('faculty', 'name email');
      return res.json(facultySubjects);
    }

    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({
        student: req.user._id,
        status: 'active',
      }).populate({
        path: 'subject',
        populate: {
          path: 'faculty',
          select: 'name email',
        },
      });

      const studentSubjects = enrollments
        .map((enrollment) => enrollment.subject)
        .filter(Boolean);

      return res.json(studentSubjects);
    }

    const subjects = await Subject.find({}).populate('faculty', 'name email');
    res.json(subjects);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get available subjects for student to enroll
// @route   GET /api/subjects/available
// @access  Private/Student
const getAvailableSubjects = async (req, res) => {
  try {
    const enrolled = await Enrollment.find({
      student: req.user._id,
      status: 'active',
    }).select('subject');

    const enrolledSubjectIds = enrolled.map((entry) => entry.subject);

    const query = {
      isActive: true,
      _id: { $nin: enrolledSubjectIds },
    };

    if (req.user.department) {
      query.department = req.user.department;
    }

    if (req.user.semester) {
      query.semester = req.user.semester;
    }

    const subjects = await Subject.find(query).populate('faculty', 'name email');
    res.json(subjects);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
const getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('faculty', 'name email');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Faculty
const updateSubject = async (req, res) => {
  try {
    let subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if user is the faculty for this subject
    if (subject.faculty.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this subject' });
    }

    subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private/Faculty
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if user is the faculty for this subject
    if (subject.faculty.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this subject' });
    }

    await subject.deleteOne();
    res.json({ message: 'Subject removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Enroll student in subject
// @route   POST /api/subjects/:id/enroll
// @access  Private/Student
const enrollInSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      subject: req.params.id
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this subject' });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      subject: req.params.id
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get enrolled subjects for student
// @route   GET /api/subjects/enrolled
// @access  Private/Student
const getEnrolledSubjects = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      student: req.user._id,
      status: 'active'
    }).populate({
      path: 'subject',
      populate: {
        path: 'faculty',
        select: 'name email'
      }
    });

    const subjects = enrollments.map(enrollment => enrollment.subject);
    res.json(subjects);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get students enrolled in a subject
// @route   GET /api/subjects/:id/students
// @access  Private/Faculty
const getSubjectStudents = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (req.user.role !== 'admin' && subject.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view enrolled students for this subject' });
    }

    const enrollments = await Enrollment.find({
      subject: req.params.id,
      status: 'active',
    }).populate('student', 'name email studentId department semester');

    const students = enrollments
      .map((enrollment) => enrollment.student)
      .filter(Boolean);

    res.json(students);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getAvailableSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  enrollInSubject,
  getEnrolledSubjects,
  getSubjectStudents,
};
