const { pool } = require('../config/database');

// Get monthly spending overview
const getMonthlyOverview = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const query = `
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = $1 AND EXTRACT(YEAR FROM transaction_date) = $2
      GROUP BY EXTRACT(MONTH FROM transaction_date), type
      ORDER BY month
    `;

    const result = await pool.query(query, [userId, targetYear]);

    // Initialize all 12 months
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      monthlyData.push({
        month,
        monthName: new Date(targetYear, month - 1).toLocaleString('default', { month: 'long' }),
        income: 0,
        expense: 0,
        net: 0,
        incomeCount: 0,
        expenseCount: 0
      });
    }

    // Populate with actual data
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month) - 1;
      const amount = parseFloat(row.total_amount);
      const count = parseInt(row.transaction_count);

      if (row.type === 'income') {
        monthlyData[monthIndex].income = amount;
        monthlyData[monthIndex].incomeCount = count;
      } else {
        monthlyData[monthIndex].expense = amount;
        monthlyData[monthIndex].expenseCount = count;
      }
    });

    // Calculate net for each month
    monthlyData.forEach(month => {
      month.net = month.income - month.expense;
    });

    res.json({
      success: true,
      data: {
        year: targetYear,
        monthlyOverview: monthlyData
      }
    });

  } catch (error) {
    console.error('Get monthly overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get yearly spending overview
const getYearlyOverview = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const query = `
      SELECT 
        EXTRACT(YEAR FROM transaction_date) as year,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = $1
      GROUP BY EXTRACT(YEAR FROM transaction_date), type
      ORDER BY year DESC
    `;

    const result = await pool.query(query, [userId]);

    // Group by year
    const yearlyData = {};
    result.rows.forEach(row => {
      const year = parseInt(row.year);
      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          income: 0,
          expense: 0,
          net: 0,
          incomeCount: 0,
          expenseCount: 0
        };
      }

      const amount = parseFloat(row.total_amount);
      const count = parseInt(row.transaction_count);

      if (row.type === 'income') {
        yearlyData[year].income = amount;
        yearlyData[year].incomeCount = count;
      } else {
        yearlyData[year].expense = amount;
        yearlyData[year].expenseCount = count;
      }
    });

    // Calculate net and convert to array
    const yearlyOverview = Object.values(yearlyData).map(year => ({
      ...year,
      net: year.income - year.expense
    })).sort((a, b) => b.year - a.year);

    res.json({
      success: true,
      data: {
        yearlyOverview
      }
    });

  } catch (error) {
    console.error('Get yearly overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get category-wise expense breakdown
const getCategoryBreakdown = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const { type, start_date, end_date } = req.query;
    const transactionType = type || 'expense';

    let whereConditions = ['t.user_id = $1', 't.type = $2'];
    let queryParams = [userId, transactionType];
    let paramCount = 2;

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

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count,
        AVG(t.amount) as average_amount,
        MIN(t.amount) as min_amount,
        MAX(t.amount) as max_amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, queryParams);

    // Calculate total for percentage calculation
    const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

    const categoryBreakdown = result.rows.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      categoryIcon: row.category_icon,
      totalAmount: parseFloat(row.total_amount),
      transactionCount: parseInt(row.transaction_count),
      averageAmount: parseFloat(row.average_amount),
      minAmount: parseFloat(row.min_amount),
      maxAmount: parseFloat(row.max_amount),
      percentage: totalAmount > 0 ? ((parseFloat(row.total_amount) / totalAmount) * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        type: transactionType,
        totalAmount,
        categoryBreakdown
      }
    });

  } catch (error) {
    console.error('Get category breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get income vs expense trends
const getTrends = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const { period, start_date, end_date } = req.query;
    const trendPeriod = period || 'monthly'; // daily, weekly, monthly, yearly

    let dateFormat, dateExtract;
    switch (trendPeriod) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        dateExtract = 'transaction_date';
        break;
      case 'weekly':
        dateFormat = 'YYYY-"W"WW';
        dateExtract = 'DATE_TRUNC(\'week\', transaction_date)';
        break;
      case 'yearly':
        dateFormat = 'YYYY';
        dateExtract = 'EXTRACT(YEAR FROM transaction_date)';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        dateExtract = 'DATE_TRUNC(\'month\', transaction_date)';
        break;
    }

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

    const query = `
      SELECT 
        ${dateExtract} as period,
        TO_CHAR(${dateExtract}, '${dateFormat}') as period_label,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE ${whereClause}
      GROUP BY ${dateExtract}, type
      ORDER BY period
    `;

    const result = await pool.query(query, queryParams);

    // Group by period
    const trendsData = {};
    result.rows.forEach(row => {
      const periodLabel = row.period_label;
      if (!trendsData[periodLabel]) {
        trendsData[periodLabel] = {
          period: periodLabel,
          income: 0,
          expense: 0,
          net: 0,
          incomeCount: 0,
          expenseCount: 0
        };
      }

      const amount = parseFloat(row.total_amount);
      const count = parseInt(row.transaction_count);

      if (row.type === 'income') {
        trendsData[periodLabel].income = amount;
        trendsData[periodLabel].incomeCount = count;
      } else {
        trendsData[periodLabel].expense = amount;
        trendsData[periodLabel].expenseCount = count;
      }
    });

    // Calculate net and convert to array
    const trends = Object.values(trendsData).map(period => ({
      ...period,
      net: period.income - period.expense
    }));

    res.json({
      success: true,
      data: {
        period: trendPeriod,
        trends
      }
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.user_id ? 
      parseInt(req.query.user_id) : req.user.id;

    const { period } = req.query;
    let dateCondition = '';
    let queryParams = [userId];

    // Set date condition based on period
    switch (period) {
      case 'week':
        dateCondition = 'AND transaction_date >= CURRENT_DATE - INTERVAL \'7 days\'';
        break;
      case 'month':
        dateCondition = 'AND transaction_date >= CURRENT_DATE - INTERVAL \'30 days\'';
        break;
      case 'year':
        dateCondition = 'AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)';
        break;
      case 'all':
      default:
        dateCondition = '';
        break;
    }

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM transactions 
      WHERE user_id = $1 ${dateCondition}
      GROUP BY type
    `;

    const summaryResult = await pool.query(summaryQuery, queryParams);

    // Get recent transactions
    const recentTransactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.description,
        t.transaction_date,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 ${dateCondition}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 10
    `;

    const recentResult = await pool.query(recentTransactionsQuery, queryParams);

    // Get top categories
    const topCategoriesQuery = `
      SELECT 
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        t.type,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 ${dateCondition}
      GROUP BY c.id, c.name, c.color, c.icon, t.type
      ORDER BY total_amount DESC
      LIMIT 5
    `;

    const categoriesResult = await pool.query(topCategoriesQuery, queryParams);

    // Process summary data
    const summary = {
      income: { count: 0, total: 0, average: 0 },
      expense: { count: 0, total: 0, average: 0 },
      net: 0
    };

    summaryResult.rows.forEach(row => {
      summary[row.type] = {
        count: parseInt(row.transaction_count),
        total: parseFloat(row.total_amount) || 0,
        average: parseFloat(row.average_amount) || 0
      };
    });

    summary.net = summary.income.total - summary.expense.total;

    res.json({
      success: true,
      data: {
        period: period || 'all',
        summary,
        recentTransactions: recentResult.rows,
        topCategories: categoriesResult.rows.map(row => ({
          categoryName: row.category_name,
          categoryColor: row.category_color,
          categoryIcon: row.category_icon,
          type: row.type,
          totalAmount: parseFloat(row.total_amount),
          transactionCount: parseInt(row.transaction_count)
        }))
      }
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getMonthlyOverview,
  getYearlyOverview,
  getCategoryBreakdown,
  getTrends,
  getDashboardSummary
};
