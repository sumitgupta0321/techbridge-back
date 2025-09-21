const { pool } = require('../config/database');

const demoTransactions = [
  // Admin user transactions (user_id: 1)
  { user_id: 1, category_id: 1, amount: 5000.00, type: 'income', description: 'Monthly salary', transaction_date: '2024-01-15' },
  { user_id: 1, category_id: 2, amount: 800.00, type: 'income', description: 'Freelance project', transaction_date: '2024-01-20' },
  { user_id: 1, category_id: 5, amount: 450.00, type: 'expense', description: 'Grocery shopping', transaction_date: '2024-01-16' },
  { user_id: 1, category_id: 6, amount: 120.00, type: 'expense', description: 'Gas and parking', transaction_date: '2024-01-17' },
  { user_id: 1, category_id: 7, amount: 200.00, type: 'expense', description: 'Clothing shopping', transaction_date: '2024-01-18' },
  { user_id: 1, category_id: 9, amount: 350.00, type: 'expense', description: 'Electricity and internet', transaction_date: '2024-01-19' },
  
  // Test user transactions (user_id: 2)
  { user_id: 2, category_id: 1, amount: 3500.00, type: 'income', description: 'Salary', transaction_date: '2024-01-15' },
  { user_id: 2, category_id: 5, amount: 300.00, type: 'expense', description: 'Weekly groceries', transaction_date: '2024-01-16' },
  { user_id: 2, category_id: 6, amount: 80.00, type: 'expense', description: 'Bus pass', transaction_date: '2024-01-17' },
  { user_id: 2, category_id: 8, amount: 150.00, type: 'expense', description: 'Movie and dinner', transaction_date: '2024-01-18' },
  { user_id: 2, category_id: 10, amount: 200.00, type: 'expense', description: 'Doctor visit', transaction_date: '2024-01-19' },
  
  // Read-only user transactions (user_id: 3)
  { user_id: 3, category_id: 1, amount: 2800.00, type: 'income', description: 'Part-time job', transaction_date: '2024-01-15' },
  { user_id: 3, category_id: 5, amount: 250.00, type: 'expense', description: 'Food expenses', transaction_date: '2024-01-16' },
  { user_id: 3, category_id: 11, amount: 500.00, type: 'expense', description: 'Online course', transaction_date: '2024-01-17' },
  { user_id: 3, category_id: 12, amount: 300.00, type: 'expense', description: 'Weekend trip', transaction_date: '2024-01-18' }
];

const seedDemoData = async () => {
  try {
    console.log('Starting demo data seeding...');
    
    // Check if demo data already exists
    const existingTransactions = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const transactionCount = parseInt(existingTransactions.rows[0].count);
    
    if (transactionCount > 0) {
      console.log(`Found ${transactionCount} existing transactions. Skipping demo data seeding.`);
      console.log('To reseed demo data, first clear existing transactions or run with --force flag.');
      return;
    }
    
    // Insert demo transactions
    console.log('Inserting demo transactions...');
    for (const transaction of demoTransactions) {
      await pool.query(
        `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [transaction.user_id, transaction.category_id, transaction.amount, transaction.type, transaction.description, transaction.transaction_date]
      );
    }
    
    console.log(`✅ Successfully inserted ${demoTransactions.length} demo transactions`);
    console.log('\nDemo data summary:');
    console.log('- Admin user: 6 transactions (income + expenses)');
    console.log('- Test user: 5 transactions (income + expenses)');
    console.log('- Read-only user: 4 transactions (income + expenses)');
    console.log('\nYou can now test the API with realistic data!');
    
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  const forceFlag = process.argv.includes('--force');
  
  if (forceFlag) {
    console.log('⚠️  Force flag detected. Clearing existing transactions first...');
    pool.query('DELETE FROM transactions')
      .then(() => {
        console.log('Existing transactions cleared.');
        return seedDemoData();
      })
      .catch(console.error);
  } else {
    seedDemoData().catch(console.error);
  }
}

module.exports = { seedDemoData };
