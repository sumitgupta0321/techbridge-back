const express = require('express');
const router = express.Router();
const {
  getMonthlyOverview,
  getYearlyOverview,
  getCategoryBreakdown,
  getTrends,
  getDashboardSummary
} = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const { analyticsLimiter } = require('../middleware/security');
const { cacheMiddleware } = require('../middleware/cache');

/**
 * @swagger
 * components:
 *   schemas:
 *     MonthlyData:
 *       type: object
 *       properties:
 *         month:
 *           type: integer
 *           description: Month number (1-12)
 *         monthName:
 *           type: string
 *           description: Month name
 *         income:
 *           type: number
 *           description: Total income for the month
 *         expense:
 *           type: number
 *           description: Total expense for the month
 *         net:
 *           type: number
 *           description: Net amount (income - expense)
 *         incomeCount:
 *           type: integer
 *           description: Number of income transactions
 *         expenseCount:
 *           type: integer
 *           description: Number of expense transactions
 *     CategoryBreakdown:
 *       type: object
 *       properties:
 *         categoryId:
 *           type: integer
 *         categoryName:
 *           type: string
 *         categoryColor:
 *           type: string
 *         categoryIcon:
 *           type: string
 *         totalAmount:
 *           type: number
 *         transactionCount:
 *           type: integer
 *         averageAmount:
 *           type: number
 *         minAmount:
 *           type: number
 *         maxAmount:
 *           type: number
 *         percentage:
 *           type: number
 *           description: Percentage of total amount
 */

/**
 * @swagger
 * /api/analytics/monthly:
 *   get:
 *     summary: Get monthly spending overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for the overview (defaults to current year)
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get data for specific user
 *     responses:
 *       200:
 *         description: Monthly overview retrieved successfully
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
 *                     year:
 *                       type: integer
 *                     monthlyOverview:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MonthlyData'
 */
router.get('/monthly', authenticateToken, analyticsLimiter, cacheMiddleware(900), getMonthlyOverview);

/**
 * @swagger
 * /api/analytics/yearly:
 *   get:
 *     summary: Get yearly spending overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get data for specific user
 *     responses:
 *       200:
 *         description: Yearly overview retrieved successfully
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
 *                     yearlyOverview:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: integer
 *                           income:
 *                             type: number
 *                           expense:
 *                             type: number
 *                           net:
 *                             type: number
 *                           incomeCount:
 *                             type: integer
 *                           expenseCount:
 *                             type: integer
 */
router.get('/yearly', authenticateToken, analyticsLimiter, cacheMiddleware(900), getYearlyOverview);

/**
 * @swagger
 * /api/analytics/categories:
 *   get:
 *     summary: Get category-wise breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *           default: expense
 *         description: Transaction type for breakdown
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get data for specific user
 *     responses:
 *       200:
 *         description: Category breakdown retrieved successfully
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
 *                     type:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     categoryBreakdown:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategoryBreakdown'
 */
router.get('/categories', authenticateToken, analyticsLimiter, cacheMiddleware(900), getCategoryBreakdown);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get income vs expense trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *         description: Time period for trends
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get data for specific user
 *     responses:
 *       200:
 *         description: Trends retrieved successfully
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
 *                     period:
 *                       type: string
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           income:
 *                             type: number
 *                           expense:
 *                             type: number
 *                           net:
 *                             type: number
 *                           incomeCount:
 *                             type: integer
 *                           expenseCount:
 *                             type: integer
 */
router.get('/trends', authenticateToken, analyticsLimiter, cacheMiddleware(900), getTrends);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard summary with recent transactions and top categories
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Time period for summary
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only - get data for specific user
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
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
 *                     period:
 *                       type: string
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
 *                         expense:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: integer
 *                             total:
 *                               type: number
 *                             average:
 *                               type: number
 *                         net:
 *                           type: number
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     topCategories:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/dashboard', authenticateToken, analyticsLimiter, cacheMiddleware(900), getDashboardSummary);

module.exports = router;
