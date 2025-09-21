# Quick Start Guide

This guide will help you get the Personal Finance Tracker backend up and running quickly.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 16+ installed
- ✅ PostgreSQL 12+ running
- ✅ Redis 6+ running

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
# Copy example environment file
cp env.example .env

# Edit .env with your database credentials
# At minimum, update:
# - DB_PASSWORD=your_postgres_password
# - JWT_SECRET=your_secret_key_here
```

### 3. Setup Database
```bash
# Create database (run in PostgreSQL)
createdb finance_tracker

# Or using psql
psql -U postgres -c "CREATE DATABASE finance_tracker;"
```

### 4. Run Setup Script
```bash
# This will create tables and seed demo data
npm run setup
```

### 5. Start Server
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

## Verify Installation

1. **Health Check**: Visit `http://localhost:5000/health`
2. **API Docs**: Visit `http://localhost:5000/api-docs`
3. **Test Login**: Use demo credentials:
   - Admin: `admin@financetracker.com` / `admin123`
   - User: `user@test.com` / `admin123`
   - Read-only: `readonly@test.com` / `admin123`

## Test API Endpoints

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@financetracker.com","password":"admin123"}'
```

### Get Transactions (with token)
```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics
```bash
curl -X GET http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues & Solutions

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and credentials are correct in `.env`

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis server:
- Ubuntu: `sudo systemctl start redis-server`
- macOS: `brew services start redis`
- Windows: Start Redis from installation directory

### JWT Secret Error
```
Error: secretOrPrivateKey has a value of "undefined"
```
**Solution**: Set `JWT_SECRET` in your `.env` file to a strong secret key

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution**: Change `PORT` in `.env` or kill process using port 5000

## Next Steps

1. **Frontend Integration**: Connect your React frontend to `http://localhost:5000`
2. **API Exploration**: Use the Swagger docs at `/api-docs`
3. **Custom Categories**: Add your own transaction categories via admin panel
4. **User Management**: Create additional users with different roles
5. **Analytics**: Explore the various analytics endpoints

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use strong passwords and secrets
3. Configure SSL/TLS
4. Set up proper logging
5. Configure reverse proxy (nginx)
6. Set up monitoring

## Need Help?

- 📚 Full documentation: `README.md`
- 🔍 API docs: `http://localhost:5000/api-docs`
- 🐛 Issues: Check troubleshooting section in README

Happy coding! 🚀
