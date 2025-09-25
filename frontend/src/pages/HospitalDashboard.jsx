import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [hospitalData, setHospitalData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Popup states
  const [showAddDoctorPopup, setShowAddDoctorPopup] = useState(false);
  const [showAddPharmacyPopup, setShowAddPharmacyPopup] = useState(false);
  
  // Form states
  const [doctorEmail, setDoctorEmail] = useState('');
  const [pharmacyId, setPharmacyId] = useState('');
  const [availablePharmacies, setAvailablePharmacies] = useState([]);

  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        setLoading(true);
        // Fetch hospital profile
        const profileResponse = await api.get('/hospital/my/profile');
        setHospitalData(profileResponse.data);
        setDoctors(profileResponse.data.doctors || []);
        setPharmacies(profileResponse.data.pharmacies || []);
        
        // Fetch available pharmacies that aren't already associated
        const allPharmaciesResponse = await api.get('/pharmacy/all');
        const available = allPharmaciesResponse.data.filter(
          pharmacy => !profileResponse.data.pharmacies.some(p => p._id === pharmacy._id)
        );
        setAvailablePharmacies(available);
        
        setError('');
      } catch (err) {
        setError('Failed to fetch hospital data. Please try again.');
        console.error('Error fetching hospital data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalData();
  }, []);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      // Find doctor by email
      const doctorsResponse = await api.get('/users/doctors');
      const doctor = doctorsResponse.data.find(d => d.email === doctorEmail);
      
      if (!doctor) {
        setError('Doctor with this email not found.');
        return;
      }
      
      // Add doctor to hospital
      await api.post('/hospital/doctors/add', { doctorId: doctor._id });
      
      // Refresh data
      const profileResponse = await api.get('/hospital/my/profile');
      setDoctors(profileResponse.data.doctors || []);
      
      // Reset form and close popup
      setDoctorEmail('');
      setShowAddDoctorPopup(false);
      setError('');
    } catch (err) {
      setError('Failed to add doctor. ' + (err.response?.data?.message || ''));
      console.error('Error adding doctor:', err);
    }
  };

  const handleRemoveDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to remove this doctor from the hospital?')) {
      try {
        await api.delete('/hospital/doctors/remove', { data: { doctorId } });
        
        // Refresh data
        const profileResponse = await api.get('/hospital/my/profile');
        setDoctors(profileResponse.data.doctors || []);
      } catch (err) {
        setError('Failed to remove doctor. ' + (err.response?.data?.message || ''));
        console.error('Error removing doctor:', err);
      }
    }
  };

  const handleAddPharmacy = async (e) => {
    e.preventDefault();
    try {
      // Add pharmacy to hospital
      await api.post('/hospital/pharmacies/add', { pharmacyId });
      
      // Refresh data
      const profileResponse = await api.get('/hospital/my/profile');
      setPharmacies(profileResponse.data.pharmacies || []);
      
      // Update available pharmacies
      const allPharmaciesResponse = await api.get('/pharmacy/all');
      const available = allPharmaciesResponse.data.filter(
        pharmacy => !profileResponse.data.pharmacies.some(p => p._id === pharmacy._id)
      );
      setAvailablePharmacies(available);
      
      // Reset form and close popup
      setPharmacyId('');
      setShowAddPharmacyPopup(false);
      setError('');
    } catch (err) {
      setError('Failed to add pharmacy. ' + (err.response?.data?.message || ''));
      console.error('Error adding pharmacy:', err);
    }
  };

  const handleRemovePharmacy = async (pharmacyId) => {
    if (window.confirm('Are you sure you want to remove this pharmacy association?')) {
      try {
        await api.delete('/hospital/pharmacies/remove', { data: { pharmacyId } });
        
        // Refresh data
        const profileResponse = await api.get('/hospital/my/profile');
        setPharmacies(profileResponse.data.pharmacies || []);
        
        // Update available pharmacies
        const allPharmaciesResponse = await api.get('/pharmacy/all');
        const available = allPharmaciesResponse.data.filter(
          pharmacy => !profileResponse.data.pharmacies.some(p => p._id === pharmacy._id)
        );
        setAvailablePharmacies(available);
      } catch (err) {
        setError('Failed to remove pharmacy. ' + (err.response?.data?.message || ''));
        console.error('Error removing pharmacy:', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container-app py-10">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Loading Hospital Dashboard...</h2>
              <div className="flex justify-center">
                <div className="loader"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !hospitalData) {
    return (
      <div className="container-app py-10">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Hospital Dashboard</h2>
              <div className="text-red-600 mb-4">{error}</div>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
              <button className="btn btn-secondary ml-2" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Hospital Dashboard</h1>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            {error}
          </div>
        )}

        {/* Hospital Profile Card */}
        <div className="card mb-6">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Hospital Profile</h2>
            {hospitalData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Name:</strong> {hospitalData.name}</p>
                  <p><strong>Email:</strong> {hospitalData.email}</p>
                  <p><strong>Phone:</strong> {hospitalData.phone}</p>
                  <p><strong>Address:</strong> {hospitalData.address}</p>
                </div>
                {hospitalData.location && (
                  <div>
                    <p><strong>Location Coordinates:</strong> {hospitalData.location.coordinates.join(', ')}</p>
                    {hospitalData.contactPerson && (
                      <p><strong>Contact Person:</strong> {hospitalData.contactPerson}</p>
                    )}
                    {hospitalData.website && (
                      <p><strong>Website:</strong> <a href={hospitalData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{hospitalData.website}</a></p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Doctors Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Doctors at {hospitalData?.name}</h2>
              <button className="btn btn-primary" onClick={() => setShowAddDoctorPopup(true)}>
                Add Doctor
              </button>
            </div>
            
            {doctors.length === 0 ? (
              <p className="text-gray-600">No doctors added yet. Click "Add Doctor" to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 text-left">Name</th>
                      <th className="py-2 px-4 text-left">Email</th>
                      <th className="py-2 px-4 text-left">Specialization</th>
                      <th className="py-2 px-4 text-left">Qualification</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor._id} className="border-t">
                        <td className="py-2 px-4">{doctor.name}</td>
                        <td className="py-2 px-4">{doctor.email}</td>
                        <td className="py-2 px-4">{doctor.specialization}</td>
                        <td className="py-2 px-4">{doctor.qualification}</td>
                        <td className="py-2 px-4">
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveDoctor(doctor._id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pharmacies Section */}
        <div className="card">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Associated Pharmacies</h2>
              <button className="btn btn-primary" onClick={() => setShowAddPharmacyPopup(true)}>
                Add Pharmacy
              </button>
            </div>
            
            {pharmacies.length === 0 ? (
              <p className="text-gray-600">No pharmacies associated yet. Click "Add Pharmacy" to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 text-left">Name</th>
                      <th className="py-2 px-4 text-left">Location</th>
                      <th className="py-2 px-4 text-left">Contact</th>
                      <th className="py-2 px-4 text-left">Email</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacies.map((pharmacy) => (
                      <tr key={pharmacy._id} className="border-t">
                        <td className="py-2 px-4">{pharmacy.name}</td>
                        <td className="py-2 px-4">{pharmacy.address}</td>
                        <td className="py-2 px-4">{pharmacy.contact}</td>
                        <td className="py-2 px-4">{pharmacy.email}</td>
                        <td className="py-2 px-4">
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemovePharmacy(pharmacy._id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Doctor Popup */}
        {showAddDoctorPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add Doctor</h3>
              <form onSubmit={handleAddDoctor}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Doctor's Email</label>
                  <input
                    type="email"
                    className="input w-full"
                    placeholder="Enter doctor's registered email"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowAddDoctorPopup(false);
                    setDoctorEmail('');
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Doctor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Pharmacy Popup */}
        {showAddPharmacyPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add Pharmacy</h3>
              <form onSubmit={handleAddPharmacy}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Select Pharmacy</label>
                  <select
                    className="input w-full"
                    value={pharmacyId}
                    onChange={(e) => setPharmacyId(e.target.value)}
                    required
                  >
                    <option value="">Choose a pharmacy</option>
                    {availablePharmacies.map((pharmacy) => (
                      <option key={pharmacy._id} value={pharmacy._id}>
                        {pharmacy.name} - {pharmacy.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowAddPharmacyPopup(false);
                    setPharmacyId('');
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Pharmacy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;