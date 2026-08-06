const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { Parser } = require('json2csv');

// @route   GET api/doctors
// @desc    Get all doctors with filtering and search
// @access  Public (or Private if login required to browse)
router.get('/', async (req, res) => {
  try {
    const { search, specialty, includeUnverified } = req.query;
    
    let query = supabase.from('doctors').select('*');

    if (includeUnverified !== 'true') {
      query = query.eq('is_verified', true);
    }

    if (specialty && specialty !== 'All Specialties') {
      query = query.eq('specialization', specialty);
    }

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data: doctors, error } = await query;
    if (error) throw error;
    
    // Remove passwords
    const sanitizedDoctors = (doctors || []).map(d => {
      const { password, ...rest } = d;
      return rest;
    });

    res.json(sanitizedDoctors);
  } catch (err) {
    console.error('Get Doctors Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/doctors/earnings/data
// @desc    Get earnings data for the logged-in doctor
// @access  Private (Doctor only)
router.get('/earnings/data', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const doctorId = req.user.userId;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('date', { ascending: false });

    if (error) throw error;

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let totalEarnings = 0;
    const monthlyBreakdownMap = {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    const shouldCountAppointment = (apt) => {
      const status = apt.status?.toLowerCase();
      return status === 'completed' || status === 'upcoming';
    };

    (appointments || []).forEach(apt => {
      if (!shouldCountAppointment(apt)) return;

      const fee = apt.consultation_fee_at_booking || 0;
      totalEarnings += fee;
      const aptDate = new Date(apt.date);

      if (aptDate >= todayStart && aptDate < tomorrowStart) today += fee;
      if (aptDate >= weekStart && aptDate < weekEnd) thisWeek += fee;
      if (aptDate >= monthStart && aptDate < monthEnd) thisMonth += fee;

      const monthIndex = aptDate.getMonth();
      const year = aptDate.getFullYear();
      const monthKey = `${year}-${monthIndex}`;
      if (!monthlyBreakdownMap[monthKey]) {
        monthlyBreakdownMap[monthKey] = {
          key: monthKey,
          month: `${aptDate.toLocaleString('default', { month: 'long' })} ${year}`,
          monthIndex,
          year,
          appointments: 0,
          earnings: 0
        };
      }
      monthlyBreakdownMap[monthKey].appointments++;
      monthlyBreakdownMap[monthKey].earnings += fee;
    });

    const recentTransactions = (appointments || [])
      .filter(apt => apt.status !== 'cancelled')
      .slice(0, 10)
      .map(apt => ({
        id: apt.id,
        patientName: apt.patient_name_for_visit,
        date: apt.date,
        time: apt.time,
        amount: apt.consultation_fee_at_booking,
        status: apt.status,
      }));

    const monthlyBreakdown = Object.values(monthlyBreakdownMap)
      .sort((a, b) => {
        if (b.year === a.year) {
          return b.monthIndex - a.monthIndex;
        }
        return b.year - a.year;
      })
      .map(({ month, appointments, earnings }) => ({ month, appointments, earnings }));

    res.json({
      today,
      thisWeek,
      thisMonth,
      totalEarnings,
      recentTransactions,
      monthlyBreakdown: monthlyBreakdown.slice(0, 6),
    });

  } catch (err) {
    console.error('Earnings Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/doctors/earnings/download-report
// @desc    Download earnings report as CSV for the logged-in doctor
// @access  Private (Doctor only)
router.get('/earnings/download-report', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const doctorId = req.user.userId;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('date', { ascending: false });

    if (error) throw error;

    const fields = [
      { label: 'Appointment ID', value: 'id' },
      { label: 'Date', value: row => new Date(row.date).toLocaleDateString() },
      { label: 'Time', value: 'time' },
      { label: 'Patient Name', value: 'patientNameForVisit' },
      { label: 'Reason', value: 'reasonForVisit' },
      { label: 'Fee', value: 'consultationFeeAtBooking' },
      { label: 'Status', value: 'status' },
    ];
    
    const csvData = (appointments || []).map(apt => ({
      id: apt.id,
      date: apt.date,
      time: apt.time,
      patientNameForVisit: apt.patient_name_for_visit,
      reasonForVisit: apt.reason_for_visit,
      consultationFeeAtBooking: apt.consultation_fee_at_booking,
      status: apt.status,
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    const fileName = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);

  } catch (err) {
    console.error('Download Report Error:', err.message);
    res.status(500).send('Server Error generating report');
  }
});

// @route   GET api/doctors/:id
// @desc    Get a single doctor's profile by their ID
// @access  Public (or Private if login required)
router.get('/:id', async (req, res) => {
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
      
    if (error) throw error;
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const { password, ...doctorWithoutPassword } = doctor;
    res.json(doctorWithoutPassword);
  } catch (err) {
    console.error('Get Doctor by ID Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;