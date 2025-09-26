import { Router } from 'express';
import { authRequired, authorizeRoles } from '../middleware/authMiddleware.js';
import { createRecord, getRecordsForPatient, downloadPatientHistoryPdf, downloadIndividualRecordPdf } from '../controllers/healthRecordController.js';

const router = Router();

router.post('/create', authRequired, authorizeRoles('doctor'), createRecord);
router.get('/:patientId', authRequired, getRecordsForPatient);
router.get('/:patientId/download', authRequired, downloadPatientHistoryPdf);
router.get('/:patientId/download/:recordId', authRequired, downloadIndividualRecordPdf);

export default router;


