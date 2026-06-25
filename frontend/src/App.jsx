import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'
import Layout   from './components/Layout'

import AdminDashboard  from './pages/admin/Dashboard'
import AdminTest       from './pages/admin/TestMode'
import AdminReports    from './pages/admin/Reports'
import AdminSystem     from './pages/admin/System'
import AdminStudents   from './pages/admin/Students'
import AdminLiveTests  from './pages/admin/LiveTests'
import Analytics       from './pages/Analytics'
import Profile         from './pages/Profile'

import StudentDashboard from './pages/student/Dashboard'
import StudentTest      from './pages/student/TestMode'
import StudentReports   from './pages/student/Reports'

import CodingEnvironment from './pages/CodingEnvironment'
import TestEnvironment   from './pages/TestEnvironment'

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center bg-beige-pg text-t3">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth role="admin"><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tests"     element={<AdminTest />} />
        <Route path="live"      element={<AdminLiveTests />} />
        <Route path="students"  element={<AdminStudents />} />
        <Route path="profile"   element={<Profile />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports"   element={<AdminReports />} />
        <Route path="system"    element={<AdminSystem />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<RequireAuth role="student"><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile"   element={<Profile />} />
        <Route path="tests"     element={<StudentTest />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports"   element={<StudentReports />} />
      </Route>

      {/* Coding environment (single problem) */}
      <Route path="/code/:problemId" element={<RequireAuth><CodingEnvironment /></RequireAuth>} />

      {/* Test environment (multi-question) */}
      <Route path="/test/:testId" element={<RequireAuth><TestEnvironment /></RequireAuth>} />

      {/* Default redirect */}
      <Route path="/" element={
        user ? (
          <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
