const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

async function updateDoctorRating(doctorId) {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('doctor_id', doctorId);

  if (error) {
    console.error('Error fetching reviews for rating update:', error);
    return;
  }

  if (!reviews || reviews.length === 0) {
    await supabase.from('doctors').update({
      average_rating: 0,
      review_count: 0,
    }).eq('id', doctorId);
    return;
  }

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  const average = totalRating / reviews.length;

  await supabase.from('doctors').update({
    average_rating: average,
    review_count: reviews.length,
  }).eq('id', doctorId);
}

router.post('/', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Not a patient.' });
  }

  const { doctorId, appointmentId, rating, comment } = req.body;

  try {
    const { data: appointment, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();
      
    if (!appointment || aptErr) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed appointments.' });
    }
    
    if (appointment.patient_id !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to review this appointment.' });
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
      
    if (existingReview) {
      return res.status(400).json({ message: 'This appointment has already been reviewed.' });
    }

    const { data: newReview, error: insertErr } = await supabase.from('reviews').insert([{
        doctor_id: doctorId,
        patient_id: req.user.userId,
        appointment_id: appointmentId,
        rating,
        comment,
    }]).select().single();

    if (insertErr) throw insertErr;

    await updateDoctorRating(doctorId);

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Review POST Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        patient:patients(full_name)
      `)
      .eq('doctor_id', req.params.doctorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(reviews);
  } catch (err) {
    console.error('Get Reviews Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;