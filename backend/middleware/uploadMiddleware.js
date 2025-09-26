import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const appointmentUploadsDir = path.join(uploadDir, 'appointments');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(appointmentUploadsDir)) {
    fs.mkdirSync(appointmentUploadsDir, { recursive: true });
}

// Storage configuration for appointment media attachments
const appointmentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, appointmentUploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `appointment-${uniqueSuffix}${ext}`);
    }
});

// File filter for appointment media
const appointmentFileFilter = (req, file, cb) => {
    // Accept video and audio files
    const allowedMimeTypes = [
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/webm',
        'audio/mp3',
        'audio/wav',
        'audio/m4a',
        'audio/webm',
        'audio/ogg'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only video and audio files are allowed!'), false);
    }
};

// Multer upload configuration
export const uploadAppointmentMedia = multer({
    storage: appointmentStorage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: appointmentFileFilter
}).array('attachments', 5); // Allow up to 5 files

// Middleware to handle upload errors
export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File too large. Maximum size is 50MB.' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                message: 'Too many files. Maximum is 5 files.' 
            });
        }
    } else if (err) {
        return res.status(400).json({ 
            message: err.message 
        });
    }
    next();
};