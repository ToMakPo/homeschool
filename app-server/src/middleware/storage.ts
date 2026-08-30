import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const storage = multer.diskStorage({
	destination: process.env.UPLOAD_DIR,
	filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
})

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // Limit file size to 10MB
