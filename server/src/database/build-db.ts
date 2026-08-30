import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function buildDatabase() {
	if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
		console.error('❌ Error: Missing database environment variables in .env')
		process.exit(1)
	}

	const dbName = 'homeschool_app'
	console.log('🔄 Connecting to MySQL server...')

	// 1. Initial connection without selecting a database
	const initConnection = await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		port: Number(process.env.DB_PORT) || 3306
	})

	try {
		// 2. Drop and Recreate the database safely using explicit names
		console.log(`🧹 Dropping database ${dbName} if it exists...`)
		await initConnection.query(`DROP DATABASE IF EXISTS ${dbName};`)

		console.log(`🏗️ Creating database ${dbName}...`)
		await initConnection.query(`CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)

		// Close the initial setup connection
		await initConnection.end()

		// 3. Open a NEW connection that explicitly targets our newly created database
		console.log(`🔌 Reconnecting directly to ${dbName}...`)
		const appConnection = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			port: Number(process.env.DB_PORT) || 3306,
			database: dbName,
			multipleStatements: true
		})

		// 4. Read your app.sql file
		const sqlPath = path.join(__dirname, 'sql', 'app.sql')
		if (!fs.existsSync(sqlPath)) {
			throw new Error(`SQL file not found at path: ${sqlPath}`)
		}

		console.log('📖 Reading app.sql file...')
		let sqlScript = fs.readFileSync(sqlPath, 'utf8')

		// 5. Clean the script to remove database declarations and DELIMITER commands
		console.log('🧹 Cleaning SQL script for Node.js execution...')
		sqlScript = sqlScript
			// Remove database creation logic
			.replace(/DROP DATABASE IF EXISTS\s+homeschool_app;/i, '')
			.replace(/CREATE DATABASE IF NOT EXISTS\s+homeschool_app\s+CHARACTER SET\s+utf8mb4\s+COLLATE\s+utf8mb4_unicode_ci;/i, '')
			// Remove "DELIMITER $$" and "DELIMITER ;" commands entirely
			.replace(/DELIMITER\s+\$\$/gi, '')
			.replace(/DELIMITER\s+;/gi, '')
			// Replace instances of the custom delimiter "$$" inside the script back to standard ";"
			.replace(/\$\$/g, ';')

		console.log('🚀 Building application tables and triggers...')
		await appConnection.query(sqlScript)

		console.log('✅ Database build completed successfully!')
		await appConnection.end()
	} catch (error) {
		console.error('❌ Error building database:', error)
		process.exit(1)
	}
}

buildDatabase()
