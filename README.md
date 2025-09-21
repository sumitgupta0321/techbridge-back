# Personal Finance Tracker - Backend API

A comprehensive backend API for managing personal finances with role-based access control, analytics, caching, and security features.

## 🚀 Features

### Core Features
- **User Authentication**: JWT-based authentication with role-based access control
- **Transaction Management**: Full CRUD operations for income and expense tracking
- **Category System**: Flexible categorization system for transactions
- **Analytics Dashboard**: Comprehensive financial analytics and reporting
- **Role-Based Access Control**: Three user roles (admin, user, read-only)

### Security Features
- **Rate Limiting**: Configurable rate limits for different endpoints
- **Input Validation**: XSS and SQL injection protection
- **Security Headers**: Helmet.js integration for security headers
- **Password Hashing**: Bcrypt for secure password storage

### Performance Features
- **Redis Caching**: Intelligent caching for frequently accessed data
- **Database Optimization**: Indexed queries and optimized database schema
- **Compression**: Gzip compression for API responses
- **Pagination**: Efficient pagination for large datasets

## 🛠️ Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, bcryptjs, express-rate-limit

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **PostgreSQL** (version 12 or higher)
- **Redis** (version 6 or higher)
- **npm** or **yarn** package manager

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd personal-finance-tracker-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory using the provided example:

```bash
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_tracker
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# Cache TTL (in seconds)
CACHE_TTL_ANALYTICS=900
CACHE_TTL_CATEGORIES=3600

# CORS (comma-separated list for production)
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

### 4. Database Setup

#### Create PostgreSQL Database
```sql
CREATE DATABASE finance_tracker;
```

#### Run Database Migrations
```bash
npm run migrate
```

This will create all necessary tables and insert default categories and demo users.

### 5. Start Redis Server
Make sure Redis is running on your system:

```bash
# On Ubuntu/Debian
sudo systemctl start redis-server

# On macOS with Homebrew
brew services start redis

# Or run directly
redis-server
```

### 6. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:5000/api-docs`

## 🔐 Default Users

The migration script creates three demo users for testing:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@financetracker.com | admin123 | Full access to all features |
| User | user@test.com | admin123 | Can manage own transactions |
| Read-only | readonly@test.com | admin123 | Can only view own data |

**⚠️ Important**: Change these passwords in production!

## 🏗️ Project Structure

```
├── config/
│   ├── database.js      # PostgreSQL connection
│   ├── redis.js         # Redis connection
│   └── swagger.js       # API documentation config
├── controllers/
│   ├── authController.js      # Authentication logic
│   ├── transactionController.js # Transaction CRUD
│   ├── categoryController.js   # Category management
│   ├── analyticsController.js  # Analytics and reporting
│   └── adminController.js      # Admin functions
├── middleware/
│   ├── auth.js          # JWT and RBAC middleware
│   ├── cache.js         # Redis caching middleware
│   └── security.js      # Security middleware
├── migrations/
│   ├── schema.sql       # Database schema
│   └── migrate.js       # Migration script
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── transactions.js  # Transaction routes
│   ├── categories.js    # Category routes
│   ├── analytics.js     # Analytics routes
│   └── admin.js         # Admin routes
├── server.js            # Main application file
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Transactions
- `GET /api/transactions` - Get transactions (with filtering & pagination)
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get transaction summary

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get specific category
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)
- `GET /api/categories/stats` - Get category statistics (admin only)

### Analytics
- `GET /api/analytics/monthly` - Monthly overview
- `GET /api/analytics/yearly` - Yearly overview
- `GET /api/analytics/categories` - Category breakdown
- `GET /api/analytics/trends` - Income vs expense trends
- `GET /api/analytics/dashboard` - Dashboard summary

### Admin
- `POST /api/admin/users` - Create new user (admin only)
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/users/:id` - Get user details (admin only)
- `PUT /api/admin/users/:id/role` - Update user role (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `POST /api/admin/users/:userId/transactions` - Create transaction for specific user (admin only)
- `GET /api/admin/stats` - System statistics (admin only)

## 🛡️ Security Features

### Rate Limiting
- **Auth endpoints**: 5 requests per 15 minutes
- **Transaction endpoints**: 100 requests per hour
- **Analytics endpoints**: 50 requests per hour
- **General endpoints**: 200 requests per 15 minutes

### Input Validation
- XSS protection through input sanitization
- SQL injection prevention using parameterized queries
- Request body size limits
- Input validation using express-validator

### Authentication & Authorization
- JWT tokens with configurable expiration
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Secure headers with Helmet.js

## 📊 Caching Strategy

### Redis Caching
- **Analytics data**: 15 minutes TTL
- **Category lists**: 1 hour TTL
- **Transaction lists**: 5 minutes TTL
- **User profiles**: 10 minutes TTL

### Cache Invalidation
- Automatic cache clearing on data updates
- User-specific cache management
- Pattern-based cache clearing

## 🔧 Available Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Run database migrations
npm run migrate

# Run tests (if implemented)
npm test
```

## 🌐 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment | development | No |
| `DB_HOST` | PostgreSQL host | localhost | Yes |
| `DB_PORT` | PostgreSQL port | 5432 | No |
| `DB_NAME` | Database name | finance_tracker | Yes |
| `DB_USER` | Database user | postgres | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `REDIS_HOST` | Redis host | localhost | No |
| `REDIS_PORT` | Redis port | 6379 | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration | 7d | No |
| `ALLOWED_ORIGINS` | CORS origins | - | No |

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up Redis with authentication
5. Configure `ALLOWED_ORIGINS` for CORS
6. Use environment variables for all secrets
7. Set up SSL/TLS certificates
8. Configure reverse proxy (nginx/Apache)
9. Set up monitoring and logging
10. Change default user passwords

### Docker Deployment (Optional)
You can containerize the application using Docker. Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Redis Connection Error**
   - Verify Redis is running
   - Check Redis configuration in `.env`

3. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set
   - Check token expiration settings

4. **CORS Errors**
   - Configure `ALLOWED_ORIGINS` properly
   - Verify frontend URL is included

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the troubleshooting section

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy coding! 💰📊**
