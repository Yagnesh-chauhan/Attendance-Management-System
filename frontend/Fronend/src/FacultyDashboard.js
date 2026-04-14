import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subjectAPI, attendanceAPI, assignmentAPI } from './api';
import './Dashboard.css';

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('subjects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    semester: '',
    credits: '',
    academicYear: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: ''
  });

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Assignment Submissions states
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fetchSubmissions = async (assignmentId) => {
    try {
      setLoadingSubmissions(true);
      setError('');
      const res = await assignmentAPI.getSubmissions(assignmentId);
      setSelectedSubmissions(res.data);
      setShowSubmissionsModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (submissionId, status, marksObtained) => {
    try {
      setError('');
      await assignmentAPI.grade(submissionId, { status, marksObtained });
      setSuccess(`Submission ${status.toLowerCase()} successfully`);
      // Update local state to reflect change
      setSelectedSubmissions(prev => 
        prev.map(sub => sub._id === submissionId ? { ...sub, status, marksObtained } : sub)
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update submission');
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchAssignments();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await subjectAPI.getAll();
      setSubjects(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await assignmentAPI.getAll();
      setAssignments(response.data);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const fetchStudentsForSubject = async (subjectId) => {
    try {
      const response = await subjectAPI.getStudents(subjectId);
      const subjectStudents = response.data;

      setStudents(subjectStudents);

      // Initialize attendance records
      setAttendanceRecords(subjectStudents.map(student => ({
        studentId: student._id,
        status: 'present',
        remarks: ''
      })));
    } catch (err) {
      console.error('Failed to fetch students:', err);
      // If no records, set empty students
      setStudents([]);
      setAttendanceRecords([]);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await subjectAPI.create(subjectForm);
      setSuccess('Subject created successfully!');
      setShowModal(false);
      resetSubjectForm();
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await assignmentAPI.create({
        ...assignmentForm,
        subjectId: selectedSubject._id
      });
      setSuccess('Assignment created successfully!');
      setShowModal(false);
      resetAssignmentForm();
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await attendanceAPI.bulkMark({
        subjectId: selectedSubject._id,
        date: attendanceDate,
        attendanceRecords
      });
      setSuccess('Attendance marked successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const updateAttendanceStatus = (studentId, status) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.studentId === studentId ? { ...record, status } : record
      )
    );
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      name: '',
      code: '',
      description: '',
      department: '',
      semester: '',
      credits: '',
      academicYear: ''
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      title: '',
      description: '',
      dueDate: '',
      maxMarks: ''
    });
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setError('');
    setSuccess('');
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
          <h2>🎓 Faculty Dashboard</h2>
        </div>
        <div className="nav-user">
          <span>Welcome, Prof. {user.name}!</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <div className="user-info">
            <h3>{user.name}</h3>
            <p className="user-role">Faculty</p>
            <p>Department: {user.department}</p>
          </div>

          <div className="sidebar-menu">
            <button
              className={activeTab === 'subjects' ? 'active' : ''}
              onClick={() => setActiveTab('subjects')}
            >
              📚 My Subjects
            </button>
            <button
              className={activeTab === 'attendance' ? 'active' : ''}
              onClick={() => setActiveTab('attendance')}
            >
              ✓ Mark Attendance
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
              <div className="tab-header">
                <h2>My Subjects</h2>
                <button className="btn-primary" onClick={() => openModal('subject')}>
                  + Create Subject
                </button>
              </div>

              {subjects.length === 0 ? (
                <p className="empty-state">No subjects created yet. Click "Create Subject" to add one.</p>
              ) : (
                <div className="subjects-grid">
                  {subjects.map(subject => (
                    <div key={subject._id} className="subject-card">
                      <h3>{subject.name}</h3>
                      <p className="subject-code">{subject.code}</p>
                      <p>{subject.description}</p>
                      <div className="subject-details">
                        <span>Semester: {subject.semester}</span>
                        <span>Credits: {subject.credits}</span>
                        <span>Year: {subject.academicYear}</span>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedSubject(subject);
                          setActiveTab('attendance');
                          fetchStudentsForSubject(subject._id);
                        }}
                      >
                        Mark Attendance
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="tab-content">
              <h2>Mark Attendance</h2>
              
              {!selectedSubject ? (
                <div className="select-subject">
                  <p>Please select a subject:</p>
                  <select
                    onChange={(e) => {
                      const subject = subjects.find(s => s._id === e.target.value);
                      setSelectedSubject(subject);
                      fetchStudentsForSubject(e.target.value);
                    }}
                    className="subject-select"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="attendance-header">
                    <h3>{selectedSubject.name} - {selectedSubject.code}</h3>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="date-input"
                    />
                  </div>

                  {students.length === 0 ? (
                    <p className="empty-state">No students enrolled in this subject yet.</p>
                  ) : (
                    <>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => {
                              const record = attendanceRecords.find(r => r.studentId === student._id);
                              return (
                                <tr key={student._id}>
                                  <td>{student.studentId}</td>
                                  <td>{student.name}</td>
                                  <td>{student.email}</td>
                                  <td>
                                    <select
                                      value={record?.status || 'present'}
                                      onChange={(e) => updateAttendanceStatus(student._id, e.target.value)}
                                      className="status-select"
                                    >
                                      <option value="present">Present</option>
                                      <option value="absent">Absent</option>
                                      <option value="late">Late</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button className="btn-primary mt-3" onClick={handleMarkAttendance}>
                        Save Attendance
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Assignments</h2>
                <button className="btn-primary" onClick={() => openModal('assignment')}>
                  + Create Assignment
                </button>
              </div>

              {assignments.length === 0 ? (
                <p className="empty-state">No assignments created yet.</p>
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
                        onClick={() => fetchSubmissions(assignment._id)} 
                        style={{ marginTop: '10px' }}
                      >
                        {loadingSubmissions ? 'Loading...' : 'View Submissions'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subject Creation Modal */}
      {showModal && modalType === 'subject' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Subject</h3>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label>Subject Name *</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject Code *</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Semester *</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Credits *</label>
                  <input
                    type="number"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Academic Year *</label>
                  <input
                    type="text"
                    placeholder="e.g., 2024-2025"
                    value={subjectForm.academicYear}
                    onChange={(e) => setSubjectForm({ ...subjectForm, academicYear: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Creation Modal */}
      {showModal && modalType === 'assignment' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Assignment</h3>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label>Select Subject *</label>
                <select
                  value={selectedSubject?._id || ''}
                  onChange={(e) => {
                    const subject = subjects.find(s => s._id === e.target.value);
                    setSelectedSubject(subject);
                  }}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(subject => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  rows="4"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Marks *</label>
                  <input
                    type="number"
                    value={assignmentForm.maxMarks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: e.target.value })}
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Submissions Modal */}
      {showSubmissionsModal && (
        <div className="modal-overlay" onClick={() => setShowSubmissionsModal(false)}>
          <div className="modal" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Student Submissions</h3>
              <button className="btn-secondary" onClick={() => setShowSubmissionsModal(false)}>Close</button>
            </div>
            
            {selectedSubmissions.length === 0 ? (
              <p>No submissions found for this assignment.</p>
            ) : (
              <div className="submissions-grid">
                {selectedSubmissions.map(sub => (
                  <div key={sub._id} style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>{sub.student?.name}</h4>
                      <span className={`status-badge ${sub.status?.toLowerCase() || 'pending'}`}>
                        {sub.status || 'Pending'}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.9em', color: '#64748b' }}>
                      Submitted: {new Date(sub.submittedAt).toLocaleString()}
                    </p>

                    {sub.content && (
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                        <strong>Text Content:</strong>
                        <p style={{ margin: '5px 0 0 0' }}>{sub.content}</p>
                      </div>
                    )}

                    {sub.attachments && sub.attachments.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <strong>Attachments:</strong>
                        <ul style={{ margin: '5px 0 10px 20px', padding: 0 }}>
                          {sub.attachments.map((file, idx) => (
                            <li key={idx}>
                              <a href={`http://localhost:5000${file.url}`} target="_blank" rel="noopener noreferrer">
                                {file.filename}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ backgroundColor: '#10b981', color: 'white' }}
                        onClick={() => handleGradeSubmission(sub._id, 'Accepted', sub.assignment?.maxMarks)}
                        disabled={sub.status === 'Accepted'}
                      >
                        Accept
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }}
                        onClick={() => handleGradeSubmission(sub._id, 'Rejected', 0)}
                        disabled={sub.status === 'Rejected'}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
