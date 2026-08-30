import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from the .env file in the server root folder
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function rebuildDatabase() {
	const sqlFilePath = path.join(__dirname, 'app.sql')

	console.log('Reading app.sql file...')
	if (!fs.existsSync(sqlFilePath)) {
		console.error(`Error: Could not find sql file at ${sqlFilePath}`)
		process.exit(1)
	}

	let sqlScript = fs.readFileSync(sqlFilePath, 'utf8')

	// Clean up windows style newlines (\r\n) for uniform processing
	sqlScript = sqlScript.replace(/\r\n/g, '\n')

	// Identify the delimiter block, extract the content inside, and strip the command
	const delimiterRegex = /DELIMITER\s+\$\$\n([\s\S]*?)DELIMITER\s+;/i
	const match = sqlScript.match(delimiterRegex)

	let standardStatements: string[] = []
	let triggerStatements: string[] = []

	if (match) {
		const triggerBlock = match[1]

		// Split triggers by the custom $$ delimiter and clean them up
		triggerStatements = triggerBlock
			.split('$$')
			.map(cmd => cmd.trim())
			.filter(cmd => cmd.length > 0)

		// Remove the entire DELIMITER block from the main script
		sqlScript = sqlScript.replace(delimiterRegex, '')
	}

	// Process standard SQL statements (Split by semicolon)
	standardStatements = sqlScript
		.split(';')
		.map(cmd => cmd.trim())
		.filter(cmd => cmd.length > 0)

	// Combine into a single ordered sequence
	const allStatements = [...standardStatements, ...triggerStatements]

	// Connect using your DB_ADMIN credentials from the .env file
	console.log(`Connecting to database as ${process.env.DB_ADMIN_USER || 'root'}...`)
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 3306,
		user: process.env.DB_ADMIN_USER || 'root',
		password: process.env.DB_ADMIN_PASSWORD || ''
	})

	try {
		console.log(`Executing ${allStatements.length} SQL statements sequentially...`)

		for (let i = 0; i < allStatements.length; i++) {
			const statement = allStatements[i]
			// Print context snippet for debugging if a query fails
			try {
				await connection.query(statement)
			} catch (err: any) {
				console.error(`\n❌ Failed at statement #${i + 1}:`)
				console.error(`"${statement.substring(0, 100)}..."`)
				throw err
			}
		}

		console.log('\nDatabase completely dropped and rebuilt with triggers! 🎉')
	} catch (error) {
		console.error('Error rebuilding database:', error)
		process.exit(1)
	} finally {
		await connection.end()
	}
}

rebuildDatabase()
