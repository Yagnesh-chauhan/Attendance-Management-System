const Attendance = require('./Attendance');
const Subject = require('./Subject');
const Enrollment = require('./Enrollment');

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private/Faculty
const markAttendance = async (req, res) => {
  try {
    const { subjectId, studentId, date, status, remarks } = req.body;

    // Verify subject belongs to faculty
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark attendance for this subject' });
    }

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      student: studentId,
      subject: subjectId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'Student not enrolled in this subject' });
    }

    // Check if attendance already marked for this date
    let attendance = await Attendance.findOne({
      subject: subjectId,
      student: studentId,
      date: new Date(date).setHours(0, 0, 0, 0)
    });

    if (attendance) {
      // Update existing attendance
      attendance.status = status;
      attendance.remarks = remarks;
      attendance.markedBy = req.user._id;
      await attendance.save();
    } else {
      // Create new attendance
      attendance = await Attendance.create({
        subject: subjectId,
        student: studentId,
        date,
        status,
        remarks,
        markedBy: req.user._id
      });
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mark attendance for multiple students
// @route   POST /api/attendance/bulk
// @access  Private/Faculty
const bulkMarkAttendance = async (req, res) => {
  try {
    const { subjectId, date, attendanceRecords } = req.body;
    // attendanceRecords: [{ studentId, status, remarks }]

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const enrollment = await Enrollment.findOne({
          student: record.studentId,
          subject: subjectId,
          status: 'active',
        });

        if (!enrollment) {
          errors.push({ studentId: record.studentId, error: 'Student not enrolled in subject' });
          continue;
        }

        let attendance = await Attendance.findOne({
          subject: subjectId,
          student: record.studentId,
          date: new Date(date).setHours(0, 0, 0, 0)
        });

        if (attendance) {
          attendance.status = record.status;
          attendance.remarks = record.remarks;
          attendance.markedBy = req.user._id;
          await attendance.save();
        } else {
          attendance = await Attendance.create({
            subject: subjectId,
            student: record.studentId,
            date,
            status: record.status,
            remarks: record.remarks,
            markedBy: req.user._id
          });
        }
        results.push(attendance);
      } catch (error) {
        errors.push({ studentId: record.studentId, error: error.message });
      }
    }

    res.status(201).json({ 
      success: true,
      marked: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get attendance for a subject
// @route   GET /api/attendance/subject/:subjectId
// @access  Private
const getSubjectAttendance = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { startDate, endDate } = req.query;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (req.user.role === 'faculty' && subject.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view attendance for this subject' });
    }

    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        subject: subjectId,
        status: 'active',
      });
      if (!enrollment) {
        return res.status(403).json({ message: 'Not enrolled in this subject' });
      }
    }

    let query = { subject: subjectId };

    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'name email studentId')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get student's attendance
// @route   GET /api/attendance/student/:studentId
// @access  Private
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subjectId } = req.query;

    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Not authorized to view this student attendance' });
    }

    let query = { student: studentId };
    if (subjectId) {
      query.subject = subjectId;

      if (req.user.role === 'faculty') {
        const subject = await Subject.findById(subjectId);
        if (!subject || subject.faculty.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Not authorized to view attendance for this subject' });
        }
      }
    }

    const attendance = await Attendance.find(query)
      .populate('subject', 'name code')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my attendance (for logged in student)
// @route   GET /api/attendance/my
// @access  Private/Student
const getMyAttendance = async (req, res) => {
  try {
    const { subjectId } = req.query;

    let query = { student: req.user._id };
    if (subjectId) {
      query.subject = subjectId;
    }

    const attendance = await Attendance.find(query)
      .populate('subject', 'name code')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats/:studentId/:subjectId
// @access  Private
const getAttendanceStats = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;

    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Not authorized to view these stats' });
    }

    if (req.user.role === 'faculty') {
      const subject = await Subject.findById(subjectId);
      if (!subject || subject.faculty.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view stats for this subject' });
      }
    }

    const attendanceRecords = await Attendance.find({
      student: studentId,
      subject: subjectId
    });

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === 'present').length;
    const absent = attendanceRecords.filter(a => a.status === 'absent').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;

    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

    res.json({
      total,
      present,
      absent,
      late,
      percentage: parseFloat(percentage)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getSubjectAttendance,
  getStudentAttendance,
  getMyAttendance,
  getAttendanceStats
};
