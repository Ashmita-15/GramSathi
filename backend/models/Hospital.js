import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    address: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    contactPerson: { type: String },
    website: { type: String },
    services: [{ type: String }],
    // Reference to the owner user account
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // References to associated doctors and pharmacies
    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pharmacies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' }]
}, { timestamps: true });

// Create a geospatial index
hospitalSchema.index({ location: '2dsphere' });

// Methods

export default mongoose.model('Hospital', hospitalSchema);