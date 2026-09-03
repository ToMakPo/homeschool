import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './store/auth.ts'

import LoginPage from './pages/login/login.page.tsx'
import SignupPage from './pages/signup/signup.page.tsx'

function RequireAuth({ children }: { children: React.ReactNode }) {
	const user = useAuth((state) => state.user)
	if (!user) return <Navigate to='/login' replace />
	return <>{children}</>
}

function RequirePersona({ isParent, children }: { isParent: boolean; children: React.ReactNode }) {
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
						<RequirePersona isParent={true}>
							<h1>Parent Dashboard</h1>
							<pre>{JSON.stringify(user, null, 2)}</pre>
						</RequirePersona>
					}
				/>

				{/* Student Routes */}
				<Route
					path='/student'
					element={
						<RequirePersona isParent={false}>
							<div>
								<h1>Student Dashboard</h1>
								<pre>{JSON.stringify(user, null, 2)}</pre>
							</div>
						</RequirePersona>
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
