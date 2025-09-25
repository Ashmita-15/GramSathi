import { Router } from 'express';
import { authRequired, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    createHospitalProfile,
    getHospitalProfile,
    updateHospitalProfile,
    addDoctorToHospital,
    removeDoctorFromHospital,
    addPharmacyToHospital,
    removePharmacyFromHospital,
    getDoctorsInHospital,
    getPharmaciesInHospital
} from '../controllers/hospitalController.js';

const router = Router();

// Hospital profile routes
router.post('/create', authRequired, authorizeRoles('hospital'), createHospitalProfile);
router.get('/my/profile', authRequired, authorizeRoles('hospital'), getHospitalProfile);
router.put('/my/profile', authRequired, authorizeRoles('hospital'), updateHospitalProfile);

// Doctor management routes
router.post('/doctors/add', authRequired, authorizeRoles('hospital'), addDoctorToHospital);
router.delete('/doctors/remove', authRequired, authorizeRoles('hospital'), removeDoctorFromHospital);
router.get('/doctors', authRequired, authorizeRoles('hospital'), getDoctorsInHospital);

// Pharmacy management routes
router.post('/pharmacies/add', authRequired, authorizeRoles('hospital'), addPharmacyToHospital);
router.delete('/pharmacies/remove', authRequired, authorizeRoles('hospital'), removePharmacyFromHospital);
router.get('/pharmacies', authRequired, authorizeRoles('hospital'), getPharmaciesInHospital);

export default router;