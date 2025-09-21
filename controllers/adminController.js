const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
// Removed bcrypt - using plain text passwords

// Validation rules for admin user creation
const createUserValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .isIn(['admin', 'user', 'read-only'])
    .withMessage('Role must be admin, user, or read-only'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
];

// Create a new user (admin only)
const createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user with specified role (plain text password)
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, email, role, first_name, last_name, created_at`,
      [username, email, password, role, firstName || null, lastName || null]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          createdAt: newUser.created_at
        }
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during user creation'
    });
  }
};

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (role && ['admin', 'user', 'read-only'].includes(role)) {
      paramCount++;
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    // Get users
    const usersQuery = `
      SELECT id, username, email, role, first_name, last_name, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(usersQuery, queryParams);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user by ID (admin only)
const getUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const result = await pool.query(
      'SELECT id, username, email, role, first_name, last_name, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_transactions,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_transactions,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expense
      FROM transactions 
      WHERE user_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        user: result.rows[0],
        statistics: {
          totalTransactions: parseInt(stats.total_transactions),
          incomeTransactions: parseInt(stats.income_transactions),
          expenseTransactions: parseInt(stats.expense_transactions),
          totalIncome: parseFloat(stats.total_income),
          totalExpense: parseFloat(stats.total_expense),
          netAmount: parseFloat(stats.total_income) - parseFloat(stats.total_expense)
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['admin', 'user', 'read-only'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, user, or read-only'
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Update role
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, role, first_name, last_name',
      [role, userId]
    );

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Delete user (transactions will be cascade deleted due to foreign key constraint)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get system statistics (admin only)
const getSystemStats = async (req, res) => {
  try {
    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
        COUNT(CASE WHEN role = 'read-only' THEN 1 END) as readonly_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_last_month
      FROM users
    `;

    const userStats = await pool.query(userStatsQuery);

    // Get transaction statistics
    const transactionStatsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_transactions,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_transactions,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expense,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_transactions_last_month
      FROM transactions
    `;

    const transactionStats = await pool.query(transactionStatsQuery);

    // Get category statistics
    const categoryStatsQuery = `
      SELECT 
        COUNT(*) as total_categories,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_categories,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_categories
      FROM categories
    `;

    const categoryStats = await pool.query(categoryStatsQuery);

    // Get most active users
    const activeUsersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY transaction_count DESC, total_amount DESC
      LIMIT 10
    `;

    const activeUsers = await pool.query(activeUsersQuery);

    res.json({
      success: true,
      data: {
        userStatistics: {
          totalUsers: parseInt(userStats.rows[0].total_users),
          adminUsers: parseInt(userStats.rows[0].admin_users),
          regularUsers: parseInt(userStats.rows[0].regular_users),
          readonlyUsers: parseInt(userStats.rows[0].readonly_users),
          newUsersLastMonth: parseInt(userStats.rows[0].new_users_last_month)
        },
        transactionStatistics: {
          totalTransactions: parseInt(transactionStats.rows[0].total_transactions),
          incomeTransactions: parseInt(transactionStats.rows[0].income_transactions),
          expenseTransactions: parseInt(transactionStats.rows[0].expense_transactions),
          totalIncome: parseFloat(transactionStats.rows[0].total_income),
          totalExpense: parseFloat(transactionStats.rows[0].total_expense),
          newTransactionsLastMonth: parseInt(transactionStats.rows[0].new_transactions_last_month)
        },
        categoryStatistics: {
          totalCategories: parseInt(categoryStats.rows[0].total_categories),
          incomeCategories: parseInt(categoryStats.rows[0].income_categories),
          expenseCategories: parseInt(categoryStats.rows[0].expense_categories)
        },
        mostActiveUsers: activeUsers.rows.map(user => ({
          ...user,
          transaction_count: parseInt(user.transaction_count),
          total_amount: parseFloat(user.total_amount)
        }))
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create transaction for a user (admin only)
const createTransactionForUser = async (req, res) => {
  try {
    const { body, validationResult } = require('express-validator');
    const { clearTransactionCache, clearAnalyticsCache } = require('../middleware/cache');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const targetUserId = parseInt(req.params.userId);
    const { amount, type, category_id, description, transaction_date } = req.body;

    // Verify target user exists
    const userExists = await pool.query('SELECT id, username FROM users WHERE id = $1', [targetUserId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Verify category exists and matches the transaction type
    const categoryResult = await pool.query(
      'SELECT id, type, name FROM categories WHERE id = $1',
      [category_id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = categoryResult.rows[0];
    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: `Category type (${category.type}) does not match transaction type (${type})`
      });
    }

    // Create transaction for the user
    const result = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, amount, type, description, transaction_date, created_at`,
      [targetUserId, category_id, amount, type, description || null, transaction_date]
    );

    const newTransaction = result.rows[0];

    // Clear relevant caches
    await clearTransactionCache(targetUserId);
    await clearAnalyticsCache(targetUserId);

    res.status(201).json({
      success: true,
      message: `Transaction created successfully for user ${userExists.rows[0].username}`,
      data: {
        transaction: {
          ...newTransaction,
          category_id,
          category_name: category.name,
          user_id: targetUserId,
          username: userExists.rows[0].username
        }
      }
    });

  } catch (error) {
    console.error('Admin create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all transactions from all users (admin only)
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      category_id = '',
      user_id = '',
      start_date = '',
      end_date = '',
      sort_by = 'transaction_date',
      sort_order = 'desc'
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = ['transaction_date', 'amount', 'type', 'category_name', 'username'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'transaction_date';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Search functionality
    if (search.trim()) {
      whereConditions.push(`(
        t.description ILIKE $${paramIndex} OR 
        c.name ILIKE $${paramIndex} OR 
        u.username ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Type filter
    if (type && ['income', 'expense'].includes(type)) {
      whereConditions.push(`t.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Category filter
    if (category_id && !isNaN(parseInt(category_id))) {
      whereConditions.push(`t.category_id = $${paramIndex}`);
      queryParams.push(parseInt(category_id));
      paramIndex++;
    }

    // User filter
    if (user_id && !isNaN(parseInt(user_id))) {
      whereConditions.push(`t.user_id = $${paramIndex}`);
      queryParams.push(parseInt(user_id));
      paramIndex++;
    }

    // Date range filters
    if (start_date) {
      whereConditions.push(`t.transaction_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`t.transaction_date <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Get transactions with user and category details
    const sortClause = sortField === 'category_name' ? 'c.name' : 
                      sortField === 'username' ? 'u.username' : 
                      `t.${sortField}`;

    const transactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        t.user_id,
        t.category_id,
        u.username,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY ${sortClause} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limitNum, offset);
    const transactionsResult = await pool.query(transactionsQuery, queryParams);

    // Format the response
    const transactions = transactionsResult.rows.map(transaction => ({
      id: transaction.id,
      amount: parseFloat(transaction.amount),
      type: transaction.type,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      user_id: transaction.user_id,
      category_id: transaction.category_id,
      username: transaction.username,
      user_first_name: transaction.user_first_name,
      user_last_name: transaction.user_last_name,
      category_name: transaction.category_name,
      category_type: transaction.category_type
    }));

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Validation for admin transaction creation
const adminTransactionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a valid positive integer'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('transaction_date')
    .isISO8601()
    .withMessage('Transaction date must be a valid date in ISO format')
];

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  getSystemStats,
  createUserValidation,
  createTransactionForUser,
  adminTransactionValidation,
  getAllTransactions
};
