# 🏢 Remote Employee Attendance System

A modern, full-stack attendance management system built with React, Node.js, and MongoDB. Track employee attendance, manage leaves, and monitor productivity from anywhere with real-time updates and geolocation tracking.

## ✨ Features

- **🔐 Secure Authentication** - JWT-based authentication with role-based access control
- **📱 Responsive Design** - Material-UI powered interface that works on desktop, tablet, and mobile devices
- **📍 Geolocation Tracking** - Verify employee location during punch in/out with configurable distance limits
- **📊 Real-time Dashboard** - Live attendance statistics and analytics with Chart.js visualizations
- **📅 Leave Management** - Request, approve, and track employee leaves with status tracking
- **👥 Employee Management** - Admin panel for managing team members and roles
- **📈 Reports & Analytics** - Comprehensive reporting and insights with export capabilities
- **🔔 Real-time Notifications** - WebSocket-based live updates using Socket.IO
- **🎨 Modern UI/UX** - Clean, intuitive interface built with Material-UI components

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5 or higher)
- **npm** or **yarn**
- **Homebrew** (for macOS users)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd attendance-system
   ```

2. **Install dependencies**
   ```bash
   ./install.sh
   ```
   
   Or manually:
   ```bash
   npm run install:all
   ```

3. **Start the application**
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   npm run dev
   ```

4. **Create a test user**
   ```bash
   cd server
   node create-test-user.js
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5001
   - **Health Check**: http://localhost:5001/api/health

### Default Login Credentials

- **Email**: admin@company.com
- **Password**: admin123

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Chart.js** for data visualization
- **Socket.IO Client** for real-time updates
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.IO** for real-time communication
- **Multer** for file uploads
- **Nodemailer** for email notifications
- **bcryptjs** for password hashing

### Development Tools
- **TypeScript** for type safety
- **Nodemon** for server auto-reload
- **Concurrently** for running multiple processes
- **ESLint** for code linting

## 📁 Project Structure

```
attendance-system/
├── client/                     # React frontend
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── auth/         # Authentication components
│   │   │   ├── common/       # Shared components
│   │   │   ├── dashboard/    # Dashboard components
│   │   │   ├── layout/       # Layout components
│   │   │   └── pages/        # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── store/            # Redux store and slices
│   │   └── types/            # TypeScript type definitions
│   └── package.json
├── server/                    # Node.js backend
│   ├── models/               # MongoDB models
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions
│   ├── uploads/              # File uploads directory
│   └── package.json
├── install.sh                # Installation script
├── start.sh                  # Startup script
└── package.json              # Root package.json
```

## 📜 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both client and server for production
- `npm run install:all` - Install dependencies for all packages
- `npm run server:dev` - Start only the backend server
- `npm run client:dev` - Start only the frontend client

### Client Scripts
- `npm start` - Start React development server
- `npm run build` - Build React app for production
- `npm test` - Run React tests

### Server Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run server tests

## ⚙️ Environment Configuration

Create `.env` files in both `client/` and `server/` directories:

### Server Environment (`server/.env`)
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/attendance_system

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Geolocation Settings
MAX_DISTANCE_KM=50
DEFAULT_LOCATION_LAT=40.7128
DEFAULT_LOCATION_LNG=-74.0060
LOCATION_VALIDATION_ENABLED=true

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5242880
```

### Client Environment (`client/.env`)
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SOCKET_URL=http://localhost:5001
```

## 📱 Usage Guide

### For Employees

1. **Login** with your credentials
2. **Punch In/Out** using the dashboard with location verification
3. **Request Leave** through the leave management section
4. **View History** of your attendance and leave records
5. **Update Profile** with personal information

### For Managers/Admins

1. **Manage Employees** - Add, edit, or deactivate team members
2. **Approve Leaves** - Review and approve/reject leave requests
3. **View Reports** - Access comprehensive analytics and reports
4. **Monitor Attendance** - Track team attendance in real-time
5. **Configure Settings** - Update office location and system preferences

## 🔧 Advanced Configuration

### Geolocation Settings

Configure office location and distance limits:

```env
# Office coordinates (update with your actual office location)
DEFAULT_LOCATION_LAT=YOUR_OFFICE_LATITUDE
DEFAULT_LOCATION_LNG=YOUR_OFFICE_LONGITUDE

# Maximum allowed distance from office (in kilometers)
MAX_DISTANCE_KM=50

# Enable/disable location validation
LOCATION_VALIDATION_ENABLED=true
```

### Email Notifications

Set up email notifications for leave approvals and system alerts:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes using ports 3000 and 5001
   lsof -ti:3000 | xargs kill -9
   lsof -ti:5001 | xargs kill -9
   ```

2. **MongoDB not running**
   ```bash
   # Start MongoDB service
   brew services start mongodb-community
   
   # Check MongoDB status
   brew services list | grep mongodb
   ```

3. **Location validation error: "Location is too far from office"**
   
   This error occurs when the system detects that your location is too far from the configured office location.
   
   **Quick Fix (Disable Location Validation):**
   ```bash
   cd server
   node disable-location-validation.js
   ```
   Then restart your server.
   
   **Permanent Fix (Configure Office Location):**
   1. Log in as an admin user
   2. Go to Admin Panel → Settings
   3. Update the office coordinates to your actual office location
   4. Adjust the maximum distance as needed
   
   **Manual Configuration:**
   Edit `server/.env` file:
   ```env
   # Set to your actual office coordinates
   DEFAULT_LOCATION_LAT=YOUR_OFFICE_LATITUDE
   DEFAULT_LOCATION_LNG=YOUR_OFFICE_LONGITUDE
   MAX_DISTANCE_KM=50
   
   # To disable location validation entirely
   LOCATION_VALIDATION_ENABLED=false
   ```

4. **Build errors**
   ```bash
   # Clean install dependencies
   cd client && npm install
   cd ../server && npm install
   ```

5. **Permission denied errors**
   ```bash
   # Make scripts executable
   chmod +x install.sh start.sh
   ```

### Logs and Debugging

- **Frontend logs**: Check browser console (F12)
- **Backend logs**: Check terminal where server is running
- **MongoDB logs**: `brew services list | grep mongodb`
- **Network issues**: Check if ports 3000 and 5001 are available

## 📊 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Attendance Endpoints

- `POST /api/attendance/punch-in` - Punch in with location
- `POST /api/attendance/punch-out` - Punch out with location
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/history` - Get attendance history
- `GET /api/attendance/stats` - Get attendance statistics

### Leave Management

- `POST /api/leaves/request` - Request leave
- `GET /api/leaves/history` - Get leave history
- `PUT /api/leaves/:id/approve` - Approve/reject leave
- `GET /api/leaves/pending` - Get pending leave requests

### Employee Management (Admin Only)

- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee

### Reports

- `GET /api/reports/attendance` - Get attendance reports
- `GET /api/reports/leaves` - Get leave reports
- `GET /api/reports/analytics` - Get analytics data

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 **Create an issue** in the repository
- 📚 **Check the documentation** in the `docs/` folder
- 🔍 **Review the troubleshooting section** above
- 💬 **Join our community** discussions

## 🙏 Acknowledgments

- **Material-UI** for the beautiful component library
- **Chart.js** for data visualization
- **Socket.IO** for real-time communication
- **MongoDB** for the database solution

---

**Made with ❤️ for better workplace management**

*Built for modern remote work environments* 