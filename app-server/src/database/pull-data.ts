import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import getTableOrder from './getTableOrder'

// Load environment variables from the .env file in the server root folder
dotenv.config({ path: path.join(__dirname, '../../.env') })

const seedFilePath = path.join(__dirname, 'seed-data.json')

async function pullSeedData() {
	// Connect using your DB_ADMIN credentials from the .env file
	console.info(`Connecting to database as ${process.env.DB_ADMIN_USER || 'root'}...`)
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 3306,
		user: process.env.DB_ADMIN_USER || 'root',
		password: process.env.DB_ADMIN_PASSWORD || '',
		database: process.env.DB_NAME || 'homeschool_app'
	})

	try {
		console.info('Creating seed data...')

		const dependencyOrder = await getTableOrder()

		const seedData = await Promise.all(
			dependencyOrder.map(async tableName => {
				const data = await connection.query(`SELECT * FROM ${tableName}`).then(res => res[0] as any[])
				return { tableName, data }
			})
		)

		await fs.promises.writeFile(seedFilePath, JSON.stringify(seedData, null, 2))
	} catch (error) {
		console.error('Error creating seed file:', error)
		process.exit(1)
	} finally {
		await connection.end()
	}
}

pullSeedData()
