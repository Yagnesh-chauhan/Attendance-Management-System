import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subjectAPI, attendanceAPI, assignmentAPI } from './api';
import './Dashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submissionInputs, setSubmissionInputs] = useState({});
  const [submittingId, setSubmittingId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enrolledRes, availableRes, attendanceRes, assignmentsRes] = await Promise.all([
        subjectAPI.getEnrolled(),
        subjectAPI.getAvailable(),
        attendanceAPI.getMy(),
        assignmentAPI.getAll()
      ]);

      setEnrolledSubjects(enrolledRes.data);
      setAvailableSubjects(availableRes.data);
      setMyAttendance(attendanceRes.data);
      setAssignments(assignmentsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (subjectId) => {
    try {
      setError('');
      setSuccess('');
      await subjectAPI.enroll(subjectId);
      setSuccess('Successfully enrolled in subject!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll');
    }
  };

  const viewAttendanceStats = async (subject) => {
    try {
      setSelectedSubject(subject);
      const response = await attendanceAPI.getStats(user._id, subject._id);
      setAttendanceStats(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
    }
  };

  const submitAssignment = async (assignmentId) => {
    try {
      setError('');
      setSuccess('');
      const content = submissionInputs[assignmentId]?.trim();

      if (!content) {
        setError('Please write your submission before sending.');
        return;
      }

      setSubmittingId(assignmentId);
      await assignmentAPI.submit(assignmentId, { content });
      setSuccess('Assignment submitted successfully!');
      setSubmissionInputs((prev) => ({ ...prev, [assignmentId]: '' }));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmittingId('');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>📚 College Attendance</h2>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.name}!</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <div className="user-info">
            <h3>{user.name}</h3>
            <p className="user-role">Student</p>
            <p>ID: {user.studentId}</p>
            <p>Department: {user.department}</p>
            <p>Semester: {user.semester}</p>
          </div>

          <div className="sidebar-menu">
            <button
              className={activeTab === 'subjects' ? 'active' : ''}
              onClick={() => setActiveTab('subjects')}
            >
              📖 My Subjects
            </button>
            <button
              className={activeTab === 'enroll' ? 'active' : ''}
              onClick={() => setActiveTab('enroll')}
            >
              ➕ Enroll
            </button>
            <button
              className={activeTab === 'attendance' ? 'active' : ''}
              onClick={() => setActiveTab('attendance')}
            >
              ✓ Attendance
            </button>
            <button
              className={activeTab === 'assignments' ? 'active' : ''}
              onClick={() => setActiveTab('assignments')}
            >
              📝 Assignments
            </button>
          </div>
        </div>

        <div className="dashboard-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {activeTab === 'subjects' && (
            <div className="tab-content">
              <h2>My Enrolled Subjects</h2>
              {enrolledSubjects.length === 0 ? (
                <p className="empty-state">No subjects enrolled yet. Go to Enroll tab to add subjects.</p>
              ) : (
                <div className="subjects-grid">
                  {enrolledSubjects.map(subject => (
                    <div key={subject._id} className="subject-card">
                      <h3>{subject.name}</h3>
                      <p className="subject-code">{subject.code}</p>
                      <p>{subject.description}</p>
                      <div className="subject-details">
                        <span>Credits: {subject.credits}</span>
                        <span>Faculty: {subject.faculty?.name}</span>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => viewAttendanceStats(subject)}
                      >
                        View Attendance
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedSubject && attendanceStats && (
                <div className="modal-overlay" onClick={() => setSelectedSubject(null)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Attendance Stats - {selectedSubject.name}</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <h4>Total Classes</h4>
                        <p className="stat-value">{attendanceStats.total}</p>
                      </div>
                      <div className="stat-card">
                        <h4>Present</h4>
                        <p className="stat-value present">{attendanceStats.present}</p>
                      </div>
                      <div className="stat-card">
                        <h4>Absent</h4>
                        <p className="stat-value absent">{attendanceStats.absent}</p>
                      </div>
                      <div className="stat-card">
                        <h4>Percentage</h4>
                        <p className="stat-value">{attendanceStats.percentage}%</p>
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => setSelectedSubject(null)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enroll' && (
            <div className="tab-content">
              <h2>Available Subjects</h2>
              {availableSubjects.length === 0 ? (
                <p className="empty-state">No subjects available for enrollment.</p>
              ) : (
                <div className="subjects-grid">
                  {availableSubjects.map(subject => (
                    <div key={subject._id} className="subject-card">
                      <h3>{subject.name}</h3>
                      <p className="subject-code">{subject.code}</p>
                      <p>{subject.description}</p>
                      <div className="subject-details">
                        <span>Semester: {subject.semester}</span>
                        <span>Credits: {subject.credits}</span>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleEnroll(subject._id)}
                      >
                        Enroll Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="tab-content">
              <h2>My Attendance Records</h2>
              {myAttendance.length === 0 ? (
                <p className="empty-state">No attendance records yet.</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myAttendance.map(record => (
                        <tr key={record._id}>
                          <td>{record.subject?.name}</td>
                          <td>{new Date(record.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${record.status}`}>
                              {record.status}
                            </span>
                          </td>
                          <td>{record.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="tab-content">
              <h2>Assignments</h2>
              {assignments.length === 0 ? (
                <p className="empty-state">No assignments available.</p>
              ) : (
                <div className="assignments-list">
                  {assignments.map(assignment => (
                    <div key={assignment._id} className="assignment-card">
                      <h3>{assignment.title}</h3>
                      <p>{assignment.description}</p>
                      <div className="assignment-meta">
                        <span>Subject: {assignment.subject?.name}</span>
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        <span>Max Marks: {assignment.maxMarks}</span>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => submitAssignment(assignment._id)}
                        disabled={submittingId === assignment._id}
                      >
                        {submittingId === assignment._id ? 'Submitting...' : 'Submit'}
                      </button>

                      <textarea
                        className="submission-input"
                        rows="3"
                        placeholder="Write your submission text here"
                        value={submissionInputs[assignment._id] || ''}
                        onChange={(e) =>
                          setSubmissionInputs((prev) => ({
                            ...prev,
                            [assignment._id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
