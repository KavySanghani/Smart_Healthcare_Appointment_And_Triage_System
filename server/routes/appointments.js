const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const sendEmail = require('../utils/email_utils');

// Import Razorpay
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.get('/available-slots/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const { data: doctor, error: docErr } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
    
    if (!doctor || docErr) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const { data: bookedAppointments, error: aptErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status', 'upcoming');

    if (aptErr) throw aptErr;

    const bookedSlots = new Set();
    (bookedAppointments || []).forEach(apt => {
      const dateTimeString = `${new Date(apt.date).toDateString()}_${apt.time}`;
      bookedSlots.add(dateTimeString);
    });

    const blockedTimes = doctor?.blockedTimes || doctor?.blocked_times || [];
    const workingHours = doctor?.workingHours || doctor?.working_hours || {};

    const availableSlots = [];
    const slotDuration = 60; 
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = new Date();

    for (let i = 0; i < 14; i++) { 
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayKey = daysOfWeek[date.getDay()];
      const daySchedule = workingHours[dayKey];

      if (daySchedule?.enabled && daySchedule?.start && daySchedule?.end) {
        const [startHour, startMin] = daySchedule.start.split(':').map(Number);
        const [endHour, endMin] = daySchedule.end.split(':').map(Number);

        const startTime = new Date(date.setHours(startHour, startMin, 0, 0));
        const endTime = new Date(date.setHours(endHour, endMin, 0, 0));

        let currentSlotTime = new Date(startTime);
        while (currentSlotTime < endTime) {
          const timeString = currentSlotTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const dateString = currentSlotTime.toDateString();
          const dateTimeString = `${dateString}_${timeString}`;
          let isBlocked = false;
          for (const block of blockedTimes) {
            const blockDate = block?.date ? new Date(block.date).toDateString() : null;
            if (blockDate === dateString) {
              const slotTime = currentSlotTime.toTimeString().substring(0, 5); // "HH:MM"
              const bStart = block?.startTime || block?.start_time;
              const bEnd = block?.endTime || block?.end_time;
              if (bStart && bEnd && slotTime >= bStart && slotTime < bEnd) {
                isBlocked = true;
                break;
              }
            }
          }
          if (!bookedSlots.has(dateTimeString) && !isBlocked) {
            availableSlots.push({
              date: currentSlotTime.toISOString().split('T')[0],
              time: timeString
            });
          }
          
          currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotDuration);
        }
      }
    }
    res.json(availableSlots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/appointments/my-appointments
// @desc    Get all appointments for the logged-in patient
// @access  Private (Patient only)
router.get('/my-appointments', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Not a patient.' });
  }
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`*, doctor:doctors(full_name, specialization)`)
      .eq('patient_id', req.user.userId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/doctor', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`*, patient:patients(full_name, email)`)
      .eq('doctor_id', req.user.userId)
      .order('date', { ascending: true });
      
    if (error) throw error;
    
    // Filter out appointments where patient is null
    const validAppointments = (appointments || []).filter(appointment => appointment.patient);
    
    res.json(validAppointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/appointments/book
// @desc    Book a new appointment
// @access  Private (Patient only)
router.post('/book', authMiddleware, async (req, res) => {
  const {
    doctorId, date, time, patientNameForVisit,
    emergencyDisclaimerAcknowledged,
    primaryReason,
    symptomsList,
    symptomsOther,
    symptomsBegin,
    severeSymptomsCheck,
    preExistingConditions,
    preExistingConditionsOther,
    pastSurgeries,
    familyHistory,
    familyHistoryOther,
    allergies,
    medications,
    consentToAI
  } = req.body;

  try {
    if (!doctorId || !date || !time || !patientNameForVisit || !primaryReason) {
      return res.status(400).json({ message: 'Missing required fields: doctor, date, time, patient name, or reason.' });
    }

    const dateStr = new Date(date).toISOString().split('T')[0];

    const { data: existingAppointment, error: existErr } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('date', dateStr)
        .eq('time', time)
        .eq('status', 'upcoming')
        .maybeSingle();

    if (existingAppointment && !existErr) {
      return res.status(409).json({ message: 'This time slot is no longer available. Please select another.' });
    }

    const { data: doctor, error: docErr } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
    
    if (!doctor || docErr) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }
    const fee = doctor.consultation_fee || 0;

    const { data: appointment, error: insertErr } = await supabase.from('appointments').insert([{
        patient_id: req.user.userId,
        doctor_id: doctorId,
        date: dateStr,
        time,
        patient_name_for_visit: patientNameForVisit,
        consultation_fee_at_booking: fee,
        payment_status: 'pending',
        emergency_disclaimer_acknowledged: emergencyDisclaimerAcknowledged || false,
        primary_reason: primaryReason,
        symptoms_list: symptomsList || [],
        symptoms_other: symptomsOther || "",
        symptoms_begin: symptomsBegin || "",
        severe_symptoms_check: severeSymptomsCheck || [],
        pre_existing_conditions: preExistingConditions || [],
        pre_existing_conditions_other: preExistingConditionsOther || "",
        past_surgeries: pastSurgeries || "",
        family_history: familyHistory || [],
        family_history_other: familyHistoryOther || "",
        allergies: allergies || "",
        medications: medications || "",
        consent_to_ai: consentToAI || false,
        phone_number: "",
        email: "",
        birth_date: new Date().toISOString().split('T')[0],
        sex: "",
        primary_language: ""
    }]).select().single();

    if (insertErr) throw insertErr;

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Booking Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Patient only)
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { data: appointment, error: findErr } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    
    if (!appointment || findErr) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointment.patient_id !== req.user.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
    }

    const { data: updatedAppointment, error: updateErr } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ message: 'Appointment cancelled successfully', appointment: updatedAppointment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/appointments/:id/complete
// @desc    Mark an appointment as completed
// @access  Private (Doctor only)
router.put('/:id/complete', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const appointmentId = req.params.id;
    const { data: appointment, error: findErr } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    
    if (!appointment || findErr) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointment.doctor_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this appointment.' });
    }
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot complete an appointment that is already ${appointment.status}.` });
    }

    const { data: updatedAppointment, error: updateErr } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)
      .select()
      .single();
      
    if (updateErr) throw updateErr;

    res.json({ message: 'Appointment marked as completed successfully', appointment: updatedAppointment });
  } catch (err) {
    console.error('Complete Appointment Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// Create payment order
router.post('/create-payment-order', authMiddleware, async (req, res) => {
  try {
    const { doctorId, amount, currency = 'INR' } = req.body;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }
    
    const parsedAmount = parseInt(amount, 10);
    
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid consultation fee provided.' });
    }

    const { data: doctor } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const options = {
      amount: parsedAmount * 100, 
      currency: currency,
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };
    
    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

// Verify payment and book appointment
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      doctorId,
      ...appointmentData
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    const { data: doctor } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const dateStr = new Date(appointmentData.date).toISOString().split('T')[0];
    const bdayStr = appointmentData.birthDate ? new Date(appointmentData.birthDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const { data: appointment, error: insertErr } = await supabase.from('appointments').insert([{
        patient_id: req.user.userId,
        doctor_id: doctorId,
        date: dateStr,
        time: appointmentData.time,
        primary_reason: appointmentData.primaryReason || appointmentData.reasonForVisit || "",
        reason_for_visit: appointmentData.reasonForVisit || appointmentData.primaryReason || "",
        symptoms: appointmentData.symptoms || [],
        patient_name_for_visit: appointmentData.patientNameForVisit || "",
        phone_number: appointmentData.phoneNumber || "",
        email: appointmentData.email || "",
        birth_date: bdayStr,
        sex: appointmentData.sex || "",
        primary_language: appointmentData.primaryLanguage || "",
        symptoms_begin: appointmentData.symptomsBegin || "",
        severe_symptoms_check: appointmentData.severeSymptomsCheck || [],
        pre_existing_conditions: appointmentData.preExistingConditions || [],
        past_surgeries: appointmentData.pastSurgeries || "",
        family_history: appointmentData.familyHistory || [],
        allergies: appointmentData.allergies || "",
        medications: appointmentData.medications || "",
        consent_to_ai: appointmentData.consentToAI || false,
        emergency_disclaimer_acknowledged: appointmentData.emergencyDisclaimerAcknowledged || false,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        payment_status: 'paid',
        status: 'upcoming',
        consultation_fee_at_booking: doctor.consultation_fee || 0
    }]).select().single();
    
    if (insertErr) throw insertErr;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0; font-size: 28px;">🎉 Payment Successful!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Dear ${appointmentData.patientNameForVisit},</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for your payment! Your appointment has been successfully confirmed with IntelliConsult.
            </p>
          </div>
          
          <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; border: 2px solid #16a34a; margin: 25px 0;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">📋 Appointment Details</h3>
            <div style="color: #333; line-height: 1.8;">
              <p style="margin: 8px 0;"><strong>👨‍⚕️ Doctor:</strong> ${doctor.full_name}</p>
              <p style="margin: 8px 0;"><strong>🏥 Specialization:</strong> ${doctor.specialization}</p>
              <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${new Date(appointmentData.date).toDateString()}</p>
              <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${appointmentData.time}</p>
              <p style="margin: 8px 0;"><strong>💰 Amount Paid:</strong> ₹${doctor.consultation_fee}</p>
              <p style="margin: 8px 0;"><strong>💳 Payment ID:</strong> ${razorpay_payment_id}</p>
              <p style="margin: 8px 0;"><strong>✅ Status:</strong> <span style="color: #16a34a; font-weight: 600;">Confirmed & Paid</span></p>
            </div>
          </div>
          
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">
            <p style="color: #1e40af; font-weight: 600; margin: 0; font-size: 16px;">
              📞 You will receive a video call link before your appointment time.
            </p>
          </div>
          
          <div style="margin: 25px 0;">
            <p style="color: #666; line-height: 1.6;">
              <strong>Preparation for your consultation:</strong>
            </p>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li>Have your medical history and current medications ready</li>
              <li>Prepare a list of questions you want to ask the doctor</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Find a quiet, well-lit space for the video call</li>
              <li>Test your camera and microphone beforehand</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
              View My Appointments
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              If you need to reschedule or have any questions, please contact our support team.
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
              Thank you for choosing IntelliConsult!<br>
              <strong>IntelliConsult Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: appointmentData.email || "",
        subject: '🎉 Payment Successful - Appointment Confirmed | IntelliConsult',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Payment verified and appointment booked successfully',
      appointment: appointment
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

module.exports = router;
