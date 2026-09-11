import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page'
import SignupPage from './pages/signup/signup.page'
import PasswordResetPage from './pages/password/password-reset.page'
import PortalPage from './pages/portal/portal.page.tsx'

function isTokenExpired(token: string): boolean {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		if (!payload.exp) return true

		return payload.exp * 1000 <= Date.now()
	} catch {
		console.error('Failed to decode token payload, assuming expired')
		return true
	}
}

function RequireAuth({ children }: { children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	const authToken = useAuth((state) => state.authToken)
	const clearAuth = useAuth((state) => state.clearAuth)

	const tokenExpired = !authToken || isTokenExpired(authToken)

	useEffect(() => {
		if (!user || tokenExpired) clearAuth()
	}, [user, tokenExpired, clearAuth])

	if (!user || tokenExpired) return <Navigate to='/login' replace />

	return <>{children}</>
}

export default function App() {
	// Zustand persist loads the saved authentication state asynchronously. Don't
	// let the router make authentication decisions until that process has finished.
	const [hydrated, setHydrated] = useState(useAuth.persist.hasHydrated())

	useEffect(() => useAuth.persist.onFinishHydration(() => setHydrated(true)), [])

	if (!hydrated) return <div>Loading...</div>

	return (
		<BrowserRouter>
			<Routes>
				{/* Public Routes */}

				<Route path='/login' element={<LoginPage />} />

				<Route path='/signup' element={<SignupPage />} />

				<Route path='/password-reset' element={<PasswordResetPage />} />

				{/* Root Redirect */}
				<Route
					path='/'
					element={
						<RequireAuth>
							<PortalPage />
						</RequireAuth>
					}
				/>

				{/* Unknown Routes */}

				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</BrowserRouter>
	)
}
