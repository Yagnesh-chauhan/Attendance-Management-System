import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
};

// Subject API
export const subjectAPI = {
  getAll: () => api.get('/subjects'),
  getAvailable: () => api.get('/subjects/available'),
  getStudents: (id) => api.get(`/subjects/${id}/students`),
  getOne: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
  enroll: (id) => api.post(`/subjects/${id}/enroll`),
  getEnrolled: () => api.get('/subjects/enrolled')
};

// Attendance API
export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  bulkMark: (data) => api.post('/attendance/bulk', data),
  getMy: (subjectId) => api.get(`/attendance/my${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getBySubject: (subjectId, startDate, endDate) => {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/attendance/subject/${subjectId}${suffix}`);
  },
  getByStudent: (studentId, subjectId) => 
    api.get(`/attendance/student/${studentId}${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getStats: (studentId, subjectId) => api.get(`/attendance/stats/${studentId}/${subjectId}`)
};

// Assignment API
export const assignmentAPI = {
  getAll: (subjectId) => api.get(`/assignments${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getOne: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getMySubmissions: () => api.get('/assignments/my-submissions'),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  grade: (id, data) => api.put(`/assignments/submissions/${id}/grade`, data)
};

export default api;
