# Users & Permissions Management Backend

A comprehensive RBAC (Role-Based Access Control) system built with **Express.js**, **TypeScript**, and **MongoDB**. This backend provides a complete user and permissions management API with authentication, authorization, audit logging, and comprehensive security features.

## 🚀 Features

### 🔐 Authentication & Security
- JWT-based authentication with access and refresh tokens
- Password hashing with bcrypt
- Rate limiting and CORS protection
- Email verification and password reset (stubbed for demo)
- Session management with token blacklisting

### 👥 User Management
- Complete CRUD operations for users
- User search, pagination, and filtering
- User activation/deactivation
- Profile management with role assignment

### 🛡️ RBAC System
- **Roles**: Create, update, delete, and manage roles
- **Permissions**: Granular permission system with resource-action pairs
- **Guards**: Route-level and method-level authorization
- **Hierarchical Access**: Support for multiple roles per user

### 📊 Audit Logging
- Complete audit trail of all user actions
- User activity tracking
- System statistics and reporting
- Searchable audit logs with filtering

### 📚 API Documentation
- Complete Swagger/OpenAPI documentation
- Interactive API explorer
- Request/response schemas
- Authentication examples

## 🛠️ Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi schema validation
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcrypt

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn package manager

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd users-permissions-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Environment
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/users_permissions_db

# JWT Secrets (Generate strong secrets!)
JWT_ACCESS_SECRET=your_super_secret_access_token_key_here_make_it_long_and_complex
JWT_REFRESH_SECRET=your_super_secret_refresh_token_key_here_make_it_long_and_complex
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
FRONTEND_URL=http://localhost:3000
```

### 4. Build the Project

```bash
npm run build
```

### 5. Seed the Database

Populate the database with initial data (permissions, roles, and sample users):

```bash
npm run seed
```

### 6. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

Once the server is running, access the interactive API documentation at:

**Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

## 🔑 Default Credentials

The seed script creates several test accounts:

### Super Admin
- **Email**: `admin@opuslab.com`
- **Password**: `Admin123!@#`
- **Permissions**: Full system access

### Admin User
- **Email**: `admin.user@opuslab.com`
- **Password**: `Admin123!`
- **Permissions**: Most administrative functions

### Manager
- **Email**: `manager@opuslab.com`
- **Password**: `Manager123!`
- **Permissions**: User and role management

### Regular User
- **Email**: `john.doe@opuslab.com`
- **Password**: `User123!`
- **Permissions**: Basic user access

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.ts           # MongoDB connection
├── middleware/
│   ├── auth.ts               # Authentication & authorization middleware
│   └── errorHandler.ts       # Global error handling
├── models/
│   ├── User.ts               # User model with authentication methods
│   ├── Role.ts               # Role model with permissions
│   ├── Permission.ts         # Permission model
│   └── AuditLog.ts           # Audit logging model
├── routes/
│   ├── auth.ts               # Authentication routes
│   ├── users.ts              # User management routes
│   ├── roles.ts              # Role management routes
│   ├── permissions.ts        # Permission management routes
│   └── audit.ts              # Audit log routes
├── scripts/
│   └── seed.ts               # Database seeding script
├── validation/
│   └── schemas.ts            # Joi validation schemas
└── server.ts                 # Main application entry point
```

## 🔐 Authentication Flow

### 1. Login
```bash
POST /api/auth/login
{
  "email": "admin@opuslab.com",
  "password": "Admin123!@#"
}
```

### 2. Use Access Token
```bash
GET /api/users
Headers: {
  "Authorization": "Bearer <access-token>"
}
```

### 3. Refresh Token
```bash
POST /api/auth/refresh
{
  "refreshToken": "<refresh-token>"
}
```

## 🛡️ RBAC System

### Permissions Structure
Permissions follow a `resource:action` pattern:
- `user:create` - Create users
- `user:read` - View users
- `user:update` - Update users
- `user:delete` - Delete users
- `user:manage` - Full user management

### Role Hierarchy
1. **Super Admin** - All permissions
2. **Admin** - Most permissions except system management
3. **Manager** - User and role management
4. **User** - Basic read permissions
5. **Guest** - Read-only access

### Authorization Guards

Protect routes with specific permissions:
```typescript
router.get('/users', 
  authenticate,                    // Require valid JWT
  authorize('user', 'read'),       // Require user read permission
  getUsersHandler
);
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate token)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users
- `GET /api/users` - List users (paginated)
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `PATCH /api/users/:id/activate` - Activate user
- `PUT /api/users/:id/roles` - Update user roles

### Roles
- `GET /api/roles` - List roles (paginated)
- `POST /api/roles` - Create role
- `GET /api/roles/:id` - Get role by ID
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Deactivate role
- `PUT /api/roles/:id/permissions` - Update role permissions
- `GET /api/roles/:id/users` - Get users with role

### Permissions
- `GET /api/permissions` - List permissions (paginated)
- `GET /api/permissions/grouped` - Permissions grouped by resource
- `POST /api/permissions` - Create permission
- `POST /api/permissions/bulk` - Create multiple permissions
- `GET /api/permissions/:id` - Get permission by ID
- `DELETE /api/permissions/:id` - Delete permission

### Audit Logs
- `GET /api/audit` - List audit logs (filtered)
- `GET /api/audit/recent` - Recent activity
- `GET /api/audit/user/:userId` - User activity
- `GET /api/audit/stats` - Audit statistics

## 🧪 Testing

### Manual Testing with curl

Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@opuslab.com", "password": "Admin123!@#"}'
```

Get Users:
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer <your-access-token>"
```

### API Testing with Postman

A Postman collection is available with pre-configured requests for all endpoints.

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### Rate Limiting
- 100 requests per 15-minute window per IP
- Configurable via environment variables

### Data Validation
- All inputs validated with Joi schemas
- MongoDB ObjectId validation
- Email format validation
- Sanitization of user inputs

### Audit Trail
- All user actions logged with timestamps
- IP address and user agent tracking
- Change tracking for updates
- Searchable audit history

## 🐳 Docker Support (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/users_permissions_db
    depends_on:
      - mongo
  
  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run seed` - Seed database with initial data
- `npm test` - Run tests (when implemented)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**MongoDB Connection Error**:
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify database permissions

**JWT Token Error**:
- Ensure JWT secrets are set in .env
- Check token expiration times
- Verify token format in requests

**Permission Denied**:
- Check user roles and permissions
- Verify authorization middleware
- Review audit logs for details

### Debug Mode

Set environment variable for detailed logging:
```bash
NODE_ENV=development npm run dev
```

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation
- Review audit logs for debugging
- Consult the troubleshooting section

---

**Built with ❤️ for OpusLab**