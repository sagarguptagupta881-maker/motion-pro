// // lib/database.ts
// import mysql from 'mysql2/promise';

// export interface DatabaseConfig {
//   host: string;
//   user: string;
//   password: string;
//   database: string;
//   port: number;
//   // Remove invalid options for mysql2
// }

// let connection: mysql.Connection | null = null;

// const dbConfig: DatabaseConfig = {
//   host: 'auth-db981.hstgr.io',
//   user: 'u925328211_server',
//   password: 'Aman123@f24tech24',
//   database: 'u925328211_server',
//   port: 3306, // Remove parseInt wrapper
//   // Remove these invalid options:
//   // connectionLimit, acquireTimeout, timeout, reconnect
// };

// export async function getConnection(): Promise<mysql.Connection> {
//   if (!connection) {
//     try {
//       connection = await mysql.createConnection(dbConfig);
//       console.log('Database connected successfully');
//     } catch (error) {
//       console.error('Database connection failed:', error);
//       throw error;
//     }
//   }
//   return connection;
// }

// // Auto-setup database and tables
// export async function setupDatabase(): Promise<mysql.Connection> {
//   let tempConnection: mysql.Connection | null = null;
  
//   try {
//     // Connect without specifying database to create it if needed
//     const tempConfig = { ...dbConfig };
//     delete (tempConfig as any).database;
    
//     tempConnection = await mysql.createConnection(tempConfig);
    
//     // Create database if not exists
//     await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
//     console.log(`Database ${dbConfig.database} created or already exists`);
    
//     // Close temp connection and create main connection
//     await tempConnection.end();
//     connection = await mysql.createConnection(dbConfig);
    
//     // Create all required tables
//     await createAuthTables();
//     await createWorkspaceTables();
//     await seedInitialData();
    
//     console.log('✅ All tables created and initial data seeded successfully');
//     return connection;
    
//   } catch (error) {
//     console.error('❌ Database setup failed:', error);
//     if (tempConnection) {
//       await tempConnection.end();
//     }
//     throw error;
//   }
// }

// // Create authentication-related tables
// async function createAuthTables(): Promise<void> {
//   const db = await getConnection();

//   // Create users table
//   const createUsersTable = `
//     CREATE TABLE IF NOT EXISTS users (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       name VARCHAR(255) NOT NULL,
//       email VARCHAR(255) UNIQUE NOT NULL,
//       phone VARCHAR(20),
//       password VARCHAR(255) NOT NULL,
//       email_verified BOOLEAN DEFAULT FALSE,
//       reset_token VARCHAR(255),
//       reset_token_expires DATETIME,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       INDEX idx_email (email),
//       INDEX idx_reset_token (reset_token)
//     )
//   `;
  
//   await db.execute(createUsersTable);
//   console.log('✅ Users table created or already exists');
  
//   // Create OTP table
//   const createOtpTable = `
//     CREATE TABLE IF NOT EXISTS otps (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       email VARCHAR(255) NOT NULL,
//       otp VARCHAR(10) NOT NULL,
//       type ENUM('verification', 'password_reset') DEFAULT 'verification',
//       expires_at DATETIME NOT NULL,
//       used BOOLEAN DEFAULT FALSE,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       INDEX idx_email_type (email, type),
//       INDEX idx_expires (expires_at)
//     )
//   `;
  
//   await db.execute(createOtpTable);
//   console.log('✅ OTP table created or already exists');
  
//   // Create sessions table
//   const createSessionsTable = `
//     CREATE TABLE IF NOT EXISTS sessions (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       user_id INT NOT NULL,
//       session_token VARCHAR(255) UNIQUE NOT NULL,
//       expires_at DATETIME NOT NULL,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//       INDEX idx_session_token (session_token),
//       INDEX idx_user_id (user_id)
//     )
//   `;
  
//   await db.execute(createSessionsTable);
//   console.log('✅ Sessions table created or already exists');

//   // Create login attempts table
//   const createLoginAttemptTable = `
//     CREATE TABLE IF NOT EXISTS login_attempts (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       email VARCHAR(255) NOT NULL,
//       ip_address VARCHAR(45) NOT NULL,
//       success BOOLEAN NOT NULL,
//       attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       INDEX idx_email (email),
//       INDEX idx_ip_address (ip_address)
//     )
//   `;
  
//   await db.execute(createLoginAttemptTable);
//   console.log('✅ Login attempts table created or already exists');
// }

// // Create Motion-Pro workspace-related tables
// async function createWorkspaceTables(): Promise<void> {
//   const db = await getConnection();

//   // Create workspaces table
//   const createWorkspacesTable = `
//     CREATE TABLE IF NOT EXISTS workspaces (
//       id VARCHAR(36) PRIMARY KEY,
//       name VARCHAR(255) NOT NULL,
//       description TEXT,
//       owner_id INT,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
//       INDEX idx_owner_id (owner_id)
//     )
//   `;
  
//   await db.execute(createWorkspacesTable);
//   console.log('✅ Workspaces table created or already exists');

//   // Create workspace members table
//   const createWorkspaceMembersTable = `
//     CREATE TABLE IF NOT EXISTS workspace_members (
//       id VARCHAR(36) PRIMARY KEY,
//       workspace_id VARCHAR(36) NOT NULL,
//       name VARCHAR(255) NOT NULL,
//       email VARCHAR(255) NOT NULL,
//       avatar TEXT,
//       role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
//       UNIQUE KEY unique_workspace_email (workspace_id, email),
//       INDEX idx_workspace_id (workspace_id),
//       INDEX idx_email (email)
//     )
//   `;
  
//   await db.execute(createWorkspaceMembersTable);
//   console.log('✅ Workspace members table created or already exists');

//   // Create sections table
//   const createSectionsTable = `
//     CREATE TABLE IF NOT EXISTS sections (
//       id VARCHAR(36) PRIMARY KEY,
//       workspace_id VARCHAR(36) NOT NULL,
//       title VARCHAR(255) NOT NULL,
//       icon VARCHAR(50) NOT NULL DEFAULT '📁',
//       section_order INT NOT NULL DEFAULT 1,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
//       INDEX idx_workspace_id (workspace_id),
//       INDEX idx_order (section_order)
//     )
//   `;
  
//   await db.execute(createSectionsTable);
//   console.log('✅ Sections table created or already exists');

//   // Create subsections table
//   const createSubsectionsTable = `
//     CREATE TABLE IF NOT EXISTS subsections (
//       id VARCHAR(36) PRIMARY KEY,
//       section_id VARCHAR(36) NOT NULL,
//       title VARCHAR(255) NOT NULL,
//       subsection_order INT NOT NULL DEFAULT 1,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
//       INDEX idx_section_id (section_id),
//       INDEX idx_order (subsection_order)
//     )
//   `;
  
//   await db.execute(createSubsectionsTable);
//   console.log('✅ Subsections table created or already exists');

//   // Create pages table
//   const createPagesTable = `
//     CREATE TABLE IF NOT EXISTS pages (
//       id VARCHAR(36) PRIMARY KEY,
//       workspace_id VARCHAR(36) NOT NULL,
//       section_id VARCHAR(36),
//       subsection_id VARCHAR(36),
//       title VARCHAR(255) NOT NULL,
//       icon VARCHAR(50) NOT NULL DEFAULT '📄',
//       type ENUM('page', 'database') DEFAULT 'page',
//       status ENUM('Management', 'Execution', 'Inbox'),
//       assignees JSON,
//       deadline VARCHAR(50),
//       properties JSON,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
//       FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
//       FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE,
//       INDEX idx_workspace_id (workspace_id),
//       INDEX idx_section_id (section_id),
//       INDEX idx_subsection_id (subsection_id),
//       INDEX idx_type (type),
//       INDEX idx_status (status)
//     )
//   `;
  
//   await db.execute(createPagesTable);
//   console.log('✅ Pages table created or already exists');

//   // Create content blocks table
//   const createContentBlocksTable = `
//     CREATE TABLE IF NOT EXISTS content_blocks (
//       id VARCHAR(36) PRIMARY KEY,
//       page_id VARCHAR(36) NOT NULL,
//       type ENUM('text', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'quote', 'code', 'divider', 'image', 'table', 'checklist') NOT NULL,
//       content TEXT NOT NULL DEFAULT '',
//       metadata JSON,
//       block_order INT NOT NULL DEFAULT 0,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
//       INDEX idx_page_id (page_id),
//       INDEX idx_order (block_order),
//       INDEX idx_type (type)
//     )
//   `;
  
//   await db.execute(createContentBlocksTable);
//   console.log('✅ Content blocks table created or already exists');

//   // Create comments table
//   const createCommentsTable = `
//     CREATE TABLE IF NOT EXISTS comments (
//       id VARCHAR(36) PRIMARY KEY,
//       page_id VARCHAR(36) NOT NULL,
//       user_id VARCHAR(36) NOT NULL,
//       content TEXT NOT NULL,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//       FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
//       FOREIGN KEY (user_id) REFERENCES workspace_members(id) ON DELETE CASCADE,
//       INDEX idx_page_id (page_id),
//       INDEX idx_user_id (user_id),
//       INDEX idx_created_at (created_at)
//     )
//   `;
  
//   await db.execute(createCommentsTable);
//   console.log('✅ Comments table created or already exists');
// }

// // Seed initial data for Motion-Pro
// async function seedInitialData(): Promise<void> {
//   const db = await getConnection();
  
//   try {
//     // Check if workspace already exists
//     const [existingWorkspaces] = await db.execute(
//       'SELECT id FROM workspaces LIMIT 1'
//     ) as any[];
    
//     if (existingWorkspaces.length > 0) {
//       console.log('📦 Database already seeded with initial data');
//       return;
//     }

//     console.log('🌱 Seeding initial Motion-Pro data...');
    
//     // Create default workspace with fixed ID
//     const workspaceId = 'default-workspace';
//     await db.execute(
//       'INSERT INTO workspaces (id, name, description) VALUES (?, ?, ?)',
//       [workspaceId, 'Motion-Pro Workspace', 'Default workspace for Motion-Pro dashboard']
//     );
//     console.log('✅ Default workspace created');

//     // Create workspace members
//     const member1Id = generateUUID();
//     const member2Id = generateUUID();
    
//     await db.execute(`
//       INSERT INTO workspace_members (id, workspace_id, name, email, role) VALUES 
//       (?, ?, 'Allan', 'allan@motionpro.com', 'owner'),
//       (?, ?, 'Sagar Gupta', 'sagar@motionpro.com', 'admin')
//     `, [member1Id, workspaceId, member2Id, workspaceId]);
//     console.log('✅ Default workspace members created');

//     // Create sections
//     const sections = [
//       { id: generateUUID(), title: 'Company Overview', icon: '🏢', order: 1 },
//       { id: generateUUID(), title: 'Marketing', icon: '📈', order: 2 },
//       { id: generateUUID(), title: 'BD & Sales', icon: '💼', order: 3 },
//       { id: generateUUID(), title: 'HR & Operation', icon: '👥', order: 4 }
//     ];

//     for (const section of sections) {
//       await db.execute(
//         'INSERT INTO sections (id, workspace_id, title, icon, section_order) VALUES (?, ?, ?, ?, ?)',
//         [section.id, workspaceId, section.title, section.icon, section.order]
//       );

//       // Create default subsections for each section
//       const subsections = [
//         { id: generateUUID(), title: 'Management', order: 1 },
//         { id: generateUUID(), title: 'Execution', order: 2 },
//         { id: generateUUID(), title: 'Inbox', order: 3 }
//       ];

//       for (const subsection of subsections) {
//         await db.execute(
//           'INSERT INTO subsections (id, section_id, title, subsection_order) VALUES (?, ?, ?, ?)',
//           [subsection.id, section.id, subsection.title, subsection.order]
//         );
//       }
//     }
//     console.log('✅ Default sections and subsections created');

//     // Create sample pages
//     const companyOverviewSection = sections[0];
//     const marketingSection = sections[1];
    
//     // Get marketing subsections
//     const [marketingSubsections] = await db.execute(
//       'SELECT id, title FROM subsections WHERE section_id = ? ORDER BY subsection_order',
//       [marketingSection.id]
//     ) as any[];

//     const managementSubsection = marketingSubsections.find((sub: any) => sub.title === 'Management');

//     const pages = [
//       {
//         id: generateUUID(),
//         sectionId: companyOverviewSection.id,
//         title: 'Company Overview',
//         icon: '📋',
//         type: 'page'
//       },
//       {
//         id: generateUUID(),
//         sectionId: marketingSection.id,
//         subsectionId: managementSubsection?.id,
//         title: 'Personal Branding // Allan & Sagar',
//         icon: '👤',
//         type: 'database',
//         status: 'Management',
//         assignees: JSON.stringify(['Allan', 'Sagar Gupta'])
//       }
//     ];

//     for (const page of pages) {
//       await db.execute(`
//         INSERT INTO pages (id, workspace_id, section_id, subsection_id, title, icon, type, status, assignees) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `, [
//         page.id,
//         workspaceId,
//         page.sectionId,
//         page.subsectionId || null,
//         page.title,
//         page.icon,
//         page.type,
//         (page as any).status || null,
//         (page as any).assignees || null
//       ]);
//     }
//     console.log('✅ Sample pages created');

//     console.log('🎉 Initial data seeding completed successfully');
    
//   } catch (error) {
//     console.error('❌ Failed to seed initial data:', error);
//     throw error;
//   }
// }

// // Utility function to generate UUID (for MySQL compatibility)
// function generateUUID(): string {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//     const r = Math.random() * 16 | 0;
//     const v = c === 'x' ? r : (r & 0x3 | 0x8);
//     return v.toString(16);
//   });
// }

// // Initialize database on startup
// export async function initializeDatabase(): Promise<void> {
//   try {
//     console.log('🚀 Initializing Motion-Pro database...');
//     await setupDatabase();
//     console.log('✅ Database initialized successfully');
//   } catch (error) {
//     console.error('❌ Database initialization failed:', error);
//     if (process.env.NODE_ENV === 'development') {
//       throw error;
//     }
//   }
// }

// // Cleanup expired records
// export async function cleanupExpiredRecords(): Promise<void> {
//   const db = await getConnection();
  
//   try {
//     await db.execute('DELETE FROM otps WHERE expires_at < NOW()');
//     await db.execute('DELETE FROM sessions WHERE expires_at < NOW()');
//     console.log('✅ Expired records cleaned up');
//   } catch (error) {
//     console.error('❌ Cleanup failed:', error);
//   }
// }

// // Auto-initialize in development
// if (process.env.NODE_ENV === 'development') {
//   initializeDatabase();
// }

// lib/database.ts
// lib/database.ts
import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

let connection: mysql.Connection | null = null;

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'auth-db981.hstgr.io',
  user: process.env.DB_USER || 'u925328211_server',
  password: process.env.DB_PASSWORD || 'Aman123@f24tech24',
  database: process.env.DB_NAME || 'u925328211_server',
  port: parseInt(process.env.DB_PORT || '3306'),
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

// Migration function to add missing columns to existing tables
export async function migrateExistingTables(): Promise<void> {
  const db = await getConnection();
  
  try {
    console.log('🔄 Checking for required database migrations...');
    
    // Check if parent_id column exists in pages table
    const [parentIdColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'parent_id'
    `, [dbConfig.database]) as any[];
    
    if (parentIdColumns.length === 0) {
      console.log('➕ Adding parent_id column to pages table...');
      await db.execute(`
        ALTER TABLE pages 
        ADD COLUMN parent_id VARCHAR(36) DEFAULT NULL AFTER subsection_id
      `);
      
      // Add index for parent_id
      await db.execute(`
        ALTER TABLE pages 
        ADD INDEX idx_parent_id (parent_id)
      `);
      
      // Add foreign key constraint
      await db.execute(`
        ALTER TABLE pages 
        ADD CONSTRAINT fk_pages_parent 
        FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
      `);
      
      console.log('✅ parent_id column added successfully');
    } else {
      console.log('✅ parent_id column already exists');
    }
    
    // Check if page_order column exists in pages table
    const [orderColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'page_order'
    `, [dbConfig.database]) as any[];
    
    if (orderColumns.length === 0) {
      console.log('➕ Adding page_order column to pages table...');
      await db.execute(`
        ALTER TABLE pages 
        ADD COLUMN page_order INT NOT NULL DEFAULT 0 AFTER properties
      `);
      
      // Add index for page_order
      await db.execute(`
        ALTER TABLE pages 
        ADD INDEX idx_page_order (page_order)
      `);
      
      console.log('✅ page_order column added successfully');
    } else {
      console.log('✅ page_order column already exists');
    }
    
    // Check if page_files table exists
    const [pageFilesTables] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'page_files'
    `, [dbConfig.database]) as any[];
    
    if (pageFilesTables.length === 0) {
      console.log('➕ Creating page_files table...');
      const createPageFilesTable = `
        CREATE TABLE page_files (
          id VARCHAR(36) PRIMARY KEY,
          page_id VARCHAR(36) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          stored_name VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_path TEXT NOT NULL,
          uploaded_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES workspace_members(id) ON DELETE SET NULL,
          INDEX idx_page_id (page_id),
          INDEX idx_original_name (original_name),
          INDEX idx_uploaded_by (uploaded_by)
        )
      `;
      
      await db.execute(createPageFilesTable);
      console.log('✅ page_files table created successfully');
    } else {
      console.log('✅ page_files table already exists');
    }
    
    console.log('🎉 Database migration completed successfully');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
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
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`Database ${dbConfig.database} created or already exists`);
    
    // Close temp connection and create main connection
    await tempConnection.end();
    connection = await mysql.createConnection(dbConfig);
    
    // Create all required tables
    await createAuthTables();
    await createWorkspaceTables();
    await ensureDefaultWorkspace();
    
    console.log('✅ All tables created and default workspace ensured');
    return connection;
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    if (tempConnection) {
      await tempConnection.end();
    }
    throw error;
  }
}

// Create authentication-related tables
async function createAuthTables(): Promise<void> {
  const db = await getConnection();

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
  
  await db.execute(createUsersTable);
  console.log('✅ Users table created or already exists');
  
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
  
  await db.execute(createOtpTable);
  console.log('✅ OTP table created or already exists');
  
  // Create sessions table
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
  
  await db.execute(createSessionsTable);
  console.log('✅ Sessions table created or already exists');

  // Create login attempts table
  const createLoginAttemptTable = `
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      success BOOLEAN NOT NULL,
      attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_ip_address (ip_address)
    )
  `;
  
  await db.execute(createLoginAttemptTable);
  console.log('✅ Login attempts table created or already exists');
}

// Create Motion-Pro workspace-related tables
async function createWorkspaceTables(): Promise<void> {
  const db = await getConnection();

  // Create workspaces table
  const createWorkspacesTable = `
    CREATE TABLE IF NOT EXISTS workspaces (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      owner_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_owner_id (owner_id)
    )
  `;
  
  await db.execute(createWorkspacesTable);
  console.log('✅ Workspaces table created or already exists');

  // Create workspace members table
  const createWorkspaceMembersTable = `
    CREATE TABLE IF NOT EXISTS workspace_members (
      id VARCHAR(36) PRIMARY KEY,
      workspace_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      avatar TEXT,
      role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      UNIQUE KEY unique_workspace_email (workspace_id, email),
      INDEX idx_workspace_id (workspace_id),
      INDEX idx_email (email)
    )
  `;
  
  await db.execute(createWorkspaceMembersTable);
  console.log('✅ Workspace members table created or already exists');

  // Create sections table
  const createSectionsTable = `
    CREATE TABLE IF NOT EXISTS sections (
      id VARCHAR(36) PRIMARY KEY,
      workspace_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      icon VARCHAR(50) NOT NULL DEFAULT '📁',
      section_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      INDEX idx_workspace_id (workspace_id),
      INDEX idx_order (section_order)
    )
  `;
  
  await db.execute(createSectionsTable);
  console.log('✅ Sections table created or already exists');

  // Create subsections table
  const createSubsectionsTable = `
    CREATE TABLE IF NOT EXISTS subsections (
      id VARCHAR(36) PRIMARY KEY,
      section_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subsection_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      INDEX idx_section_id (section_id),
      INDEX idx_order (subsection_order)
    )
  `;
  
  await db.execute(createSubsectionsTable);
  console.log('✅ Subsections table created or already exists');

  // Create pages table with nested page support
  const createPagesTable = `
    CREATE TABLE IF NOT EXISTS pages (
      id VARCHAR(36) PRIMARY KEY,
      workspace_id VARCHAR(36) NOT NULL,
      section_id VARCHAR(36),
      subsection_id VARCHAR(36),
      parent_id VARCHAR(36), -- For nested pages
      title VARCHAR(255) NOT NULL,
      icon VARCHAR(50) NOT NULL DEFAULT '📄',
      type ENUM('page', 'database') DEFAULT 'page',
      status ENUM('Management', 'Execution', 'Inbox'),
      assignees JSON,
      deadline VARCHAR(50),
      properties JSON,
      page_order INT NOT NULL DEFAULT 0, -- For ordering pages within same parent
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE, -- Self-referencing for nesting
      INDEX idx_workspace_id (workspace_id),
      INDEX idx_section_id (section_id),
      INDEX idx_subsection_id (subsection_id),
      INDEX idx_parent_id (parent_id), -- For nested page queries
      INDEX idx_page_order (page_order), -- For ordering
      INDEX idx_type (type),
      INDEX idx_status (status)
    )
  `;
  
  await db.execute(createPagesTable);
  console.log('✅ Pages table created or already exists');

  // Create content blocks table
  const createContentBlocksTable = `
    CREATE TABLE IF NOT EXISTS content_blocks (
      id VARCHAR(36) PRIMARY KEY,
      page_id VARCHAR(36) NOT NULL,
      type ENUM('text', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'quote', 'code', 'divider', 'image', 'table', 'checklist') NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      metadata JSON,
      block_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      INDEX idx_page_id (page_id),
      INDEX idx_order (block_order),
      INDEX idx_type (type)
    )
  `;
  
  await db.execute(createContentBlocksTable);
  console.log('✅ Content blocks table created or already exists');

  // Create comments table
  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(36) PRIMARY KEY,
      page_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES workspace_members(id) ON DELETE CASCADE,
      INDEX idx_page_id (page_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    )
  `;
  
  await db.execute(createCommentsTable);
  console.log('✅ Comments table created or already exists');

  // Create page_files table for tracking file attachments
  const createPageFilesTable = `
    CREATE TABLE IF NOT EXISTS page_files (
      id VARCHAR(36) PRIMARY KEY,
      page_id VARCHAR(36) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES workspace_members(id) ON DELETE SET NULL,
      INDEX idx_page_id (page_id),
      INDEX idx_original_name (original_name),
      INDEX idx_uploaded_by (uploaded_by)
    )
  `;
  
  await db.execute(createPageFilesTable);
  console.log('✅ Page files table created or already exists');
}

// Ensure default workspace exists
export async function ensureDefaultWorkspace(): Promise<void> {
  const db = await getConnection();
  
  try {
    const workspaceId = 'default-workspace';
    
    // Check if default workspace specifically exists
    const [existingWorkspace] = await db.execute(
      'SELECT id FROM workspaces WHERE id = ?',
      [workspaceId]
    ) as any[];
    
    if (existingWorkspace.length > 0) {
      console.log('📦 Default workspace already exists');
      return;
    }

    console.log('🌱 Creating default Motion-Pro workspace...');
    
    // Create default workspace with fixed ID
    await db.execute(
      'INSERT INTO workspaces (id, name, description) VALUES (?, ?, ?)',
      [workspaceId, 'Motion-Pro Workspace', 'Default workspace for Motion-Pro dashboard']
    );
    console.log('✅ Default workspace created');

    // Create workspace members
    const member1Id = generateUUID();
    const member2Id = generateUUID();
    
    await db.execute(`
      INSERT INTO workspace_members (id, workspace_id, name, email, role) VALUES 
      (?, ?, 'Allan', 'allan@motionpro.com', 'owner'),
      (?, ?, 'Sagar Gupta', 'sagar@motionpro.com', 'admin')
    `, [member1Id, workspaceId, member2Id, workspaceId]);
    console.log('✅ Default workspace members created');

    // Create sections
    const sections = [
      { id: generateUUID(), title: 'Company Overview', icon: '🏢', order: 1 },
      { id: generateUUID(), title: 'Marketing', icon: '📈', order: 2 },
      { id: generateUUID(), title: 'BD & Sales', icon: '💼', order: 3 },
      { id: generateUUID(), title: 'HR & Operation', icon: '👥', order: 4 }
    ];

    for (const section of sections) {
      await db.execute(
        'INSERT INTO sections (id, workspace_id, title, icon, section_order) VALUES (?, ?, ?, ?, ?)',
        [section.id, workspaceId, section.title, section.icon, section.order]
      );

      // Create default subsections for each section
      const subsections = [
        { id: generateUUID(), title: 'Management', order: 1 },
        { id: generateUUID(), title: 'Execution', order: 2 },
        { id: generateUUID(), title: 'Inbox', order: 3 }
      ];

      for (const subsection of subsections) {
        await db.execute(
          'INSERT INTO subsections (id, section_id, title, subsection_order) VALUES (?, ?, ?, ?)',
          [subsection.id, section.id, subsection.title, subsection.order]
        );
      }
    }
    console.log('✅ Default sections and subsections created');

    // Create sample pages
    const companyOverviewSection = sections[0];
    const marketingSection = sections[1];
    
    // Get marketing subsections
    const [marketingSubsections] = await db.execute(
      'SELECT id, title FROM subsections WHERE section_id = ? ORDER BY subsection_order',
      [marketingSection.id]
    ) as any[];

    const managementSubsection = marketingSubsections.find((sub: any) => sub.title === 'Management');

    const pages = [
      {
        id: generateUUID(),
        sectionId: companyOverviewSection.id,
        title: 'Company Overview',
        icon: '📋',
        type: 'page'
      },
      {
        id: generateUUID(),
        sectionId: marketingSection.id,
        subsectionId: managementSubsection?.id,
        title: 'Personal Branding // Allan & Sagar',
        icon: '👤',
        type: 'database',
        status: 'Management',
        assignees: JSON.stringify(['Allan', 'Sagar Gupta'])
      }
    ];

    for (const page of pages) {
      await db.execute(`
        INSERT INTO pages (id, workspace_id, section_id, subsection_id, title, icon, type, status, assignees) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        page.id,
        workspaceId,
        page.sectionId,
        page.subsectionId || null,
        page.title,
        page.icon,
        page.type,
        (page as any).status || null,
        (page as any).assignees || null
      ]);
    }
    console.log('✅ Sample pages created');

    console.log('🎉 Default workspace creation completed successfully');
    
  } catch (error) {
    console.error('❌ Failed to create default workspace:', error);
    throw error;
  }
}

// Utility function to generate UUID (for MySQL compatibility)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Connection pool management
export async function closeConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.end();
      connection = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = await getConnection();
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Initialize database on startup
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing Motion-Pro database...');
    await setupDatabase();
    await migrateExistingTables(); // Run migration after setup
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }
}

// Cleanup expired records
export async function cleanupExpiredRecords(): Promise<void> {
  const db = await getConnection();
  
  try {
    const [otpResult] = await db.execute('DELETE FROM otps WHERE expires_at < NOW()') as any[];
    const [sessionResult] = await db.execute('DELETE FROM sessions WHERE expires_at < NOW()') as any[];
    
    console.log(`✅ Cleaned up ${otpResult.affectedRows} expired OTPs and ${sessionResult.affectedRows} expired sessions`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  initializeDatabase();
}