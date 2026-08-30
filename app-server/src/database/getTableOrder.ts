import mysql from 'mysql2/promise'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from the .env file in the server root folder
dotenv.config({ path: path.join(__dirname, '../../.env') })

export default async function getTableOrder() {
	// Connect using your DB_ADMIN credentials from the .env file
	console.info(`Connecting to database as ${process.env.DB_ADMIN_USER || 'root'}...`)
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 3306,
		user: process.env.DB_ADMIN_USER || 'root',
		password: process.env.DB_ADMIN_PASSWORD || ''
	})

	try {
		const tableNames = await connection
			.query(
				"SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = 'homeschool_app' AND TABLE_TYPE = 'BASE TABLE'"
			)
			.then(res => (res[0] as { tableName: string }[]).map(row => row.tableName))

		const relationships = await connection
			.query(
				"SELECT TABLE_NAME as tableName, REFERENCED_TABLE_NAME as reference FROM information_schema.key_column_usage WHERE table_schema = 'homeschool_app' AND referenced_table_name IS NOT NULL"
			)
			.then(res => res[0] as { tableName: string; reference: string }[])

		const order: string[] = []
		const visited = new Set<string>()
		const visiting = new Set<string>()

		const adjacencyList: Record<string, Set<string>> = {}

		for (const tableName of tableNames) {
			adjacencyList[tableName] = new Set()
		}

		for (const { tableName, reference } of relationships) {
			if (adjacencyList[tableName]) {
				adjacencyList[tableName].add(reference)
			}
		}

		function dfs(table: string) {
			if (visited.has(table)) return

			if (visiting.has(table)) {
				throw new Error(`Circular dependency detected involving table: ${table}`)
			}

			visiting.add(table)

			const dependencise = adjacencyList[table]
			if (dependencise) {
				for (const dependency of dependencise) {
					if (dependency !== table) {
						dfs(dependency)
					}
				}
			}

			visiting.delete(table)
			visited.add(table)
			order.push(table)
		}

		for (const tableName of tableNames) {
			dfs(tableName)
		}

		return order
	} catch (error) {
		console.error('Error creating seed file:', error)
		process.exit(1)
	} finally {
		await connection.end()
	}
}
