/**
 * Utility functions for the Personal Finance Tracker API
 */

/**
 * Format currency amount for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date for display
 * @param {Date|string} date - The date to format
 * @param {string} locale - Locale string (default: en-US)
 * @returns {string} Formatted date string
 */
const formatDate = (date, locale = 'en-US') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculate percentage of total
 * @param {number} amount - The amount
 * @param {number} total - The total amount
 * @returns {number} Percentage (0-100)
 */
const calculatePercentage = (amount, total) => {
  if (total === 0) return 0;
  return Math.round((amount / total) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Generate random color for categories
 * @returns {string} Hex color code
 */
const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate cache key for Redis
 * @param {string} prefix - Cache key prefix
 * @param {string|number} identifier - Unique identifier
 * @param {object} params - Additional parameters
 * @returns {string} Cache key
 */
const generateCacheKey = (prefix, identifier, params = {}) => {
  const paramString = Object.keys(params).length > 0 
    ? ':' + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
    : '';
  return `${prefix}:${identifier}${paramString}`;
};

/**
 * Sanitize string for database storage
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

/**
 * Calculate date range for analytics
 * @param {string} period - Period type (week, month, year)
 * @returns {object} Start and end dates
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate = new Date();

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getFullYear(), 0, 1); // Default to current year
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Paginate results
 * @param {Array} items - Items to paginate
 * @param {number} page - Current page (1-based)
 * @param {number} limit - Items per page
 * @returns {object} Paginated results with metadata
 */
const paginate = (items, page = 1, limit = 10) => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    }
  };
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

module.exports = {
  formatCurrency,
  formatDate,
  calculatePercentage,
  generateRandomColor,
  isValidEmail,
  generateCacheKey,
  sanitizeString,
  getDateRange,
  paginate,
  deepClone,
  debounce,
  isEmpty
};
