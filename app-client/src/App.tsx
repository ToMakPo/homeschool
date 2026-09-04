import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page'
import SignupPage from './pages/signup/signup.page'
import PasswordResetPage from './pages/password/password-reset.page'
import ParentDashboard from './pages/parent/parent.portal'

function RequireAuth({ children }: { children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	if (!user) return <Navigate to='/login' replace />
	return <>{children}</>
}

function RequireRole({ isParent, children }: { isParent: boolean; children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	if (!user || user.isParent !== isParent) return <Navigate to='/login' replace />
	return <>{children}</>
}

function RootRedirect() {
	const user = useAuth((state) => state.user)
	if (!user) return <Navigate to='/login' replace />
	return <Navigate to={`/${user.role}`} replace />
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
