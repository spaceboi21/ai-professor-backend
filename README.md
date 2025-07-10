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
- 📚 **Module Management**: Create, update, and manage educational modules with tags
- 📖 **Chapter Management**: Organize modules into chapters with sequence reordering
- 🔍 **Advanced Search**: Tag-based filtering and search capabilities
- 📄 **Pagination**: Efficient data pagination for large datasets
- 🔄 **Sequence Management**: Drag-and-drop chapter reordering with transaction safety
- 👤 **User Details**: Automatic user information attachment to entities

## Architecture

```
Central Database (MongoDB)
├── Users (Super Admins, School Admins, Professors)
├── Schools
└── Roles

Tenant Databases (Per School)
├── Students
├── Student Notifications
├── Modules (with tags)
└── Chapters (with sequences)
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

| Variable             | Description                                                 | Default       |
| -------------------- | ----------------------------------------------------------- | ------------- |
| `NODE_ENV`           | Environment mode                                            | `development` |
| `PORT`               | Server port                                                 | `5000`        |
| `MONGODB_URI`        | Central MongoDB connection string                           | Required      |
| `CENTRAL_DB_URI`     | Alternative central database connection string              | Optional      |
| `MONGODB_BASE_URI`   | Base URI for tenant databases (without database name)      | Required      |
| `JWT_SECRET`         | JWT signing secret                                          | Required      |
| `JWT_EXPIRY`         | JWT token expiry                                            | `24h`         |
| `FRONT_END_BASE_URL` | Frontend URL for CORS                                       | Required      |

### Migration Environment Variables

For database migrations, you need these environment variables:

- **`MONGODB_URI` or `CENTRAL_DB_URI`**: Central database connection (e.g., `mongodb://localhost:27017/ai-professor-central`)
- **`MONGODB_BASE_URI`**: Base URI for tenant databases (e.g., `mongodb://localhost:27017`)

Example values:
```bash
MONGODB_URI=mongodb://localhost:27017/ai-professor-central
MONGODB_BASE_URI=mongodb://localhost:27017
```

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

### Module Management

- `POST /api/modules` - Create module (Professors, School Admins)
- `GET /api/modules` - Get all modules with pagination
- `GET /api/modules/:id` - Get module by ID
- `PATCH /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

### Chapter Management

- `POST /api/chapters` - Create chapter (Professors, School Admins)
- `GET /api/chapters` - Get all chapters with pagination and module filtering
- `GET /api/chapters/:id` - Get chapter by ID
- `PATCH /api/chapters/:id` - Update chapter
- `DELETE /api/chapters/:id` - Delete chapter
- `POST /api/chapters/reorder` - Reorder chapters with transaction safety
- `GET /api/chapters/next-sequence/:module_id` - Get next sequence number

### File Upload

- `POST /api/upload/profile-url` - Get S3 upload URL (production)
- `POST /api/upload/profile` - Direct upload (development)

### Health Check

- `GET /api/health` - API health status

## Database Migrations

The AI Professor backend includes a comprehensive migration system for managing database schema changes across both central and tenant databases.

### Migration Commands

```bash
# Run all migrations (central + tenant) for a specific tenant database
yarn migrate --db-name school_abc_db

# Run only central migrations
yarn migrate --type central

# Run only tenant migrations for a specific database
yarn migrate --type tenant --db-name school_abc_db

# Display help
yarn migrate --help
```

### Migration Structure

Migrations are organized in two directories:

- **`src/database/migrations/central/`** - Central database migrations (users, schools, roles)
- **`src/database/migrations/tenants/`** - Tenant database migrations (students, modules, chapters)

### Creating Migrations

Migration files should follow this naming pattern:
```
YYYYMMDDHHMMSS-description.migration.ts
```

#### Central Migration Example
```typescript
// src/database/migrations/central/20250101120000-add-user-field.migration.ts
import mongoose from 'mongoose';

export async function up(connection: mongoose.Connection) {
  await connection.collection('users').updateMany(
    { new_field: { $exists: false } }, 
    { $set: { new_field: 'default_value' } }
  );
  console.info('Migration up: added new_field to users');
}

export async function down(connection: mongoose.Connection) {
  await connection.collection('users').updateMany(
    {}, 
    { $unset: { new_field: '' } }
  );
  console.info('Migration down: removed new_field from users');
}
```

#### Tenant Migration Example
```typescript
// src/database/migrations/tenants/20250101120000-add-student-field.migration.ts
import mongoose from 'mongoose';

export async function up(connection: mongoose.Connection, tenantDbName: string) {
  await connection.collection('students').updateMany(
    { new_field: { $exists: false } }, 
    { $set: { new_field: 'default_value' } }
  );
  console.info(`Migration up: added new_field to students in ${tenantDbName}`);
}

export async function down(connection: mongoose.Connection, tenantDbName: string) {
  await connection.collection('students').updateMany(
    {}, 
    { $unset: { new_field: '' } }
  );
  console.info(`Migration down: removed new_field from students in ${tenantDbName}`);
}
```

### Migration Features

- **✅ Automatic Tracking**: Migrations are tracked to prevent re-execution
- **🔄 Execution Order**: Central migrations run first, followed by tenant migrations
- **⚡ Fast Execution**: Only new migrations are executed
- **🛡️ Error Handling**: Migrations stop on first failure with detailed error reporting
- **📊 Progress Reporting**: Real-time execution status and performance metrics
- **🎯 Selective Execution**: Run central, tenant, or all migrations as needed

## Core Functionality

### 📚 **Module Management**

- **Create & Organize**: Build educational modules with titles, subjects, and descriptions
- **Tag System**: Add tags for easy searching and filtering (e.g., "psychology", "child-development")
- **Difficulty Levels**: Set modules as BEGINNER, INTERMEDIATE, or ADVANCED
- **Duration Tracking**: Record module duration in minutes for curriculum planning
- **Category Support**: Optional categorization for better organization

### 📖 **Chapter Management**

- **Hierarchical Structure**: Organize modules into chapters for better content flow
- **Auto-Sequencing**: New chapters automatically get the next sequence number
- **Drag & Drop Reordering**: Safely reorder chapters with transaction-based updates
- **Module Association**: Each chapter belongs to a specific module
- **Content Organization**: Add titles, subjects, and descriptions to chapters

### 🔍 **Advanced Search & Filtering**

- **Tag-Based Search**: Find modules by tags (e.g., search for "psychology" modules)
- **Module Filtering**: Get chapters for specific modules
- **Multi-Criteria Search**: Combine tags, categories, and difficulty levels
- **Efficient Queries**: Optimized database queries for fast search results

### 📄 **Smart Pagination**

- **Performance**: Handle large datasets efficiently with pagination
- **Flexible Limits**: Configure page size from 1 to 100 items
- **Rich Metadata**: Get total counts, page info, and navigation helpers
- **Consistent API**: Same pagination format across all endpoints

### 🔄 **Safe Reordering System**

- **Transaction Safety**: MongoDB transactions prevent data corruption
- **Conflict Prevention**: Smart sequence management avoids duplicate errors
- **Atomic Operations**: All reorder operations succeed or fail together
- **Real-time Updates**: Immediate sequence updates with proper validation

### 👤 **User Context Integration**

- **Automatic User Details**: All entities show who created them
- **Role-Based Access**: Different permissions for different user types
- **Audit Trail**: Track who created/modified content
- **User-Friendly**: Display creator names instead of just IDs

## Key Features Overview

### 🔍 **Smart Search System**

- **Tag-Based Filtering**: Find content by tags like "psychology" or "child-development"
- **Module-Specific Chapters**: Get chapters for any specific module
- **Multi-Level Search**: Combine tags, categories, and difficulty levels
- **Fast Results**: Optimized database queries for quick responses

### 📄 **Efficient Data Handling**

- **Smart Pagination**: Handle thousands of modules/chapters efficiently
- **Flexible Page Sizes**: Choose from 1 to 100 items per page
- **Rich Navigation**: Get total counts and page information
- **Consistent Experience**: Same pagination across all features

### 🔄 **Safe Content Organization**

- **Drag & Drop Reordering**: Reorder chapters safely with visual feedback
- **Transaction Safety**: All changes succeed or fail together
- **No Data Loss**: Automatic rollback if anything goes wrong
- **Real-time Updates**: See changes immediately with proper validation

### 👤 **User-Friendly Experience**

- **Creator Information**: See who created each module/chapter
- **Role-Based Access**: Different features for different user types
- **Audit Trail**: Track who made changes and when
- **Clean Interface**: Names instead of technical IDs

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
│   ├── utils/       # Common utilities (user-details, pagination)
│   ├── dto/         # Shared DTOs (pagination)
│   └── ...
├── database/         # Database schemas and connections
│   ├── schemas/     # MongoDB schemas
│   │   ├── central/ # Central database schemas
│   │   └── tenant/  # Tenant database schemas
│   └── ...
├── modules/          # Feature modules
│   ├── modules/     # Module management
│   ├── chapters/    # Chapter management
│   ├── auth/        # Authentication
│   └── ...
├── mail/             # Email templates and service
├── seeders/          # Database seeding
└── main.ts           # Application entry point
```

## Common Utilities

### User Details Utility

Automatically attach user information to entities:

```typescript
import {
  attachUserDetails,
  attachUserDetailsToEntity,
} from 'src/common/utils/user-details.util';

// For arrays
const entitiesWithUsers = await attachUserDetails(entities, userModel);

// For single entity
const entityWithUser = await attachUserDetailsToEntity(entity, userModel);
```

### Pagination Utility

Standardized pagination across all services:

```typescript
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

const options = getPaginationOptions(paginationDto);
const result = createPaginationResult(data, total, options);
```

## Support

For issues and questions:

- Check the API documentation at `/api/docs`
- Review the logs for error details
- Ensure all environment variables are properly set

## License

This project is private and proprietary.
