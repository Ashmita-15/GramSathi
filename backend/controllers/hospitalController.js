import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';

// Create hospital profile
export const createHospitalProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, phone, address, description, location, contactPerson, website, services } = req.body;
        
        // Check if user is hospital role
        const user = await User.findById(userId);
        if (!user || user.role !== 'hospital') {
            return res.status(403).json({ message: 'Unauthorized to create hospital profile' });
        }
        
        // Check if hospital already exists for this user
        const existingHospital = await Hospital.findOne({ ownerId: userId });
        if (existingHospital) {
            return res.status(400).json({ message: 'Hospital profile already exists' });
        }
        
        // Create hospital
        const hospital = await Hospital.create({
            name,
            email,
            phone,
            address,
            description,
            location: {
                type: 'Point',
                coordinates: location.coordinates
            },
            contactPerson,
            website,
            services,
            ownerId: userId
        });
        
        // Update user with hospitalId
        await User.findByIdAndUpdate(userId, { hospitalId: hospital._id });
        
        res.status(201).json(hospital);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Get hospital profile
export const getHospitalProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const hospital = await Hospital.findOne({ ownerId: userId })
            .populate('doctors', 'name email specialization qualification phone')
            .populate('pharmacies', 'name location address contact email');
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        res.json(hospital);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Update hospital profile
export const updateHospitalProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, phone, address, description, location, contactPerson, website, services, isActive } = req.body;
        
        const hospital = await Hospital.findOne({ ownerId: userId });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        // Update fields
        if (name) hospital.name = name;
        if (email) hospital.email = email;
        if (phone) hospital.phone = phone;
        if (address) hospital.address = address;
        if (description) hospital.description = description;
        if (location && location.coordinates) {
            hospital.location.coordinates = location.coordinates;
        }
        if (contactPerson) hospital.contactPerson = contactPerson;
        if (website) hospital.website = website;
        if (services) hospital.services = services;
        if (isActive !== undefined) hospital.isActive = isActive;
        
        await hospital.save();
        
        res.json(hospital);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Add doctor to hospital
export const addDoctorToHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doctorId } = req.body;
        
        // Find hospital
        const hospital = await Hospital.findOne({ ownerId: userId });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        // Check if doctor exists and is a doctor role
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(400).json({ message: 'Invalid doctor ID' });
        }
        
        // Check if doctor is already associated with hospital
        if (hospital.doctors.includes(doctorId)) {
            return res.status(400).json({ message: 'Doctor already associated with this hospital' });
        }
        
        // Add doctor to hospital
        hospital.doctors.push(doctorId);
        await hospital.save();
        
        // Update doctor's hospitalId
        await User.findByIdAndUpdate(doctorId, { hospitalId: hospital._id });
        
        res.json({ message: 'Doctor added successfully', hospital });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Remove doctor from hospital
export const removeDoctorFromHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doctorId } = req.body;
        
        // Find hospital
        const hospital = await Hospital.findOne({ ownerId: userId });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        // Check if doctor is associated with hospital
        if (!hospital.doctors.includes(doctorId)) {
            return res.status(400).json({ message: 'Doctor not associated with this hospital' });
        }
        
        // Remove doctor from hospital
        hospital.doctors = hospital.doctors.filter(id => id.toString() !== doctorId.toString());
        await hospital.save();
        
        // Update doctor's hospitalId
        await User.findByIdAndUpdate(doctorId, { hospitalId: null });
        
        res.json({ message: 'Doctor removed successfully', hospital });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Add pharmacy to hospital
export const addPharmacyToHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pharmacyId } = req.body;
        
        // Find hospital
        const hospital = await Hospital.findOne({ ownerId: userId });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        // Check if pharmacy exists
        const pharmacy = await Pharmacy.findById(pharmacyId);
        if (!pharmacy) {
            return res.status(400).json({ message: 'Invalid pharmacy ID' });
        }
        
        // Check if pharmacy is already associated with hospital
        if (hospital.pharmacies.includes(pharmacyId)) {
            return res.status(400).json({ message: 'Pharmacy already associated with this hospital' });
        }
        
        // Add pharmacy to hospital
        hospital.pharmacies.push(pharmacyId);
        await hospital.save();
        
        res.json({ message: 'Pharmacy added successfully', hospital });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Remove pharmacy from hospital
export const removePharmacyFromHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pharmacyId } = req.body;
        
        // Find hospital
        const hospital = await Hospital.findOne({ ownerId: userId });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        // Check if pharmacy is associated with hospital
        if (!hospital.pharmacies.includes(pharmacyId)) {
            return res.status(400).json({ message: 'Pharmacy not associated with this hospital' });
        }
        
        // Remove pharmacy from hospital
        hospital.pharmacies = hospital.pharmacies.filter(id => id.toString() !== pharmacyId.toString());
        await hospital.save();
        
        res.json({ message: 'Pharmacy removed successfully', hospital });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Get all doctors in hospital
export const getDoctorsInHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const hospital = await Hospital.findOne({ ownerId: userId }).populate('doctors', 'name email specialization qualification phone availability');
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        res.json(hospital.doctors);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// Get all pharmacies in hospital
export const getPharmaciesInHospital = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const hospital = await Hospital.findOne({ ownerId: userId }).populate('pharmacies', 'name location address contact email');
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital profile not found' });
        }
        
        res.json(hospital.pharmacies);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};