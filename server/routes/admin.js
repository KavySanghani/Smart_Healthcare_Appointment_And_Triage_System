const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const supabase = require('../config/supabase');
const sendEmail = require('../utils/email_utils');

router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { 
      name, email, license, status, specialization,
      patientName, patientEmail, patientDateFrom, patientDateTo
    } = req.query;

    let doctorQuery = supabase.from('doctors').select('*').order('created_at', { ascending: false });
    
    if (name) doctorQuery = doctorQuery.ilike('full_name', `%${name}%`);
    if (email) doctorQuery = doctorQuery.ilike('email', `%${email}%`);
    if (license) doctorQuery = doctorQuery.ilike('license_number', `%${license}%`);
    if (specialization && specialization !== 'all') doctorQuery = doctorQuery.eq('specialization', specialization);
    if (status && status !== 'all') doctorQuery = doctorQuery.eq('is_verified', status === 'verified');

    let patientQuery = supabase.from('patients').select('*').order('created_at', { ascending: false });
    
    if (patientName) patientQuery = patientQuery.ilike('full_name', `%${patientName}%`);
    if (patientEmail) patientQuery = patientQuery.ilike('email', `%${patientEmail}%`);
    if (patientDateFrom) patientQuery = patientQuery.gte('created_at', new Date(patientDateFrom).toISOString());
    if (patientDateTo) patientQuery = patientQuery.lte('created_at', new Date(patientDateTo + 'T23:59:59').toISOString());

    const { data: rawPatients, error: pErr } = await patientQuery;
    const { data: rawDoctors, error: dErr } = await doctorQuery;

    if (pErr) throw pErr;
    if (dErr) throw dErr;

    // Remove passwords and map to camelCase for the frontend if needed, 
    // or just send snake_case since frontend might expect the old Prisma camelCase.
    // Assuming frontend was dealing with Prisma, we should probably keep snake_case or adapt.
    // For safety, let's just return the raw and let frontend handle it (they're mostly same except underscores).
    const patients = rawPatients.map(p => { const { password, ...rest } = p; return rest; });
    const doctors = rawDoctors.map(d => { const { password, ...rest } = d; return rest; });

    res.json({ patients, doctors });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/appointments', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(full_name, email),
        doctor:doctors(full_name, email, specialization)
      `)
      .order('date', { ascending: false });
      
    if (error) throw error;

    // We can map patient/doctor to camelCase if strictly needed, but let's pass them as returned.
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/verify-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { data: doctor, error: findErr } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();

    if (!doctor || findErr) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { data: updatedDoctor, error: updateErr } = await supabase
      .from('doctors')
      .update({ is_verified: true })
      .eq('id', doctorId)
      .select()
      .single();
      
    if (updateErr) throw updateErr;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0891b2; margin: 0; font-size: 28px;">🎉 Verification Complete!</h1>
          </div>
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Dear Dr. ${updatedDoctor.full_name},</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Congratulations! Your verification has been successfully completed by our admin team.
            </p>
          </div>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0891b2; margin: 25px 0;">
            <p style="color: #0369a1; font-weight: 600; margin: 0; font-size: 16px;">
              🚀 You can now start your consultancy journey with IntelliConsult!
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
               style="background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Login to Your Dashboard
            </a>
          </div>
        </div>
      </div>
    `;

          const emailSent = await sendEmail({
        email: updatedDoctor.email,
        subject: '🎉 Verification Complete - Start Your Consultancy Journey!',
        html: emailHtml
      });
      if (!emailSent) {
        console.error('Error sending verification email to doctor.');
      }

    res.json({ message: 'Doctor verified successfully', doctor: updatedDoctor });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/suspend-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const doctorId = req.params.id;
      const { data: doctor, error: findErr } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
  
      if (!doctor || findErr) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      const { data: updatedDoctor, error: updateErr } = await supabase
        .from('doctors')
        .update({ is_verified: false })
        .eq('id', doctorId)
        .select()
        .single();
        
      if (updateErr) throw updateErr;
      
      const { data: cancelledAppointments, error: cancelErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('doctor_id', doctorId)
        .eq('status', 'upcoming')
        .select();
        
      if (!cancelErr && cancelledAppointments) {
        console.log(`Cancelled ${cancelledAppointments.length} appointments for suspended doctor.`);
      }
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f2;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #e11d48;">
            <h1 style="color: #e11d48; margin-top: 0;">Account Suspended</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear Dr. ${updatedDoctor.full_name},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Your IntelliConsult account has been temporarily suspended.
              <strong>Any upcoming appointments have been automatically cancelled.</strong>
            </p>
            </div>
        </div>
      `;
  
            const emailSent = await sendEmail({
          email: updatedDoctor.email,
          subject: '⚠️ IntelliConsult Account Suspended',
          html: emailHtml,
      });
      if (!emailSent) {
          console.error("Failed to send suspension email to doctor.");
      }
      
      res.json({ message: 'Doctor suspended and appointments cancelled successfully', doctor: updatedDoctor });
    
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

router.delete('/reject-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { data: doctor, error: findErr } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();

        if (!doctor || findErr) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #333; margin-top: 0; margin-bottom: 20px;">Application Status Update</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear Dr. ${doctor.full_name},</p>
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
                  Thank you for your interest in joining IntelliConsult. After carefully reviewing your profile, 
                  we are unable to approve your application at this time.
                </p>
                <p style="color: #666; line-height: 1.6;">
                  Your account information has been removed from our system. You are welcome to re-apply in the future if your qualifications change.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
                    Best regards,<br>
                    <strong>IntelliConsult Admin Team</strong>
                  </p>
                </div>
              </div>
            </div>
        `;

                const emailSent = await sendEmail({
            email: doctor.email,
            subject: 'IntelliConsult Application Status',
            html: emailHtml,
        });
        if (!emailSent) {
            console.error("Failed to send rejection email to doctor.");
        }

        await supabase.from('doctors').delete().eq('id', doctorId);
        
        res.json({ message: 'Doctor rejected and removed successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/verify-patient/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const patientId = req.params.id;
      const { data: patient, error: findErr } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
  
      if (!patient || findErr) {
        return res.status(404).json({ message: 'Patient not found' });
      }
  
      const { data: updatedPatient, error: updateErr } = await supabase
        .from('patients')
        .update({ is_verified: true })
        .eq('id', patientId)
        .select()
        .single();
        
      if (updateErr) throw updateErr;
  
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0fdf4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #16a34a;">
            <h1 style="color: #16a34a; margin-top: 0;">Account Reactivated</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${updatedPatient.full_name},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Great news! Your IntelliConsult account has been reactivated by our administrative team.
            </p>
            <p style="color: #666; line-height: 1.6;">
              You can now log in, search for doctors, and book appointments as usual.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
                 style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Login to Portal
              </a>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
                Best regards,<br>
                <strong>IntelliConsult Admin Team</strong>
              </p>
            </div>
          </div>
        </div>
      `;
  
            const emailSent = await sendEmail({
        email: updatedPatient.email,
        subject: '✅ IntelliConsult Account Reactivated',
        html: emailHtml
      });
      if (!emailSent) {
        console.error('Error sending patient verification email.');
      }
  
      res.json({ message: 'Patient verified successfully', patient: updatedPatient });
  
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

router.put('/suspend-patient/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const patientId = req.params.id;
      const { data: patient, error: findErr } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
  
      if (!patient || findErr) {
        return res.status(404).json({ message: 'Patient not found' });
      }
  
      const { data: updatedPatient, error: updateErr } = await supabase
        .from('patients')
        .update({ is_verified: false })
        .eq('id', patientId)
        .select()
        .single();
        
      if (updateErr) throw updateErr;
      
      const { data: cancelledAppointments, error: cancelErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('patient_id', patientId)
        .eq('status', 'upcoming')
        .select();
        
      if (!cancelErr && cancelledAppointments) {
        console.log(`Cancelled ${cancelledAppointments.length} appointments for suspended patient.`);
      }
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f2;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #e11d48;">
            <h1 style="color: #e11d48; margin-top: 0;">Account Suspended</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${updatedPatient.full_name},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              We are writing to inform you that your IntelliConsult account has been temporarily suspended.
              <strong>All your upcoming appointments have been cancelled.</strong>
            </p>
            </div>
        </div>
      `;
  
            const emailSent = await sendEmail({
          email: updatedPatient.email,
          subject: '⚠️ IntelliConsult Account Suspended',
          html: emailHtml,
      });
      if (!emailSent) {
          console.error("Failed to send suspension email to patient.");
      }
      
      res.json({ message: 'Patient suspended and appointments cancelled successfully', patient: updatedPatient });
    
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

router.get('/user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    let { data: user } = await supabase.from('doctors').select('*').eq('id', userId).maybeSingle();
    
    if (!user) {
      let { data: patient } = await supabase.from('patients').select('*').eq('id', userId).maybeSingle();
      user = patient;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);

  } catch (error) {
    console.error('Error fetching user details for admin:', error);
    res.status(500).json({ message: 'Server error while fetching user details' });
  }
});

module.exports = router;