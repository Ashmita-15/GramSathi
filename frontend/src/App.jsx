import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginSignup from './pages/LoginSignup.jsx'
import PatientDashboard from './pages/PatientDashboard.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import HospitalDashboard from './pages/HospitalDashboard.jsx'
import PharmacyDashboard from './pages/PharmacyDashboard.jsx'
import DoctorsPage from './pages/DoctorsPage.jsx'
import DoctorDetails from './pages/DoctorDetails.jsx'
import PharmacyPage from './pages/PharmacyPage.jsx'
import PharmacyShop from './pages/PharmacyShop.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrderSuccess from './pages/OrderSuccess.jsx'

function NotFound() {
  return (
    <div className="container-app py-10">
      <div className="card"><div className="card-body">
        <div className="section-title mb-2">Page not found</div>
        <p className="text-slate-600">The page you are looking for does not exist.</p>
      </div></div>
    </div>
  )
}

const PrivateRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!token || !user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

const EmergencyButton = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  
  if (!user || user.role !== 'patient') {
    return null
  }

  const handleEmergencyClick = () => {
    // You can add emergency functionality here
    alert('Emergency services contacted!')
  }

  return (
    <button
      onClick={handleEmergencyClick}
      className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 z-50 flex items-center justify-center"
      title="Emergency"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/patient" element={<PrivateRoute roles={["patient"]}><PatientDashboard /></PrivateRoute>} />
          <Route path="/doctor" element={<PrivateRoute roles={["doctor"]}><DoctorDashboard /></PrivateRoute>} />
          <Route path="/hospital" element={<PrivateRoute roles={["hospital"]}><HospitalDashboard /></PrivateRoute>} />
          <Route path="/pharmacy" element={<PrivateRoute roles={["pharmacy"]}><PharmacyDashboard /></PrivateRoute>} />
          <Route path="/doctors" element={<PrivateRoute roles={["patient"]}><DoctorsPage /></PrivateRoute>} />
          <Route path="/doctors/:doctorId" element={<PrivateRoute roles={["patient"]}><DoctorDetails /></PrivateRoute>} />
          <Route path="/pharmacies" element={<PrivateRoute roles={["patient"]}><PharmacyPage /></PrivateRoute>} />
          <Route path="/pharmacy-shop/:pharmacyId" element={<PrivateRoute roles={["patient"]}><PharmacyShop /></PrivateRoute>} />
          <Route path="/checkout/:pharmacyId" element={<PrivateRoute roles={["patient"]}><CheckoutPage /></PrivateRoute>} />
          <Route path="/order-success/:orderId" element={<PrivateRoute roles={["patient"]}><OrderSuccess /></PrivateRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <EmergencyButton />
    </div>
  )
}


