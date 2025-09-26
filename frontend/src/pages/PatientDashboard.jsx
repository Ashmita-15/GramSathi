import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Dashboard from '../components/Dashboard'
import EnhancedSymptomChecker from '../components/EnhancedSymptomChecker'
import VideoCall from '../components/VideoCall'
import ProfileSection from '../components/ProfileSection'
import AppointmentBooking from '../components/AppointmentBooking';
import HealthRecords from '../components/HealthRecords'
import DoctorsList from '../components/DoctorsList'
import api from '../services/api'

export default function PatientDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [roomId, setRoomId] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders()
    }
  }, [activeTab])

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true)
      const { data } = await api.get('/pharmacy/my/patient-orders')
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleJoinRoom = (appointmentId) => {
    setRoomId(appointmentId)
    setActiveTab('consultation')
  }

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor)
    setActiveTab('appointments')
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="grid gap-4">
            {/* <div className="card">
              <div className="card-body">
                <div className="section-title mb-4">Quick Actions</div>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveTab('doctors')} 
                    className="btn-primary w-full justify-center"
                  >
                    Find Doctors
                  </button>
                  <button 
                    onClick={() => setActiveTab('appointments')} 
                    className="btn-secondary w-full justify-center"
                  >
                    My Appointments
                  </button>
                  <button 
                    onClick={() => setActiveTab('records')} 
                    className="btn-secondary w-full justify-center"
                  >
                    View Health Records
                  </button>
                  <button 
                    onClick={() => setActiveTab('orders')} 
                    className="btn-secondary w-full justify-center"
                  >
                    Order History
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className="btn-outline w-full justify-center"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div> */}
            <EnhancedSymptomChecker />
          </div>
        );
      case 'appointments':
        return <AppointmentBooking onJoinRoom={handleJoinRoom} selectedDoctor={selectedDoctor} />;
      case 'profile':
        return <ProfileSection />;
      case 'records':
        return <HealthRecords />;
      case 'orders':
        return (
          <div>
            <div className="section-title mb-4">Order History</div>
            {ordersLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-gray-500 mb-4">No orders found</div>
                  <Link to="/pharmacies" className="btn-primary">
                    Browse Pharmacies
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order._id} className="card">
                    <div className="card-body">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-semibold text-lg">{order.orderId}</div>
                          <div className="text-sm text-gray-600">
                            {order.pharmacyId?.name} • {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">₹{order.totalAmount}</div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Order Type:</div>
                          <div className="text-sm text-gray-600 capitalize">{order.orderType}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Items:</div>
                          <div className="text-sm text-gray-600">
                            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium mb-2">Order Items:</div>
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.medicineName} × {item.quantity}</span>
                              <span>₹{item.total}</span>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{order.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Link 
                          to={`/order-success/${order._id}`}
                          className="btn-secondary text-xs"
                        >
                          View Details
                        </Link>
                        <Link 
                          to={`/pharmacy-shop/${order.pharmacyId?._id}`}
                          className="btn-outline text-xs"
                        >
                          Shop Again
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'doctors':
        return <DoctorsList onSelectDoctor={handleSelectDoctor} />;
      case 'consultation':
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="section-title">Video Consultation</div>
              <button 
                onClick={() => setActiveTab('appointments')} 
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Appointments
              </button>
            </div>
            <VideoCall roomId={roomId} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dashboard title="Patient Dashboard">
      <div className="mb-6 border-b">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            AI Symptom Checker
          </button>
          {/* <button
            onClick={() => setActiveTab('doctors')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'doctors' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Find Doctors
          </button> */}
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'appointments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'records' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Health Records
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Order History
          </button>
        </nav>
      </div>
      
      {renderTabContent()}
    </Dashboard>
  )
}


