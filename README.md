# AI Professor Backend

A NestJS-based backend API for the AI Professor platform with multi-tenant architecture supporting educational institutions.

## Features

- 🏫 **Multi-tenant Architecture**: Separate databases for each school
- 👥 **Role-based Access Control**: Super Admin, School Admin, Professor, Student roles
- 🔐 **JWT Authentication**: Secure token-based authentication
- 📊 **MongoDB Integration**: Central and tenant database management
- 📁 **File Upload**: AWS S3 integration for production, local storage for development
- 📧 **Email System**: Template-based email notifications
- 📖 **API Documentation**: Swagger/OpenAPI documentation
- 🐳 **Docker Support**: Full containerization support

## Architecture

```
Central Database (MongoDB)
├── Users (Super Admins, School Admins, Professors)
├── Schools
└── Roles

Tenant Databases (Per School)
├── Students
└── Student Notifications
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- Yarn package manager

### Local Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd ai-professor-backend
   yarn install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB** (if running locally)
   ```bash
   # Using MongoDB service
   sudo service mongod start
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   ```

4. **Seed the database**
   ```bash
   yarn seed
   ```

5. **Start the development server**
   ```bash
   yarn start:dev
   ```

6. **Verify the setup**
   - API: http://localhost:5000/api
   - Health Check: http://localhost:5000/api/health
   - API Documentation: http://localhost:5000/api/docs

## Docker Setup

### Using Docker Compose (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

### Using Docker only

1. **Build the image**
   ```bash
   docker build -t ai-professor-backend .
   ```

2. **Run with environment variables**
   ```bash
   docker run -p 5000:5000 \
     -e MONGODB_URI=mongodb://host.docker.internal:27017/ai-professor-central \
     -e JWT_SECRET=your-secret-key \
     ai-professor-backend
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRY` | JWT token expiry | `24h` |
| `FRONT_END_BASE_URL` | Frontend URL for CORS | Required |

## API Endpoints

### Authentication
- `POST /api/auth/super-admin/login` - Super admin login
- `POST /api/auth/school-admin/login` - School admin/professor login
- `POST /api/auth/student/login` - Student login
- `GET /api/auth/me` - Get current user info

### School Administration
- `POST /api/school-admin` - Create school and admin
- `PATCH /api/school-admin/school/:id` - Update school details

### User Management
- `POST /api/professor` - Create professor
- `PATCH /api/professor/:id` - Update professor
- `POST /api/students` - Create student

### File Upload
- `POST /api/upload/profile-url` - Get S3 upload URL (production)
- `POST /api/upload/profile` - Direct upload (development)

### Health Check
- `GET /api/health` - API health status

## Scripts

```bash
# Development
yarn start:dev          # Start with hot reload
yarn start:debug        # Start with debug mode

# Production
yarn build              # Build the application
yarn start:prod         # Start production server

# Database
yarn seed               # Seed initial data

# Testing
yarn test               # Run unit tests
yarn test:e2e           # Run e2e tests
yarn test:cov           # Run tests with coverage

# Code Quality
yarn lint               # Run ESLint
yarn format             # Run Prettier
```

## Database Seeding

The application includes a seeding system for initial data:

```bash
yarn seed
```

This creates:
- Default roles (Super Admin, School Admin, Professor, Student)
- Super admin user (email: superadmin.aiprofessor@yopmail.com, password: SuperAdmin@123)

## Testing

Run the test cases to verify functionality:

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/api/health
   # Expected: {"status":"ok"}
   ```

2. **MongoDB Connection**
   - Check server logs for "MongoDB connected successfully"

3. **Environment Variables**
   - Verify server starts on PORT from .env
   - Verify MongoDB connection uses MONGODB_URI

## Production Deployment

1. **Set production environment variables**
2. **Configure AWS S3 for file uploads**
3. **Set up MongoDB cluster**
4. **Configure email service**
5. **Deploy using Docker or your preferred platform**

## Project Structure

```
src/
├── common/           # Shared utilities, guards, decorators
├── database/         # Database schemas and connections
├── modules/          # Feature modules (auth, admin, etc.)
├── mail/             # Email templates and service
├── seeders/          # Database seeding
└── main.ts           # Application entry point
```

## Support

For issues and questions:
- Check the API documentation at `/api/docs`
- Review the logs for error details
- Ensure all environment variables are properly set

## License

This project is private and proprietary.
