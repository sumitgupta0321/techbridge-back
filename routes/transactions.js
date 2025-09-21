const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  transactionValidation
} = require('../controllers/transactionController');
const { authenticateToken, requireWriteAccess, requireOwnershipOrAdmin } = require('../middleware/auth');
const { transactionLimiter } = require('../middleware/security');
const { cacheMiddleware } = require('../middleware/cache');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Transaction ID
 *         user_id:
 *           type: integer
 *           description: User ID
 *         amount:
 *           type: number
 *           format: float
 *           description: Transaction amount
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: Transaction type
 *         description:
 *           type: string
 *           description: Transaction description
 *         transaction_date:
 *           type: string
 *           format: date
 *           description: Date of transaction
 *         category_id:
 *           type: integer
 *           description: Category ID
 *         category_name:
 *           type: string
 *           description: Category name
 *         category_color:
 *           type: string
 *           description: Category color
 *         category_icon:
 *           type: string
 *           description: Category icon
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     TransactionInput:
 *       type: object
 *       required:
 *         - amount
 *         - type
 *         - category_id
 *         - transaction_date
 *       properties:
 *         amount:
 *           type: number
 *           format: float
 *           minimum: 0.01
 *           description: Transaction amount
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: Transaction type
 *         category_id:
 *           type: integer
 *           minimum: 1
 *           description: Category ID
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Transaction description
 *         transaction_date:
 *           type: string
 *           format: date
 *           description: Date of transaction
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions for the authenticated user
 *     tags: [Transactions]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description and category name
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get transactions for specific user
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                         $ref: '#/components/schemas/Transaction'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 */
router.get('/', authenticateToken, transactionLimiter, cacheMiddleware(300), getTransactions);

/**
 * @swagger
 * /api/transactions/summary:
 *   get:
 *     summary: Get transaction summary statistics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Summary from this date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Summary until this date
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get summary for specific user
 *     responses:
 *       200:
 *         description: Transaction summary retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         income:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: integer
 *                             total:
 *                               type: number
 *                             average:
 *                               type: number
 *                             min:
 *                               type: number
 *                             max:
 *                               type: number
 *                         expense:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: integer
 *                             total:
 *                               type: number
 *                             average:
 *                               type: number
 *                             min:
 *                               type: number
 *                             max:
 *                               type: number
 *                         net:
 *                           type: number
 */
router.get('/summary', authenticateToken, transactionLimiter, cacheMiddleware(900), getTransactionSummary);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a specific transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
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
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', authenticateToken, transactionLimiter, cacheMiddleware(600), getTransaction);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/TransactionInput'
 *               - type: object
 *                 properties:
 *                   user_id:
 *                     type: integer
 *                     description: Admin only - create transaction for specific user (optional)
 *     responses:
 *       201:
 *         description: Transaction created successfully
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
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Read-only users cannot create transactions
 */
router.post('/', authenticateToken, requireWriteAccess, transactionLimiter, transactionValidation, createTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionInput'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Read-only users cannot update transactions
 *       404:
 *         description: Transaction not found
 */
router.put('/:id', authenticateToken, requireWriteAccess, transactionLimiter, transactionValidation, updateTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       403:
 *         description: Read-only users cannot delete transactions
 *       404:
 *         description: Transaction not found
 */
router.delete('/:id', authenticateToken, requireWriteAccess, transactionLimiter, deleteTransaction);

module.exports = router;
