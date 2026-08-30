import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT) || 3306,
	database: process.env.DB_NAME || 'homeschool_app',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	timezone: 'Z'
})

export default pool
