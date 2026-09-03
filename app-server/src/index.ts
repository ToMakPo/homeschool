import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import path from 'path'

import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import familyRoutes from './routes/family'
import validateRoutes from './routes/validate'

// import { initSockets } from './sockets'

const app = express()
const httpServer = http.createServer(app)
// initSockets(httpServer)

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' })) // Limit JSON body size to 10MB
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/family', familyRoutes)
app.use('/api/validate', validateRoutes)

app.get('/health', (_, res) => res.status(200).json({ status: 'ok' }))

const serverUrl = new URL(process.env.SERVER_URL || 'http://localhost:3001')
httpServer.listen(serverUrl.port, () => console.info(`🚀 Server running on ${serverUrl.origin}`))
