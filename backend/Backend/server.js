const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const errorHandler = require('./errorHandler');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./authRoutes'));
app.use('/api/subjects', require('./subjectRoutes'));
app.use('/api/attendance', require('./attendanceRoutes'));
app.use('/api/assignments', require('./assignmentRoutes'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'College Attendance Management System API' });
});

// Error handler (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
