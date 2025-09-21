const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { clearCache } = require('../middleware/cache');

// Validation rules for category
const categoryValidation = [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s&-_]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, &, -, and _'),
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code (e.g., #FF0000)'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon name must be less than 50 characters')
];

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { type } = req.query;

    let query = 'SELECT id, name, type, color, icon, created_at FROM categories';
    let queryParams = [];

    if (type && ['income', 'expense'].includes(type)) {
      query += ' WHERE type = $1';
      queryParams.push(type);
    }

    query += ' ORDER BY type, name';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: {
        categories: result.rows
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get a single category by ID
const getCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    const result = await pool.query(
      'SELECT id, name, type, color, icon, created_at FROM categories WHERE id = $1',
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: {
        category: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create a new category (admin only)
const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, type, color, icon } = req.body;

    // Check if category with this name already exists
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE name = $1',
      [name]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const result = await pool.query(
      `INSERT INTO categories (name, type, color, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, type, color, icon, created_at`,
      [name, type, color || null, icon || null]
    );

    const newCategory = result.rows[0];

    // Clear categories cache
    await clearCache('cache:*/categories*');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category: newCategory
      }
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update a category (admin only)
const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const categoryId = parseInt(req.params.id);
    const { name, type, color, icon } = req.body;

    // Check if category exists
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if another category with this name already exists
    const duplicateCategory = await pool.query(
      'SELECT id FROM categories WHERE name = $1 AND id != $2',
      [name, categoryId]
    );

    if (duplicateCategory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Another category with this name already exists'
      });
    }

    // Update category
    const result = await pool.query(
      `UPDATE categories 
       SET name = $1, type = $2, color = $3, icon = $4
       WHERE id = $5
       RETURNING id, name, type, color, icon, created_at`,
      [name, type, color || null, icon || null, categoryId]
    );

    const updatedCategory = result.rows[0];

    // Clear categories cache
    await clearCache('cache:*/categories*');

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: {
        category: updatedCategory
      }
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete a category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Check if category exists
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is being used in any transactions
    const transactionCount = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = $1',
      [categoryId]
    );

    if (parseInt(transactionCount.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete category that is being used in transactions'
      });
    }

    // Delete category
    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);

    // Clear categories cache
    await clearCache('cache:*/categories*');

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get category usage statistics (admin only)
const getCategoryStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.type,
        c.color,
        c.icon,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(AVG(t.amount), 0) as average_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id, c.name, c.type, c.color, c.icon
      ORDER BY transaction_count DESC, c.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: {
        categoryStats: result.rows.map(row => ({
          ...row,
          transaction_count: parseInt(row.transaction_count),
          total_amount: parseFloat(row.total_amount),
          average_amount: parseFloat(row.average_amount)
        }))
      }
    });

  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  categoryValidation
};
