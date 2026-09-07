import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page'
import SignupPage from './pages/signup/signup.page'
import PasswordResetPage from './pages/password/password-reset.page'
import ParentDashboard from './pages/parent/parent.portal'

import type { User } from './utils/types.ts'

function isTokenExpired(token: string): boolean {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))

		if (!payload.exp) {
			return true
		}

		return payload.exp * 1000 <= Date.now()
	} catch {
		return true
	}
}

function RequireAuth({ children }: { children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	const accessToken = useAuth((state) => state.accessToken)
	const clearAuth = useAuth((state) => state.clearAuth)

	const tokenExpired = !accessToken || isTokenExpired(accessToken)

	useEffect(() => {
		if (!user || tokenExpired) {
			clearAuth()
		}
	}, [user, tokenExpired, clearAuth])

	if (!user || tokenExpired) {
		return <Navigate to='/login' replace />
	}

	return <>{children}</>
}

function RequireRole({ role, children }: { role: User['role']; children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	const accessToken = useAuth((state) => state.accessToken)
	const clearAuth = useAuth((state) => state.clearAuth)

	const tokenExpired = !accessToken || isTokenExpired(accessToken)

	useEffect(() => {
		if (!user || tokenExpired) {
			clearAuth()
		}
	}, [user, tokenExpired, clearAuth])

	if (!user || tokenExpired) {
		return <Navigate to='/login' replace />
	}

	const roleKey = `is${role.charAt(0).toUpperCase() + role.slice(1)}` as `is${Capitalize<User['role']>}`

	if (!user[roleKey]) {
		return <Navigate to='/login' replace />
	}

	return <>{children}</>
}

function RootRedirect() {
	const user = useAuth((state) => state.user)

	if (!user) {
		return <Navigate to='/login' replace />
	}

	return <Navigate to={`/${user.role}`} replace />
}

function StudentDashboard() {
	const user = useAuth((state) => state.user)

	return (
		<div>
			<h1>Student Dashboard</h1>
			<pre>{JSON.stringify(user, null, 2)}</pre>
		</div>
	)
}

export default function App() {
	/*
	 * Zustand persist loads the saved authentication state
	 * asynchronously. Don't let the router make authentication
	 * decisions until that process has finished.
	 */
	const [hydrated, setHydrated] = useState(useAuth.persist.hasHydrated())

	useEffect(() => {
		const unsubscribe = useAuth.persist.onFinishHydration(() => {
			setHydrated(true)
		})

		return unsubscribe
	}, [])

	if (!hydrated) {
		return <div>Loading...</div>
	}

	return (
		<BrowserRouter>
			<Routes>
				{/* Public Routes */}

				<Route path='/login' element={<LoginPage />} />

				<Route path='/signup' element={<SignupPage />} />

				<Route path='/password-reset' element={<PasswordResetPage />} />

				{/* Parent Routes */}

				<Route
					path='/parent'
					element={
						<RequireRole role='parent'>
							<ParentDashboard />
						</RequireRole>
					}
				/>

				{/* Student Routes */}

				<Route
					path='/student'
					element={
						<RequireRole role='student'>
							<StudentDashboard />
						</RequireRole>
					}
				/>

				{/* Root Redirect */}

				<Route
					path='/'
					element={
						<RequireAuth>
							<RootRedirect />
						</RequireAuth>
					}
				/>

				{/* Unknown Routes */}

				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</BrowserRouter>
	)
}
