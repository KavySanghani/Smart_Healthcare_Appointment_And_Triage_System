const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');
const crypto = require('crypto');

router.get('/working-hours', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('working_hours')
      .eq('id', req.user.userId)
      .maybeSingle();
      
    if (error || !doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor.working_hours || {});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/working-hours', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  
  const { workingHours } = req.body; 

  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .update({ working_hours: workingHours || {} })
      .eq('id', req.user.userId)
      .select('working_hours')
      .single();
      
    if (error) throw error;
    
    res.json(doctor.working_hours);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/blocked-times', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const { reason, date, startTime, endTime } = req.body;

  if (!reason || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const { data: doctor, error: fetchErr } = await supabase
      .from('doctors')
      .select('blocked_times')
      .eq('id', req.user.userId)
      .maybeSingle();
      
    if (fetchErr || !doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const newBlock = { 
      _id: crypto.randomUUID(),
      reason, 
      date, 
      startTime, 
      endTime 
    };
    
    const currentBlockedTimes = doctor.blocked_times || [];
    currentBlockedTimes.push(newBlock);

    const { error: updateErr } = await supabase
      .from('doctors')
      .update({ blocked_times: currentBlockedTimes })
      .eq('id', req.user.userId);
      
    if (updateErr) throw updateErr;

    res.status(201).json(newBlock);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/blocked-times/:blockId', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const { data: doctor, error: fetchErr } = await supabase
      .from('doctors')
      .select('blocked_times')
      .eq('id', req.user.userId)
      .maybeSingle();
      
    if (fetchErr || !doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const currentBlockedTimes = doctor.blocked_times || [];
    const blockIndex = currentBlockedTimes.findIndex(
      (block) => block._id === req.params.blockId
    );

    if (blockIndex === -1) {
      return res.status(404).json({ message: 'Blocked time not found.' });
    }

    currentBlockedTimes.splice(blockIndex, 1);
    
    const { error: updateErr } = await supabase
      .from('doctors')
      .update({ blocked_times: currentBlockedTimes })
      .eq('id', req.user.userId);
      
    if (updateErr) throw updateErr;

    res.json({ message: 'Blocked time removed successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;