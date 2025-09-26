import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function DoctorAppointmentManagerWithMedia({ onJoinRoom }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [confirmingAppointment, setConfirmingAppointment] = useState(null);
  const [confirmationData, setConfirmationData] = useState({
    confirmedDate: '',
    timeSlot: '',
    doctorNotes: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('all');
  const [playingMedia, setPlayingMedia] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments/doctor/${user.id}`);
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointment = async (e) => {
    e.preventDefault();
    if (!confirmingAppointment) return;

    try {
      setLoading(true);
      await api.put(`/appointments/${confirmingAppointment._id}/confirm`, confirmationData);
      
      await loadAppointments();
      
      setConfirmingAppointment(null);
      setConfirmationData({
        confirmedDate: '',
        timeSlot: '',
        doctorNotes: ''
      });
      
      alert('Appointment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      alert(error.response?.data?.message || 'Error confirming appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/appointments/${appointmentId}/reject`, {
        rejectionReason: rejectionReason
      });
      
      await loadAppointments();
      
      setSelectedAppointment(null);
      setRejectionReason('');
      
      alert('Appointment rejected successfully');
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      alert(error.response?.data?.message || 'Error rejecting appointment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (appointment) => {
    switch (appointment.status) {
      case 'pending':
        return {
          text: 'Pending Review',
          class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳'
        };
      case 'confirmed':
        return {
          text: 'Confirmed',
          class: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          class: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌'
        };
      case 'completed':
        return {
          text: 'Completed',
          class: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '✓'
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          class: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '🚫'
        };
      default:
        return {
          text: appointment.status,
          class: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMediaUrl = (attachment) => {
    const filename = attachment.filePath.split('/').pop();
    return `/api/appointments/media/${filename}`;
  };

  const renderMediaAttachment = (attachment, index, appointmentId) => {
    const mediaUrl = getMediaUrl(attachment);
    const isPlaying = playingMedia === `${appointmentId}-${index}`;

    return (
      <div key={index} className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="mr-2 text-lg">
              {attachment.type === 'video' ? '📹' : '🎵'}
            </span>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {attachment.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(attachment.fileSize)} • {attachment.type}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {new Date(attachment.uploadedAt).toLocaleDateString()}
          </div>
        </div>
        
        {attachment.type === 'video' ? (
          <video 
            controls 
            className="w-full max-w-md h-32 rounded"
            preload="metadata"
          >
            <source src={mediaUrl} type={attachment.mimeType} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <audio 
            controls 
            className="w-full"
            preload="metadata"
          >
            <source src={mediaUrl} type={attachment.mimeType} />
            Your browser does not support the audio tag.
          </audio>
        )}
      </div>
    );
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status === filter;
  });

  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;

  const timeSlots = [
    '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
  ];

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl text-yellow-600 mr-3">⏳</div>
            <div>
              <div className="text-2xl font-bold text-yellow-800">{pendingCount}</div>
              <div className="text-sm text-yellow-700">Pending Review</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl text-green-600 mr-3">✅</div>
            <div>
              <div className="text-2xl font-bold text-green-800">{confirmedCount}</div>
              <div className="text-sm text-green-700">Confirmed</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl text-blue-600 mr-3">📅</div>
            <div>
              <div className="text-2xl font-bold text-blue-800">{appointments.length}</div>
              <div className="text-sm text-blue-700">Total Appointments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'all', label: 'All Appointments', count: appointments.length },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'confirmed', label: 'Confirmed', count: confirmedCount },
            { key: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📅</div>
            <p className="text-gray-500">No {filter !== 'all' ? filter : ''} appointments found</p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const statusInfo = getStatusInfo(appointment);
            return (
              <div key={appointment._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.patientId?.name || 'Unknown Patient'}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Age: {appointment.patientId?.age || 'N/A'}</p>
                      <p>Village: {appointment.patientId?.village || 'N/A'}</p>
                      <p>Email: {appointment.patientId?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.class}`}>
                    {statusInfo.icon} {statusInfo.text}
                  </span>
                </div>

                {/* Appointment Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Appointment Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Requested Date:</span> {formatDate(appointment.requestedDate)}</p>
                      {appointment.confirmedDate && (
                        <>
                          <p><span className="text-gray-500">Confirmed Date:</span> {formatDate(appointment.confirmedDate)}</p>
                          <p><span className="text-gray-500">Time Slot:</span> {appointment.timeSlot}</p>
                        </>
                      )}
                      <p><span className="text-gray-500">Type:</span> {appointment.consultationType}</p>
                    </div>
                  </div>
                  
                  {appointment.symptoms && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Symptoms/Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {appointment.symptoms}
                      </p>
                    </div>
                  )}
                </div>

                {/* Media Attachments */}
                {appointment.attachments && appointment.attachments.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">📹 Media Attachments ({appointment.attachments.length})</h4>
                    <div className="space-y-3">
                      {appointment.attachments.map((attachment, index) => 
                        renderMediaAttachment(attachment, index, appointment._id)
                      )}
                    </div>
                  </div>
                )}

                {appointment.doctorNotes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Doctor's Notes</h4>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                      {appointment.doctorNotes}
                    </p>
                  </div>
                )}

                {appointment.rejectionReason && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-700 mb-2">Rejection Reason</h4>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                      {appointment.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  {appointment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setConfirmingAppointment(appointment)}
                        className="btn-primary text-sm"
                        disabled={loading}
                      >
                        Confirm Appointment
                      </button>
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="btn-secondary text-sm"
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <button 
                      onClick={() => onJoinRoom ? onJoinRoom(appointment._id) : null}
                      className="btn-primary text-sm"
                    >
                      Start Consultation
                    </button>
                  )}
                  
                  <div className="text-xs text-gray-500 ml-auto pt-2">
                    Requested: {new Date(appointment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Appointment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Patient: {confirmingAppointment.patientId?.name}
            </p>
            
            <form onSubmit={handleConfirmAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmed Date
                </label>
                <input
                  type="date"
                  value={confirmationData.confirmedDate}
                  onChange={(e) => setConfirmationData(prev => ({
                    ...prev,
                    confirmedDate: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <select
                  value={confirmationData.timeSlot}
                  onChange={(e) => setConfirmationData(prev => ({
                    ...prev,
                    timeSlot: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select a time slot</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={confirmationData.doctorNotes}
                  onChange={(e) => setConfirmationData(prev => ({
                    ...prev,
                    doctorNotes: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="3"
                  placeholder="Any notes for the patient..."
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setConfirmingAppointment(null)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  disabled={loading}
                >
                  {loading ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reject Appointment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Patient: {selectedAppointment.patientId?.name}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="3"
                  placeholder="Please provide a reason..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppointment(null);
                    setRejectionReason('');
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectAppointment(selectedAppointment._id)}
                  className="btn-secondary text-sm bg-red-500 hover:bg-red-600 text-white"
                  disabled={loading || !rejectionReason.trim()}
                >
                  {loading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}