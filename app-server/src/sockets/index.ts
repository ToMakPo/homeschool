// import { Socket, Server } from 'socket.io'
// import { createServer } from 'http'

// const onlineUsers = new Map<string, Set<string>>()

// export function initSockets(httpServer: ReturnType<typeof createServer>) {
// 	const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL, credentials: true } })

// 	io.on('connection', (socket: Socket) => {
// 		const userId = socket.handshake.query.userId as string
// 		const familyIds = (socket.handshake.query.familyIds as string)?.split(',') || []

// 		if (!userId) {
// 			socket.disconnect()
// 			return
// 		}

// 	})
// }
