import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page'
import SignupPage from './pages/signup/signup.page'
import PasswordResetPage from './pages/password/password-reset.page'
import ParentDashboard from './pages/parent/parent.portal'

function loginRedirect() {
	const user = useAuth((state) => state.user)
	const accessToken = useAuth((state) => state.accessToken)
	const isInitialized = useAuth((state) => state.isInitialized)

	if (!isInitialized) {
		return <div>Loading...</div>
	}

	if (!user || !accessToken) {
		return <Navigate to='/login' replace />
	}

	return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
	const redirect = loginRedirect()
	if (redirect) return redirect

	return <>{children}</>
}

function RequireRole({ isParent, children }: { isParent: boolean; children: React.ReactNode }) {
	const redirect = loginRedirect()
	if (redirect) return redirect

	const user = useAuth((state) => state.user)
	if (!user || user.isParent !== isParent) return <Navigate to='/login' replace />

	return <>{children}</>
}

function RootRedirect() {
	const redirect = loginRedirect()
	if (redirect) return redirect

	const user = useAuth((state) => state.user)
	return <Navigate to={`/${user!.role}`} replace />
}

export default function App() {
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
						<RequireRole isParent={true}>
							<ParentDashboard />
						</RequireRole>
					}
				/>

				{/* Student Routes */}
				<Route
					path='/student'
					element={
						<RequireRole isParent={false}>
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
