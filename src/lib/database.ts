// lib/database.ts
import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
}

let connection: mysql.Connection | null = null;

const dbConfig: DatabaseConfig = {
  host: 'auth-db981.hstgr.io',
  user: 'u925328211_server',
  password: 'Aman123@f24tech24',
  database: 'u925328211_server',
  port: parseInt('3306'),
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

export async function getConnection(): Promise<mysql.Connection> {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }
  return connection;
}

// Auto-setup database and tables
export async function setupDatabase(): Promise<mysql.Connection> {
  let tempConnection: mysql.Connection | null = null;
  
  try {
    // Connect without specifying database to create it if needed
    const tempConfig = { ...dbConfig };
    delete (tempConfig as any).database;
    
    tempConnection = await mysql.createConnection(tempConfig);
    
    // Create database if not exists
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Database ${dbConfig.database} created or already exists`);
    
    // Close temp connection and create main connection
    await tempConnection.end();
    connection = await mysql.createConnection(dbConfig);
    
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        reset_token VARCHAR(255),
        reset_token_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_reset_token (reset_token)
      )
    `;
    
    await connection.execute(createUsersTable);
    console.log('Users table created or already exists');
    
    // Create OTP table
    const createOtpTable = `
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        type ENUM('verification', 'password_reset') DEFAULT 'verification',
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_type (email, type),
        INDEX idx_expires (expires_at)
      )
    `;
    
    await connection.execute(createOtpTable);
    console.log('OTP table created or already exists');
    
    // Create sessions table for better session management
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_token (session_token),
        INDEX idx_user_id (user_id)
      )
    `;
    
    await connection.execute(createSessionsTable);
    console.log('Sessions table created or already exists');

    const createLoginAttemptTable = `
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        success BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createLoginAttemptTable);
    console.log('login_attempts table created or already exists');
    
    return connection;
    
  } catch (error) {
    console.error('Database setup failed:', error);
    if (tempConnection) {
      await tempConnection.end();
    }
    throw error;
  }
}

// Cleanup expired records
export async function cleanupExpiredRecords(): Promise<void> {
  const db = await getConnection();
  
  try {
    // Clean expired OTPs
    await db.execute('DELETE FROM otps WHERE expires_at < NOW()');
    
    // Clean expired sessions
    await db.execute('DELETE FROM sessions WHERE expires_at < NOW()');
    
    console.log('Expired records cleaned up');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}