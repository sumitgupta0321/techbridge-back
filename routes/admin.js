const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/security');
const { cacheMiddleware } = require('../middleware/cache');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *         - type: object
 *           properties:
 *             statistics:
 *               type: object
 *               properties:
 *                 totalTransactions:
 *                   type: integer
 *                 incomeTransactions:
 *                   type: integer
 *                 expenseTransactions:
 *                   type: integer
 *                 totalIncome:
 *                   type: number
 *                 totalExpense:
 *                   type: number
 *                 netAmount:
 *                   type: number
 */

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Unique username
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password (must contain uppercase, lowercase, and number)
 *               role:
 *                 type: string
 *                 enum: [admin, user, read-only]
 *                 description: User role
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's last name
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 *       409:
 *         description: User already exists
 */
router.post('/users', authenticateToken, requireRole(['admin']), generalLimiter, createUserValidation, createUser);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user, read-only]
 *         description: Filter by user role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in username, email, first name, or last name
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Admin access required
 */
router.get('/users', authenticateToken, requireRole(['admin']), generalLimiter, cacheMiddleware(300), getUsers);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userStatistics:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         adminUsers:
 *                           type: integer
 *                         regularUsers:
 *                           type: integer
 *                         readonlyUsers:
 *                           type: integer
 *                         newUsersLastMonth:
 *                           type: integer
 *                     transactionStatistics:
 *                       type: object
 *                       properties:
 *                         totalTransactions:
 *                           type: integer
 *                         incomeTransactions:
 *                           type: integer
 *                         expenseTransactions:
 *                           type: integer
 *                         totalIncome:
 *                           type: number
 *                         totalExpense:
 *                           type: number
 *                         newTransactionsLastMonth:
 *                           type: integer
 *                     categoryStatistics:
 *                       type: object
 *                       properties:
 *                         totalCategories:
 *                           type: integer
 *                         incomeCategories:
 *                           type: integer
 *                         expenseCategories:
 *                           type: integer
 *                     mostActiveUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Admin access required
 */
router.get('/stats', authenticateToken, requireRole(['admin']), generalLimiter, cacheMiddleware(600), getSystemStats);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID with statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserWithStats'
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.get('/users/:id', authenticateToken, requireRole(['admin']), generalLimiter, cacheMiddleware(600), getUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user, read-only]
 *                 description: New role for the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role or cannot change own role
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.put('/users/:id/role', authenticateToken, requireRole(['admin']), generalLimiter, updateUserRole);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete own account
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', authenticateToken, requireRole(['admin']), generalLimiter, deleteUser);

/**
 * @swagger
 * /api/admin/users/{userId}/transactions:
 *   post:
 *     summary: Create transaction for a specific user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Target user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *               - category_id
 *               - transaction_date
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 description: Transaction amount
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 description: Transaction type
 *               category_id:
 *                 type: integer
 *                 minimum: 1
 *                 description: Category ID
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Transaction description
 *               transaction_date:
 *                 type: string
 *                 format: date
 *                 description: Date of transaction
 *     responses:
 *       201:
 *         description: Transaction created successfully for user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Transaction created successfully for user john_doe
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Transaction'
 *                         - type: object
 *                           properties:
 *                             username:
 *                               type: string
 *                               description: Target user's username
 *       400:
 *         description: Validation error or invalid category
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.post('/users/:userId/transactions', authenticateToken, requireRole(['admin']), generalLimiter, adminTransactionValidation, createTransactionForUser);

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all transactions from all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, category name, or username
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by transaction type
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [transaction_date, amount, type, category_name, username]
 *           default: transaction_date
 *         description: Sort by field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: All transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Transaction'
 *                           - type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 description: Username of transaction owner
 *                               user_first_name:
 *                                 type: string
 *                                 description: First name of transaction owner
 *                               user_last_name:
 *                                 type: string
 *                                 description: Last name of transaction owner
 *                               category_name:
 *                                 type: string
 *                                 description: Category name
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Admin access required
 */
router.get('/transactions', authenticateToken, requireRole(['admin']), generalLimiter, cacheMiddleware(300), getAllTransactions);

module.exports = router;
