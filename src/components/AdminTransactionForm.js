import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const AdminTransactionForm = ({ 
  transaction, 
  onSubmit, 
  onCancel, 
  isEdit = false 
}) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [formData, setFormData] = useState({
    user_id: '',
    type: 'expense',
    amount: '',
    category_id: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCategories();
  }, []);

  useEffect(() => {
    if (isEdit && transaction) {
      setFormData({
        user_id: transaction.user_id?.toString() || '',
        type: transaction.type,
        amount: transaction.amount.toString(),
        category_id: transaction.category_id?.toString() || '',
        description: transaction.description,
        transaction_date: transaction.transaction_date
      });
    }
  }, [isEdit, transaction]);

  const loadUsers = async () => {
    try {
      const response = await apiService.getAllUsers({ limit: 100 }); // Get all users
      if (response.success) {
        setUsers(response.data.users.filter(u => u.role !== 'admin' || u.id === currentUser.id));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategories();
      if (response.success) {
        setCategories(response.data.categories);
        // Set default category if not editing
        if (!isEdit && response.data.categories.length > 0) {
          const expenseCategories = response.data.categories.filter(c => c.type === 'expense');
          if (expenseCategories.length > 0) {
            setFormData(prev => ({ ...prev, category_id: expenseCategories[0].id.toString() }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // When type changes, update available categories
      if (name === 'type') {
        const filteredCategories = categories.filter(c => c.type === value);
        if (filteredCategories.length > 0) {
          newData.category_id = filteredCategories[0].id.toString();
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors, categories]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const transactionData = {
        amount: parseFloat(formData.amount),
        type: formData.type,
        category_id: parseInt(formData.category_id),
        description: formData.description,
        transaction_date: formData.transaction_date,
        user_id: parseInt(formData.user_id) // Admin can specify user_id
      };
      
      if (isEdit) {
        await onSubmit(transactionData, transaction.id);
      } else {
        await onSubmit(transactionData);
      }
      
      if (!isEdit) {
        // Reset form for new transactions
        const expenseCategories = categories.filter(c => c.type === 'expense');
        setFormData({
          user_id: '',
          type: 'expense',
          amount: '',
          category_id: expenseCategories.length > 0 ? expenseCategories[0].id.toString() : '',
          description: '',
          transaction_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, isEdit, transaction, categories]);

  const getSelectedUserName = () => {
    if (!formData.user_id) return '';
    const selectedUser = users.find(u => u.id === parseInt(formData.user_id));
    return selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : '';
  };

  // Only admins can use this form
  if (currentUser?.role !== 'admin') {
    return (
      <div className="access-denied">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loadingUsers || loadingCategories) {
    return (
      <div className="admin-transaction-form-container">
        <h3>{isEdit ? 'Edit Transaction' : 'Add Transaction for User'}</h3>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading form data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-transaction-form-container">
      <h3>
        {isEdit ? 'Edit Transaction' : 'Add Transaction for User'}
        {getSelectedUserName() && (
          <span className="selected-user"> - {getSelectedUserName()}</span>
        )}
      </h3>
      
      <form onSubmit={handleSubmit} className="admin-transaction-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="user_id">Select User</label>
            <select
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              disabled={isSubmitting || isEdit} // Can't change user when editing
              required
              className={errors.user_id ? 'error' : ''}
            >
              <option value="">Choose a user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username}) - {user.role}
                </option>
              ))}
            </select>
            {errors.user_id && <span className="error-message">{errors.user_id}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              className={errors.amount ? 'error' : ''}
              placeholder="0.00"
            />
            {errors.amount && <span className="error-message">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Category</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              className={errors.category_id ? 'error' : ''}
            >
              <option value="">Select a category...</option>
              {categories
                .filter(category => category.type === formData.type)
                .map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            {errors.category_id && <span className="error-message">{errors.category_id}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="transaction_date">Date</label>
            <input
              id="transaction_date"
              name="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              className={errors.transaction_date ? 'error' : ''}
            />
            {errors.transaction_date && <span className="error-message">{errors.transaction_date}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            rows="3"
            placeholder="Enter transaction description..."
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Add')} Transaction
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminTransactionForm;
