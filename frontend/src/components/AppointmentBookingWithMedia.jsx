import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function AppointmentBookingWithMedia({ onJoinRoom, selectedDoctor: doctorFromProps }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  // Media upload states
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null); // 'audio' or 'video'
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadDoctors();
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
      const doctorsList = Object.values(response.data).flat();
      setDoctors(doctorsList);
    } catch (error) {
      setMessage({ text: 'Error loading doctors', type: 'error' });
      console.error('Error loading doctors:', error);
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
        setRecordedBlobs(prev => [...prev, blob]);
        
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !appointmentDate) {
      setMessage({ text: 'Please select a doctor and date', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const userId = user.id || user._id;
      const formData = new FormData();
      
      // Add basic appointment data
      formData.append('patientId', userId);
      formData.append('doctorId', selectedDoctor._id);
      formData.append('requestedDate', appointmentDate);
      formData.append('symptoms', symptoms);
      formData.append('consultationType', consultationType);
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        formData.append('attachments', file);
      });

      const response = await api.post('/appointments/book', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ 
        text: 'Appointment request submitted successfully! The doctor will review and confirm your appointment.', 
        type: 'success' 
      });
      
      // Reset form
      setAppointmentDate('');
      setSymptoms('');
      setSelectedDoctor(null);
      setMediaFiles([]);
      
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                    <video ref={videoRef} autoPlay muted className="w-full max-w-sm h-32 bg-black rounded" />
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
    </div>
  );
}