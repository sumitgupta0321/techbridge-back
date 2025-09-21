const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Execute migrations step by step
    await createTables();
    await createIndexes();
    await createFunctions();
    await createTriggers();
    await insertDefaultData();
    
    console.log('Database migration completed successfully!');
    console.log('\nDefault users created:');
    console.log('Admin: admin@financetracker.com / admin123');
    console.log('User: user@test.com / admin123');
    console.log('Read-only: readonly@test.com / admin123');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createTables() {
  console.log('📋 Creating tables...');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'read-only')),
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
      color VARCHAR(7),
      icon VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount DECIMAL(12, 2) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
      description TEXT,
      transaction_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount DECIMAL(12, 2) NOT NULL,
      period VARCHAR(20) DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (let i = 0; i < tables.length; i++) {
    console.log(`  Creating table ${i + 1}/${tables.length}...`);
    await pool.query(tables[i]);
  }
  console.log('✅ Tables created successfully');
}

async function createIndexes() {
  console.log('🔍 Creating indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
  ];
  
  for (let i = 0; i < indexes.length; i++) {
    console.log(`  Creating index ${i + 1}/${indexes.length}...`);
    await pool.query(indexes[i]);
  }
  console.log('✅ Indexes created successfully');
}

async function createFunctions() {
  console.log('⚙️ Creating functions...');
  
  const functionSQL = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;
  
  await pool.query(functionSQL);
  console.log('✅ Functions created successfully');
}

async function createTriggers() {
  console.log('🔗 Creating triggers...');
  
  const triggers = [
    'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
  ];
  
  for (let i = 0; i < triggers.length; i++) {
    console.log(`  Creating trigger ${i + 1}/${triggers.length}...`);
    await pool.query(triggers[i]);
  }
  console.log('✅ Triggers created successfully');
}

async function insertDefaultData() {
  console.log('📊 Inserting default data...');
  
  // Insert categories
  const categories = [
    ['Salary', 'income', '#4CAF50', 'work'],
    ['Freelance', 'income', '#8BC34A', 'business'],
    ['Investment', 'income', '#CDDC39', 'trending_up'],
    ['Other Income', 'income', '#FFEB3B', 'attach_money'],
    ['Food & Dining', 'expense', '#F44336', 'restaurant'],
    ['Transportation', 'expense', '#E91E63', 'directions_car'],
    ['Shopping', 'expense', '#9C27B0', 'shopping_cart'],
    ['Entertainment', 'expense', '#673AB7', 'movie'],
    ['Bills & Utilities', 'expense', '#3F51B5', 'receipt'],
    ['Healthcare', 'expense', '#2196F3', 'local_hospital'],
    ['Education', 'expense', '#03A9F4', 'school'],
    ['Travel', 'expense', '#00BCD4', 'flight'],
    ['Insurance', 'expense', '#009688', 'security'],
    ['Savings', 'expense', '#4CAF50', 'savings'],
    ['Other Expense', 'expense', '#FF9800', 'category']
  ];
  
  for (const [name, type, color, icon] of categories) {
    await pool.query(
      'INSERT INTO categories (name, type, color, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
      [name, type, color, icon]
    );
  }
  console.log('  Categories inserted');
  
  // Insert default users (plain text passwords)
  const users = [
    ['admin', 'admin@financetracker.com', 'admin123', 'admin', 'Admin', 'User'],
    ['testuser', 'user@test.com', 'admin123', 'user', 'Test', 'User'],
    ['readonly', 'readonly@test.com', 'admin123', 'read-only', 'Read Only', 'User']
  ];
  
  for (const [username, email, password, role, first_name, last_name] of users) {
    await pool.query(
      'INSERT INTO users (username, email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
      [username, email, password, role, first_name, last_name]
    );
  }
  console.log('  Users inserted');
  console.log('✅ Default data inserted successfully');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations };
