import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ProfileSection() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = user.id || user._id;
      const { data } = await api.get(`/users/${userId}`);
      setProfile(data);
      setFormData(data);
    } catch (error) {
      setMessage({ text: 'Error fetching profile', type: 'error' });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = user.id || user._id;
      const { data } = await api.put(`/users/${userId}`, formData);
      setProfile(data);
      setEditing(false);
      setMessage({ text: 'Profile updated successfully', type: 'success' });
      
      // Update localStorage with new user data
      const updatedUser = { ...user, name: data.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Error updating profile', type: 'error' });
    }
  };

  if (!profile) {
    return <div className="card"><div className="card-body">Loading profile...</div></div>;
  }

  return (
    <div className="card">
      <div className="card-body space-y-4">
        <div className="flex justify-between items-center">
          <div className="section-title">Your Profile</div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="btn-secondary"
            >
              Edit Profile
            </button>
          )}
        </div>

        {message.text && (
          <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name || ''} 
                onChange={handleChange} 
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone || ''} 
                onChange={handleChange} 
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea 
                name="bio" 
                value={formData.bio || ''} 
                onChange={handleChange} 
                className="input h-24"
              />
            </div>

            {profile.role === 'patient' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input 
                    type="number" 
                    name="age" 
                    value={formData.age || ''} 
                    onChange={handleChange} 
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                  <input 
                    type="text" 
                    name="village" 
                    value={formData.village || ''} 
                    onChange={handleChange} 
                    className="input"
                  />
                </div>
              </>
            )}

            {profile.role === 'doctor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input 
                    type="text" 
                    name="specialization" 
                    value={formData.specialization || ''} 
                    onChange={handleChange} 
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input 
                    type="text" 
                    name="qualification" 
                    value={formData.qualification || ''} 
                    onChange={handleChange} 
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <input 
                    type="text" 
                    name="availability" 
                    value={formData.availability || ''} 
                    onChange={handleChange} 
                    className="input"
                    placeholder="e.g., Mon-Fri, 9AM-5PM"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save Changes</button>
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(profile);
                }} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                {profile.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{profile.name}</h3>
                <p className="text-gray-600 capitalize">{profile.role}</p>
                {profile.phone && <p className="text-gray-600">{profile.phone}</p>}
              </div>
            </div>

            {profile.bio && (
              <div>
                <h4 className="font-medium text-gray-700">Bio</h4>
                <p className="text-gray-600">{profile.bio}</p>
              </div>
            )}

            {profile.role === 'patient' && (
              <div className="grid grid-cols-2 gap-4">
                {profile.age && (
                  <div>
                    <h4 className="font-medium text-gray-700">Age</h4>
                    <p className="text-gray-600">{profile.age}</p>
                  </div>
                )}
                {profile.village && (
                  <div>
                    <h4 className="font-medium text-gray-700">Village</h4>
                    <p className="text-gray-600">{profile.village}</p>
                  </div>
                )}
              </div>
            )}

            {profile.role === 'doctor' && (
              <div className="space-y-3">
                {profile.specialization && (
                  <div>
                    <h4 className="font-medium text-gray-700">Specialization</h4>
                    <p className="text-gray-600">{profile.specialization}</p>
                  </div>
                )}
                {profile.qualification && (
                  <div>
                    <h4 className="font-medium text-gray-700">Qualification</h4>
                    <p className="text-gray-600">{profile.qualification}</p>
                  </div>
                )}
                {profile.availability && (
                  <div>
                    <h4 className="font-medium text-gray-700">Availability</h4>
                    <p className="text-gray-600">{profile.availability}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}