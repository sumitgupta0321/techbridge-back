const { body, validationResult, query } = require('express-validator');
const { pool } = require('../config/database');
const { clearTransactionCache, clearAnalyticsCache } = require('../middleware/cache');

// Validation rules
const transactionValidation = [
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

// Get all transactions for a user with pagination and filtering
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Filtering
    const { type, category_id, start_date, end_date, search } = req.query;

    let whereConditions = ['t.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (type && ['income', 'expense'].includes(type)) {
      paramCount++;
      whereConditions.push(`t.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (category_id) {
      paramCount++;
      whereConditions.push(`t.category_id = $${paramCount}`);
      queryParams.push(parseInt(category_id));
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`t.transaction_date >= $${paramCount}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`t.transaction_date <= $${paramCount}`);
      queryParams.push(end_date);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(t.description ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    // Get transactions with category details
    const transactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(transactionsQuery, queryParams);

    res.json({
      success: true,
      data: {
        transactions: result.rows,
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
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get a single transaction by ID
const getTransaction = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const userId = req.user.id;

    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.amount,
        t.type,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1
    `;

    let queryParams = [transactionId];

    // Non-admin users can only see their own transactions
    if (req.user.role !== 'admin') {
      query += ' AND t.user_id = $2';
      queryParams.push(userId);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        transaction: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create a new transaction
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, type, category_id, description, transaction_date, user_id } = req.body;
    
    // Admin can create transactions for other users, regular users create for themselves
    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && user_id) {
      targetUserId = parseInt(user_id);
      
      // Verify target user exists
      const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
      if (userExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Target user not found'
        });
      }
    }

    // Verify category exists and matches the transaction type
    const categoryResult = await pool.query(
      'SELECT id, type FROM categories WHERE id = $1',
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

    // Create transaction
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
      message: 'Transaction created successfully',
      data: {
        transaction: {
          ...newTransaction,
          category_id,
          user_id: targetUserId
        }
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update a transaction
const updateTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transactionId = parseInt(req.params.id);
    const { amount, type, category_id, description, transaction_date } = req.body;
    const userId = req.user.id;

    // Check if transaction exists and user has permission to update it
    let checkQuery = 'SELECT user_id FROM transactions WHERE id = $1';
    let checkParams = [transactionId];

    if (req.user.role !== 'admin') {
      checkQuery += ' AND user_id = $2';
      checkParams.push(userId);
    }

    const existingTransaction = await pool.query(checkQuery, checkParams);

    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    // Verify category exists and matches the transaction type
    const categoryResult = await pool.query(
      'SELECT id, type FROM categories WHERE id = $1',
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

    // Update transaction
    const result = await pool.query(
      `UPDATE transactions 
       SET amount = $1, type = $2, category_id = $3, description = $4, transaction_date = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, user_id, amount, type, description, transaction_date, updated_at`,
      [amount, type, category_id, description || null, transaction_date, transactionId]
    );

    const updatedTransaction = result.rows[0];

    // Clear relevant caches
    const transactionUserId = updatedTransaction.user_id;
    await clearTransactionCache(transactionUserId);
    await clearAnalyticsCache(transactionUserId);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: {
        transaction: {
          ...updatedTransaction,
          category_id
        }
      }
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete a transaction
const deleteTransaction = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if transaction exists and user has permission to delete it
    let checkQuery = 'SELECT user_id FROM transactions WHERE id = $1';
    let checkParams = [transactionId];

    if (req.user.role !== 'admin') {
      checkQuery += ' AND user_id = $2';
      checkParams.push(userId);
    }

    const existingTransaction = await pool.query(checkQuery, checkParams);

    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    const transactionUserId = existingTransaction.rows[0].user_id;

    // Delete transaction
    await pool.query('DELETE FROM transactions WHERE id = $1', [transactionId]);

    // Clear relevant caches
    await clearTransactionCache(transactionUserId);
    await clearAnalyticsCache(transactionUserId);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get transaction summary for a user
const getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const { start_date, end_date } = req.query;

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (start_date) {
      paramCount++;
      whereConditions.push(`transaction_date >= $${paramCount}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`transaction_date <= $${paramCount}`);
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const summaryQuery = `
      SELECT 
        type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions
      WHERE ${whereClause}
      GROUP BY type
    `;

    const result = await pool.query(summaryQuery, queryParams);

    const summary = {
      income: {
        count: 0,
        total: 0,
        average: 0,
        min: 0,
        max: 0
      },
      expense: {
        count: 0,
        total: 0,
        average: 0,
        min: 0,
        max: 0
      },
      net: 0
    };

    result.rows.forEach(row => {
      summary[row.type] = {
        count: parseInt(row.transaction_count),
        total: parseFloat(row.total_amount) || 0,
        average: parseFloat(row.average_amount) || 0,
        min: parseFloat(row.min_amount) || 0,
        max: parseFloat(row.max_amount) || 0
      };
    });

    summary.net = summary.income.total - summary.expense.total;

    res.json({
      success: true,
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('Get transaction summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  transactionValidation
};
