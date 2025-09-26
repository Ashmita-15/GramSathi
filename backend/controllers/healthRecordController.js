import PDFDocument from 'pdfkit';
import HealthRecord from '../models/HealthRecord.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

export const createRecord = async (req, res) => {
    try {
        const { patientId, appointmentId, diagnosis, prescription } = req.body;
        const rec = await HealthRecord.create({ patientId, appointmentId, diagnosis, prescription });
        res.status(201).json(rec);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const getRecordsForPatient = async (req, res) => {
    try {
        const { patientId } = req.params;
        const records = await HealthRecord.find({ patientId })
            .populate('appointmentId')
            .populate({
                path: 'appointmentId',
                populate: { path: 'doctorId', select: 'name specialization' }
            })
            .sort({ createdAt: -1 });
        res.json(records);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const downloadPatientHistoryPdf = async (req, res) => {
    try {
        const { patientId } = req.params;
        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        const records = await HealthRecord.find({ patientId })
            .populate('appointmentId')
            .populate({
                path: 'appointmentId',
                populate: { path: 'doctorId', select: 'name specialization' }
            })
            .sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=health_records_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);
        
        // Header
        doc.fontSize(20).text('HEALTH RECORDS', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).text(`Patient: ${patient.name}`, { underline: true });
        doc.fontSize(12).text(`Age: ${patient.age || 'N/A'}`);
        doc.text(`Village: ${patient.village || 'N/A'}`);
        doc.text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown(1);
        
        if (records.length === 0) {
            doc.text('No health records found.');
        } else {
            records.forEach((record, index) => {
                doc.fontSize(14).text(`Record #${index + 1}`, { underline: true });
                doc.fontSize(10).text(`Date: ${new Date(record.createdAt).toLocaleString()}`);
                if (record.appointmentId && record.appointmentId.doctorId) {
                    doc.text(`Doctor: ${record.appointmentId.doctorId.name}`);
                    doc.text(`Specialization: ${record.appointmentId.doctorId.specialization || 'General Physician'}`);
                }
                doc.fontSize(12).text(`\nDiagnosis: ${record.diagnosis}`);
                if (record.prescription) {
                    doc.text(`\nPrescription: ${record.prescription}`);
                }
                doc.moveDown(1);
                
                // Add a line separator between records
                if (index < records.length - 1) {
                    doc.strokeColor('#cccccc').lineWidth(1)
                       .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(0.5);
                }
            });
        }
        
        doc.end();
    } catch (e) {
        console.error('Error generating PDF:', e);
        res.status(500).json({ message: e.message });
    }
};

// Download individual health record as PDF
export const downloadIndividualRecordPdf = async (req, res) => {
    try {
        const { patientId, recordId } = req.params;
        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        const record = await HealthRecord.findById(recordId)
            .populate('appointmentId')
            .populate({
                path: 'appointmentId',
                populate: { path: 'doctorId', select: 'name specialization' }
            });
            
        if (!record || record.patientId.toString() !== patientId) {
            return res.status(404).json({ message: 'Health record not found' });
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=health_record_${patient.name.replace(/\s+/g, '_')}_${new Date(record.createdAt).toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);
        
        // Header
        doc.fontSize(20).text('HEALTH RECORD', { align: 'center' });
        doc.moveDown(1);
        
        // Patient Information
        doc.fontSize(16).text('Patient Information', { underline: true });
        doc.fontSize(12)
           .text(`Name: ${patient.name}`)
           .text(`Age: ${patient.age || 'N/A'}`)
           .text(`Village: ${patient.village || 'N/A'}`);
        doc.moveDown(1);
        
        // Record Information
        doc.fontSize(16).text('Medical Record', { underline: true });
        doc.fontSize(12).text(`Date: ${new Date(record.createdAt).toLocaleString()}`);
        
        if (record.appointmentId && record.appointmentId.doctorId) {
            doc.text(`Doctor: ${record.appointmentId.doctorId.name}`);
            doc.text(`Specialization: ${record.appointmentId.doctorId.specialization || 'General Physician'}`);
        }
        
        doc.moveDown(0.5);
        doc.fontSize(14).text('Diagnosis:', { underline: true });
        doc.fontSize(12).text(record.diagnosis);
        
        if (record.prescription) {
            doc.moveDown(0.5);
            doc.fontSize(14).text('Prescription:', { underline: true });
            doc.fontSize(12).text(record.prescription);
        }
        
        doc.moveDown(1);
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        
        doc.end();
    } catch (e) {
        console.error('Error generating individual record PDF:', e);
        res.status(500).json({ message: e.message });
    }
};


