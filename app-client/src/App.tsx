import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page'
import SignupPage from './pages/signup/signup.page'
import PasswordResetPage from './pages/password/password-reset.page'
import ParentDashboard from './pages/parent/parent.portal'

import type { User } from './utils/types.ts'

type RoleKey<R extends string> = `is${Capitalize<R>}` & keyof User

function loginRedirect(userRenderCallback?: (user: User) => React.JSX.Element) {
	const user = useAuth((state) => state.user)
	const accessToken = useAuth((state) => state.accessToken)

	// Redirect to login if user or access token is missing.
	if (!user || !accessToken) return <Navigate to='/login' replace />

	// Render the user-specific content if a callback is provided.
	const rendered = userRenderCallback && userRenderCallback(user)
	if (rendered) return rendered

	// If no user-specific content is rendered, return null.
	return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
	return loginRedirect(() => <>{children}</>)
}

function RequireRole({ role, children }: { role: User['role']; children: React.ReactNode }) {
	return loginRedirect((user) => {
		const isRoleKey = `is${role.charAt(0).toUpperCase() + role.slice(1)}` as RoleKey<typeof role>
		return user[isRoleKey] ? <>{children}</> : <Navigate to='/login' replace />
	})
}

function RootRedirect() {
	return loginRedirect((user) => <Navigate to={`/${user!.role}`} replace />)
}

export default function App() {
	const [hydrated, setHydrated] = useState(useAuth.persist.hasHydrated())
	useEffect(() => useAuth.persist.onFinishHydration(() => setHydrated(true)), [])
	if (!hydrated) return <div>Loading...</div>

	const user = useAuth((state) => state.user)

	return (
		<BrowserRouter>
			<Routes>
				{/* Public Routes */}
				<Route path='/login' element={<LoginPage />} />
				<Route path='/signup' element={<SignupPage />} />

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
							<div>
								<h1>Student Dashboard</h1>
								<pre>{JSON.stringify(user, null, 2)}</pre>
							</div>
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
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</BrowserRouter>
	)
}
