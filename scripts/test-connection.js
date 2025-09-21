/**
 * Simple script to test database and Redis connections
 */

const { pool } = require('../config/database');
const { client, connectRedis } = require('../config/redis');

const testConnections = async () => {
  console.log('🔍 Testing connections...\n');

  // Test PostgreSQL connection
  try {
    console.log('📊 Testing PostgreSQL connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ PostgreSQL connected successfully');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error(`   ${error.message}\n`);
  }

  // Test Redis connection
  try {
    console.log('🔄 Testing Redis connection...');
    await connectRedis();
    
    // Test basic operations
    await client.set('test_key', 'test_value', { EX: 10 });
    const value = await client.get('test_key');
    
    if (value === 'test_value') {
      console.log('✅ Redis connected successfully');
      console.log('   Basic operations working correctly\n');
    } else {
      console.log('⚠️  Redis connected but operations may not be working correctly\n');
    }
    
    // Clean up test key
    await client.del('test_key');
    
  } catch (error) {
    console.error('❌ Redis connection failed:');
    console.error(`   ${error.message}\n`);
  }

  // Test environment variables
  console.log('🔧 Checking environment variables...');
  const requiredVars = ['DB_NAME', 'DB_USER', 'JWT_SECRET'];
  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set\n');
  } else {
    console.log('⚠️  Missing required environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('');
  }

  // Test database schema
  try {
    console.log('📋 Checking database schema...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'categories', 'transactions', 'budgets'];
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
      console.log(`   Tables found: ${existingTables.join(', ')}\n`);
    } else {
      console.log('⚠️  Missing database tables:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('   Run: npm run migrate\n');
    }
  } catch (error) {
    console.error('❌ Database schema check failed:');
    console.error(`   ${error.message}\n`);
  }

  // Check for demo data
  try {
    console.log('📈 Checking demo data...');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const transactionCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const categoryCount = await pool.query('SELECT COUNT(*) as count FROM categories');

    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Transactions: ${transactionCount.rows[0].count}`);
    console.log(`   Categories: ${categoryCount.rows[0].count}`);

    if (parseInt(userCount.rows[0].count) >= 3 && parseInt(categoryCount.rows[0].count) >= 10) {
      console.log('✅ Demo data appears to be loaded\n');
    } else {
      console.log('⚠️  Demo data may not be loaded. Run: npm run seed\n');
    }
  } catch (error) {
    console.error('❌ Demo data check failed:');
    console.error(`   ${error.message}\n`);
  }

  console.log('🎉 Connection test completed!');
  console.log('💡 If all tests passed, you can start the server with: npm run dev');

  // Close connections
  try {
    await pool.end();
    await client.quit();
  } catch (error) {
    // Ignore cleanup errors
  }
};

// Run the test
if (require.main === module) {
  testConnections().catch(console.error);
}

module.exports = { testConnections };
