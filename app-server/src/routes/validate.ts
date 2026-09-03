import { Router, Request, Response } from 'express'

import { authenticate } from '../middleware/auth'
import { validateBoolean, validateEnum, validateName, validatePassword, validateString, validateUsername } from '../utils/validation'
import { apiResponse } from '../utils/api-response'

const router = Router()
router.use(authenticate)

////////////////////////////
/// VALIDATE USER INPUTS ///
////////////////////////////
router.get('/validate/username', async (req: Request, res: Response) => {
	const username = req.query.username as string
	const ignoreId = req.query.ignoreId as string | undefined

	const usernameValidation = await validateUsername(username, ignoreId)
	const { passed, message, ...data } = usernameValidation
	return res.json(apiResponse('VALIDATE_USERNAME', passed ? 200 : 400, passed, message, data))
})

router.get('/validate/password', async (req: Request, res: Response) => {
	const password = req.query.password as string
	const confirmation = req.query.confirmation as string | undefined

	const passwordValidation = await validatePassword(password, confirmation)
	const { passed, message, ...data } = passwordValidation
	return res.json(apiResponse('VALIDATE_PASSWORD', passed ? 200 : 400, passed, message, data))
})

router.get('/validate/name', async (req: Request, res: Response) => {
	const name = req.query.name as string
	const fieldName = req.query.fieldName as string

	const nameValidation = await validateName(name, fieldName)
	const { passed, message, ...data } = nameValidation
	return res.json(apiResponse('VALIDATE_NAME', passed ? 200 : 400, passed, message, data))
})

router.get('/validate/boolean', async (req: Request, res: Response) => {
	const value = req.query.value as string
	const fieldName = req.query.fieldName as string
	const nullable = (req.query.nullable as string) === 'true'

	const booleanValidation = await validateBoolean(value, fieldName, nullable)
	const { passed, message, ...data } = booleanValidation
	return res.json(apiResponse('VALIDATE_BOOLEAN', passed ? 200 : 400, passed, message, data))
})

router.get('/validate/string', async (req: Request, res: Response) => {
	const value = req.query.value as string
	const fieldName = req.query.fieldName as string
	const trim = (req.query.trim as string) === 'true'
	const min = parseInt(req.query.min as string, 10)
	const max = parseInt(req.query.max as string, 10)
	const nullable = (req.query.nullable as string) === 'true'

	const stringValidation = await validateString(value, fieldName, trim, min, max, nullable)
	const { passed, message, ...data } = stringValidation
	return res.json(apiResponse('VALIDATE_STRING', passed ? 200 : 400, passed, message, data))
})

router.get('/validate/enum', async (req: Request, res: Response) => {
	const value = req.query.value as string
	const fieldName = req.query.fieldName as string
	const enumValues = (req.query.enumValues as string).split(',')

	const enumValidation = await validateEnum(value, enumValues, fieldName)
	const { passed, message, ...data } = enumValidation
	return res.json(apiResponse('VALIDATE_ENUM', passed ? 200 : 400, passed, message, data))
})

export default router
