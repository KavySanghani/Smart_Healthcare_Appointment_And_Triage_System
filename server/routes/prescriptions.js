const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const sendEmail = require('../utils/email_utils');
const PDFDocument = require('pdfkit');

async function sendPrescriptionSummaryEmail(medicalRecord, patient, doctor) {
  if (!patient || !patient.email) {
    console.error('Cannot send prescription summary: Patient email is missing.');
    return;
  }

  try {
    const followUpDateFormatted = medicalRecord.follow_up_required && medicalRecord.follow_up_date
      ? new Date(medicalRecord.follow_up_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : null;

    const prescriptionList = medicalRecord.prescription || [];

    const prescriptionHtmlList = prescriptionList.length > 0
      ? '<ul style="padding-left: 20px; margin: 0;">' + prescriptionList.map(item =>
        `<li style="margin-bottom: 12px;">
           <strong style="color: #111827; font-size: 16px;">${item.medication || 'Item'}</strong><br> 
           ${item.dosage ? `<span style="color: #555;">Dosage:</span> ${item.dosage}<br>` : ''}
           ${item.frequency ? `<span style="color: #555;">Frequency:</span> ${item.frequency}<br>` : ''}
           ${item.instructions ? `<span style="color: #555;">Instructions:</span> ${item.instructions}` : ''}
         </li>`
      ).join('') + '</ul>'
      : '<p style="margin: 0;">No specific prescription items listed.</p>';

    const followUpHtml = medicalRecord.follow_up_required && followUpDateFormatted
      ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Follow-up Details</h3>
        <div style="color: #155724; line-height: 1.7;">
          <p style="margin: 8px 0;"><strong>Recommended Date:</strong> ${followUpDateFormatted}</p>
          ${medicalRecord.follow_up_notes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${medicalRecord.follow_up_notes}</p>` : ''}
        </div>
      </div>
      `
      : '';

    const actionsHtml = medicalRecord.follow_up_required ? `
      <div style="text-align: center; margin: 30px 0 15px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 
           style="background-color: #0F5257; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
          Book Follow-up
        </a>
      </div>
      ` : '';

    const emailHtml = `
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7f6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #0F5257; color: #ffffff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Consultation Summary</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0; margin-bottom: 20px; font-size: 22px;">Dear ${patient.full_name},</h2>
            <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">
              Here is the summary from your recent consultation with ${doctor.full_name || 'your doctor'}.
            </p>

            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Diagnosis</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="color: #333; line-height: 1.6; font-size: 16px; margin: 0;">${medicalRecord.diagnosis}</p>
              </div>
            </div>

            ${medicalRecord.notes ? `
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Doctor's Notes</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="color: #333; line-height: 1.6; font-size: 16px; margin: 0;">${medicalRecord.notes}</p>
              </div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Prescription (Rx)</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 16px; line-height: 1.7;">
                ${prescriptionHtmlList}
              </div>
            </div>
            
            ${followUpHtml}
            ${actionsHtml}
            
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; margin: 0 30px; padding: 20px 0; text-align: center; color: #888888; font-size: 12px;">
            <p style="margin: 0;">Thank you for choosing IntelliConsult.</p>
            <p style="margin: 5px 0 0 0;">This is an auto-generated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    `;

    await sendEmail({
      email: patient.email,
      subject: `🩺 Your Consultation Summary - IntelliConsult`,
      html: emailHtml
    });

  } catch (emailError) {
    console.error('Error sending prescription summary email:', emailError);
  }
}

router.post('/', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const {
      appointmentId,
      diagnosis,
      notes,
      prescription,
      followUpRequired,
      followUpDate,
      followUpNotes
    } = req.body;

    const normalizedAppointmentId = appointmentId?.trim();

    if (!normalizedAppointmentId || !diagnosis) {
      return res.status(400).json({ message: 'Appointment ID and diagnosis are required.' });
    }

    const { data: appointment, error: aptErr } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*)
      `)
      .eq('id', normalizedAppointmentId)
      .maybeSingle();

    if (!appointment || aptErr) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctor_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. This appointment does not belong to you.' });
    }

    const { data: existingRecord } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', normalizedAppointmentId)
      .maybeSingle();

    if (existingRecord) {
      return res.status(400).json({ message: 'Prescription already exists for this appointment. Use update endpoint instead.' });
    }

    const { data: medicalRecord, error: insertErr } = await supabase.from('medical_records').insert([{
        appointment_id: normalizedAppointmentId,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        diagnosis: diagnosis.trim(),
        notes: notes ? notes.trim() : '',
        prescription: prescription || [],
        follow_up_required: followUpRequired || false,
        follow_up_date: followUpRequired && followUpDate ? new Date(followUpDate).toISOString().split('T')[0] : null,
        follow_up_notes: followUpRequired && followUpNotes ? followUpNotes.trim() : '',
        created_by_id: req.user.userId
    }]).select().single();

    if (insertErr) throw insertErr;

    try {
      await sendPrescriptionSummaryEmail(medicalRecord, appointment.patient, appointment.doctor);
    } catch (emailError) {
      console.error('Error queuing prescription summary email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Prescription saved successfully',
      medicalRecord
    });

  } catch (err) {
    console.error('Error creating prescription:', err);
    res.status(500).json({ message: 'Server error while saving prescription.' });
  }
});

router.get('/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const normalizedAppointmentId = appointmentId?.trim();

    if (!normalizedAppointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const { data: appointment, error: aptErr } = await supabase
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .eq('id', normalizedAppointmentId)
      .maybeSingle();

    if (!appointment || aptErr) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (req.user.userType === 'doctor' && appointment.doctor_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (req.user.userType === 'patient' && appointment.patient_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { data: medicalRecord, error: recErr } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctor:doctors(full_name, specialization),
        patient:patients(full_name, email),
        appointment:appointments(date)
      `)
      .eq('appointment_id', normalizedAppointmentId)
      .maybeSingle();

    if (!medicalRecord || recErr) {
      return res.status(404).json({ message: 'Prescription not found for this appointment.' });
    }

    res.json({
      success: true,
      medicalRecord
    });

  } catch (err) {
    console.error('Error fetching prescription:', err);
    res.status(500).json({ message: 'Server error while fetching prescription.' });
  }
});

router.get('/:recordId/pdf', authMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;

    const { data: medicalRecord, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctor:doctors(id, full_name, specialization),
        patient:patients(id, full_name, email),
        appointment:appointments(date, time)
      `)
      .eq('id', recordId)
      .maybeSingle();

    if (!medicalRecord || error) {
      return res.status(404).json({ message: 'Medical record not found.' });
    }

    const isDoctor = req.user.userType === 'doctor' && medicalRecord.doctor_id === req.user.userId;
    const isPatient = req.user.userType === 'patient' && medicalRecord.patient_id === req.user.userId;

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const doc = new PDFDocument({ margin: 50 });

    const filename = `Prescription-${medicalRecord.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fillColor('#0F5257').fontSize(26).font('Helvetica-Bold').text('IntelliConsult', 50, 50);
    
    doc.strokeColor('#0F5257').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();
    
    doc.moveDown(1); 
    doc.fontSize(20).fillColor('#000').font('Helvetica-Bold').text('Consultation Summary', { align: 'left' });
    doc.moveDown(2);

    const infoTop = doc.y;
    doc.fontSize(12).fillColor('#555');
    doc.font('Helvetica-Bold').text('Patient:', 50, infoTop);
    doc.font('Helvetica').text(medicalRecord.patient.full_name, 110, infoTop);
    
    doc.font('Helvetica-Bold').text('Doctor:', 300, infoTop);
    doc.font('Helvetica').text(medicalRecord.doctor.full_name, 360, infoTop);

    doc.font('Helvetica-Bold').text('Email:', 50, infoTop + 20);
    doc.font('Helvetica').text(medicalRecord.patient.email, 110, infoTop + 20);

    doc.font('Helvetica-Bold').text('Specialization:', 300, infoTop + 20);
    doc.font('Helvetica').text(medicalRecord.doctor.specialization, 390, infoTop + 20);

    doc.font('Helvetica-Bold').text('Consultation Date:', 50, infoTop + 40);
    doc.font('Helvetica').text(new Date(medicalRecord.appointment.date).toLocaleDateString(), 160, infoTop + 40);
    
    doc.moveDown(5);

    const drawSection = (title, content) => {
      if (!content) return;
      doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text(title);
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#333').font('Helvetica').text(content, { width: 500, align: 'left' });
      doc.moveDown(2);
    };

    drawSection('Diagnosis', medicalRecord.diagnosis);

    doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text('Prescription (Rx)');
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(1);

    const prescriptionList = medicalRecord.prescription || [];

    if (prescriptionList.length > 0) {
      prescriptionList.forEach(med => {
        doc.fontSize(13).fillColor('#000').font('Helvetica-Bold').text(med.medication || 'N/A');
        doc.moveDown(0.2);
        doc.fontSize(12).fillColor('#333').font('Helvetica');
        doc.text(`Dosage: ${med.dosage || 'N/A'}`, { indent: 15 });
        doc.text(`Frequency: ${med.frequency || 'N/A'}`, { indent: 15 });
        doc.text(`Instructions: ${med.instructions || 'N/A'}`, { indent: 15 });
        doc.moveDown(1);
      });
    } else {
      doc.fontSize(12).fillColor('#333').font('Helvetica').text('No medications prescribed.');
      doc.moveDown(2);
    }
    
    doc.moveDown(1);
    drawSection("Doctor's Notes", medicalRecord.notes);

    if (medicalRecord.follow_up_required) {
      doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text('Follow-up Required');
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#333').font('Helvetica');
      doc.text(`Date: ${new Date(medicalRecord.follow_up_date).toLocaleDateString()}`);
      if (medicalRecord.follow_up_notes) {
        doc.text(`Notes: ${medicalRecord.follow_up_notes}`);
      }
      doc.moveDown(2);
    }

    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, 710).lineTo(550, 710).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('grey');
    doc.text(`Record ID: ${medicalRecord.id}`, 50, 720, { align: 'left' });
    doc.text('IntelliConsult | Confidential', 50, 735, { align: 'left' });

    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ message: 'Server error while generating PDF.' });
  }
});

router.get('/doctor', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const { data: records, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        patient:patients(full_name, email),
        appointment:appointments(date, time, primary_reason)
      `)
      .eq('doctor_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: (records || []).length,
      records
    });
  } catch (err) {
    console.error('Error fetching doctor prescriptions:', err);
    res.status(500).json({ message: 'Server error while fetching prescriptions.' });
  }
});

router.get('/patient', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Not a patient.' });
  }

  try {
    const { data: records, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctor:doctors(full_name, specialization),
        appointment:appointments(date, time, primary_reason)
      `)
      .eq('patient_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: (records || []).length,
      records
    });
  } catch (err) {
    console.error('Error fetching patient prescriptions:', err);
    res.status(500).json({ message: 'Server error while fetching prescriptions.' });
  }
});

router.put('/:recordId', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const { recordId } = req.params;
    const {
      diagnosis,
      notes,
      prescription,
      followUpRequired,
      followUpDate,
      followUpNotes
    } = req.body;

    const { data: medicalRecord, error: findErr } = await supabase
      .from('medical_records')
      .select(`
        *,
        patient:patients(full_name, email),
        doctor:doctors(full_name)
      `)
      .eq('id', recordId)
      .maybeSingle();

    if (!medicalRecord || findErr) {
      return res.status(404).json({ message: 'Medical record not found.' });
    }

    if (medicalRecord.doctor_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. This record does not belong to you.' });
    }

    const updateData = {};
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis.trim();
    if (notes !== undefined) updateData.notes = notes.trim();
    if (prescription !== undefined) updateData.prescription = prescription;
    
    if (followUpRequired !== undefined) {
        updateData.follow_up_required = followUpRequired;
    }
    
    if (followUpDate !== undefined) {
      updateData.follow_up_date = updateData.follow_up_required && followUpDate ? new Date(followUpDate).toISOString().split('T')[0] : null;
    }

    if (followUpNotes !== undefined) {
      updateData.follow_up_notes = updateData.follow_up_required && followUpNotes ? followUpNotes.trim() : '';
    }

    const { data: updatedMedicalRecord, error: updateErr } = await supabase
      .from('medical_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    try {
      await sendPrescriptionSummaryEmail(updatedMedicalRecord, medicalRecord.patient, medicalRecord.doctor);
    } catch (emailError) {
      console.error('Error queuing prescription summary email:', emailError);
    }

    res.json({
      success: true,
      message: 'Prescription updated successfully',
      medicalRecord: updatedMedicalRecord
    });

  } catch (err) {
    console.error('Error updating prescription:', err);
    res.status(500).json({ message: 'Server error while updating prescription.' });
  }
});

module.exports = router;