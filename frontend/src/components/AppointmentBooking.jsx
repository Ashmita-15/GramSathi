import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function AppointmentBooking({ onJoinRoom, selectedDoctor: doctorFromProps }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userAppointments, setUserAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Media upload states
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadDoctors();
      loadUserAppointments();
    }
  }, []);

  // Handle doctor from props
  useEffect(() => {
    if (doctorFromProps && doctors.length > 0) {
      const doctor = doctors.find(d => d._id === doctorFromProps._id);
      if (doctor) {
        setSelectedDoctor(doctor);
      }
    }
  }, [doctorFromProps, doctors]);

  const loadDoctors = async () => {
    try {
      const response = await api.get('/users/doctors/specialization');
      // Convert grouped doctors to flat array
      const doctorsList = Object.values(response.data).flat();
      setDoctors(doctorsList);
    } catch (error) {
      setMessage({ text: 'Error loading doctors', type: 'error' });
      console.error('Error loading doctors:', error);
    }
  };

  const loadUserAppointments = async () => {
    try {
      const userId = user.id || user._id;
      const { data } = await api.get(`/appointments/patient/${userId}`);
      setUserAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
  };

  // File upload handling
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isVideo && !isAudio) {
        setMessage({ text: 'Only video and audio files are allowed', type: 'error' });
        return false;
      }
      
      if (!isValidSize) {
        setMessage({ text: 'File size must be less than 50MB', type: 'error' });
        return false;
      }
      
      return true;
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Recording functionality
  const startRecording = async (type) => {
    try {
      const constraints = type === 'video' 
        ? { video: true, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: type === 'video' ? 'video/webm' : 'audio/webm'
      });

      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: type === 'video' ? 'video/webm' : 'audio/webm' 
        });
        
        const file = new File([blob], `recorded-${type}-${Date.now()}.webm`, {
          type: blob.type
        });
        
        setMediaFiles(prev => [...prev, file]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingType(type);
      setMessage({ text: `Recording ${type}... Click stop when done.`, type: 'success' });
    } catch (error) {
      console.error('Error starting recording:', error);
      setMessage({ text: 'Error accessing camera/microphone', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingType(null);
      setMediaRecorder(null);
      setMessage({ text: 'Recording saved!', type: 'success' });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !appointmentDate) {
      setMessage({ text: 'Please select a doctor and date', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const userId = user.id || user._id;
      console.log('Submitting appointment with media files:', mediaFiles.length);
      
      const formData = new FormData();
      
      // Add basic appointment data
      formData.append('patientId', userId);
      formData.append('doctorId', selectedDoctor._id);
      formData.append('requestedDate', appointmentDate);
      formData.append('symptoms', symptoms);
      formData.append('consultationType', consultationType);
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        console.log(`Adding file ${index + 1}:`, file.name, file.type, file.size);
        formData.append('attachments', file);
      });

      // Debug: Log FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, typeof value === 'object' && value.name ? `File: ${value.name}` : value);
      }

      const response = await api.post('/appointments/book', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Appointment booking response:', response.data);
      setMessage({ 
        text: 'Appointment request submitted successfully! The doctor will review and confirm your appointment.', 
        type: 'success' 
      });
      
      // Reset form
      setAppointmentDate('');
      setSymptoms('');
      setSelectedDoctor(null);
      setMediaFiles([]);
      
      // Reload appointments
      loadUserAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      setMessage({ 
        text: error.response?.data?.message || 'Error submitting appointment request', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusInfo = (appointment) => {
    switch (appointment.status) {
      case 'pending':
        return {
          text: 'Under Review',
          class: 'bg-yellow-100 text-yellow-800',
          icon: '⏳'
        };
      case 'confirmed':
        return {
          text: 'Confirmed',
          class: 'bg-green-100 text-green-800',
          icon: '✅'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          class: 'bg-red-100 text-red-800',
          icon: '❌'
        };
      case 'completed':
        return {
          text: 'Completed',
          class: 'bg-blue-100 text-blue-800',
          icon: '✓'
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          class: 'bg-gray-100 text-gray-800',
          icon: '🚫'
        };
      default:
        return {
          text: appointment.status,
          class: 'bg-gray-100 text-gray-800',
          icon: '❓'
        };
    }
  };

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="section-title mb-4">📅 Book an Appointment</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
              <div className="grid md:grid-cols-2 gap-2">
                {doctors.map(doctor => (
                  <div 
                    key={doctor._id} 
                    onClick={() => handleDoctorSelect(doctor)}
                    className={`p-3 border rounded-lg cursor-pointer ${selectedDoctor && selectedDoctor._id === doctor._id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="font-medium">{doctor.name}</div>
                    <div className="text-sm text-gray-500">{doctor.specialization || 'General Physician'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input 
                  type="date" 
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full p-2 border rounded"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">The doctor will assign a specific time slot</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="video">Video Call</option>
                  <option value="chat">Chat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (Optional)</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Describe your symptoms..."
              />
            </div>

            {/* Media Upload Section */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📹 Media Attachments (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                You can upload video or audio files, or record them directly to help the doctor understand your condition better.
              </p>

              {/* Recording Controls */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => startRecording('video')}
                    disabled={isRecording}
                    className="btn-secondary text-sm"
                  >
                    📹 Record Video
                  </button>
                  <button
                    type="button"
                    onClick={() => startRecording('audio')}
                    disabled={isRecording}
                    className="btn-secondary text-sm"
                  >
                    🎙️ Record Audio
                  </button>
                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="btn-primary text-sm bg-red-500 hover:bg-red-600"
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}
                </div>

                {/* Video preview during recording */}
                {isRecording && recordingType === 'video' && (
                  <div className="mb-3">
                    <p className="text-sm text-green-600 mb-2">🔴 Recording video...</p>
                    <video ref={videoRef} autoPlay muted playsInline className="w-full max-w-sm h-40 bg-black rounded border" />
                  </div>
                )}
                
                {/* Audio recording indicator */}
                {isRecording && recordingType === 'audio' && (
                  <div className="mb-3 text-center">
                    <p className="text-sm text-green-600 mb-2">🔴 Recording audio...</p>
                    <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full">
                      <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-red-700 text-sm font-medium">Audio Recording</span>
                    </div>
                  </div>
                )}

                {/* File upload */}
                <div>
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isRecording}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max 5 files, 50MB each. Supported: MP4, MOV, AVI, WebM, MP3, WAV, M4A, OGG
                  </p>
                </div>
              </div>

              {/* Selected Files Display */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="mr-2">
                          {file.type.startsWith('video') ? '📹' : '🎵'}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.type}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
              disabled={loading || isRecording}
            >
              {loading ? 'Submitting Request...' : 'Submit Appointment Request'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-title mb-4">Your Appointments</div>
          
          {userAppointments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-500">You don't have any appointments yet.</p>
              <p className="text-sm text-gray-400 mt-2">Book an appointment with a doctor to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userAppointments.map(appointment => {
                const statusInfo = getStatusInfo(appointment);
                return (
                  <div key={appointment._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-800">
                          {appointment.doctorId?.name || 'Unknown Doctor'}
                        </h3>
                        <p className="text-blue-600 font-medium">
                          {appointment.doctorId?.specialization || 'General Physician'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                    </div>
                    
                    {/* Appointment Details Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Appointment Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Requested Date:</span>
                            <span className="text-sm font-medium">{formatDate(appointment.requestedDate)}</span>
                          </div>
                          {appointment.confirmedDate && appointment.status === 'confirmed' && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Confirmed Date:</span>
                              <span className="text-sm font-medium text-green-700">{formatDate(appointment.confirmedDate)}</span>
                            </div>
                          )}
                          {appointment.timeSlot && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Time Slot:</span>
                              <span className="text-sm font-medium text-green-700">{appointment.timeSlot}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Type:</span>
                            <span className="text-sm font-medium capitalize">{appointment.consultationType}</span>
                          </div>
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
                      
                      {appointment.rejectionReason && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-red-700 mb-2">Rejection Reason</h4>
                          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                            {appointment.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t">
                      {appointment.status === 'confirmed' && (
                        <button 
                          onClick={() => onJoinRoom ? onJoinRoom(appointment._id) : null}
                          className="btn-primary text-sm"
                        >
                          Join Consultation
                        </button>
                      )}
                      
                      {appointment.status === 'pending' && (
                        <button 
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel this appointment request?')) {
                              try {
                                await api.put(`/appointments/${appointment._id}`, { status: 'cancelled' });
                                loadUserAppointments();
                                setMessage({ text: 'Appointment cancelled successfully', type: 'success' });
                              } catch (error) {
                                console.error('Error cancelling appointment:', error);
                                setMessage({ text: 'Error cancelling appointment', type: 'error' });
                              }
                            }
                          }}
                          className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                        >
                          Cancel Request
                        </button>
                      )}
                      
                      <div className="text-xs text-gray-500 ml-auto pt-2">
                        Requested: {new Date(appointment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
