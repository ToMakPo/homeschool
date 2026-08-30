import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import getTableOrder from './getTableOrder'

// Load environment variables from the .env file in the server root folder
dotenv.config({ path: path.join(__dirname, '../../.env') })

const seedFilePath = path.join(__dirname, 'seed-data.json')

// Helper function to convert ISO string dates to MySQL DATETIME format
function formatValue(value: any): any {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
		// Converts '2026-08-30T05:32:15.000Z' -> '2026-08-30 05:32:15'
		return value.replace('T', ' ').substring(0, 19)
	}
	return value
}

async function pushSeedData() {
	console.info(`Connecting to database as ${process.env.DB_ADMIN_USER || 'root'}...`)
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 3306,
		user: process.env.DB_ADMIN_USER || 'root',
		password: process.env.DB_ADMIN_PASSWORD || '',
		database: process.env.DB_NAME || 'homeschool_app'
	})

	try {
		if (!fs.existsSync(seedFilePath)) {
			throw new Error(`Seed file not found at ${seedFilePath}`)
		}

		console.info('Reading seed file...')
		const rawData = await fs.promises.readFile(seedFilePath, 'utf-8')
		const seedData: { tableName: string; data: any[] }[] = JSON.parse(rawData)

		const dependencyOrder = await getTableOrder()
		const reverseOrder = [...dependencyOrder].reverse()

		console.info('Clearing existing data in reverse dependency order...')
		await connection.query('SET FOREIGN_KEY_CHECKS = 0')

		for (const tableName of reverseOrder) {
			await connection.query(`TRUNCATE TABLE \`${tableName}\``)
		}

		console.info('Inserting seed data in dependency order...')
		for (const tableName of dependencyOrder) {
			const tablePayload = seedData.find(item => item.tableName === tableName)

			if (!tablePayload || !tablePayload.data || tablePayload.data.length === 0) {
				continue
			}

			console.info(`Inserting ${tablePayload.data.length} rows into ${tableName}...`)

			const columns = Object.keys(tablePayload.data[0])
			const escapedColumns = columns.map(col => `\`${col}\``).join(', ')
			const placeholders = columns.map(() => '?').join(', ')

			const sql = `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES (${placeholders})`

			for (const row of tablePayload.data) {
				// Sanitize and format date strings before pushing to the query values
				const values = columns.map(col => formatValue(row[col]))
				await connection.query(sql, values)
			}
		}

		console.info('Database seeding completed successfully!')
	} catch (error) {
		console.error('Error pushing seed file to database:', error)
		process.exit(1)
	} finally {
		try {
			await connection.query('SET FOREIGN_KEY_CHECKS = 1')
		} catch {}
		await connection.end()
	}
}

pushSeedData()
