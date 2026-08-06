const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

const camelToSnake = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = obj[key];
    return acc;
  }, {});
};

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    
    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type found in token.' });
    }

    const { data: user, error } = await supabase
      .from(userType + 's')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!user || error) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("GET /profile Error:", err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { fullName } = req.body;

    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type in token.' });
    }

    const { data: updatedUser, error } = await supabase
      .from(userType + 's')
      .update({ full_name: fullName })
      .eq('id', userId)
      .select()
      .single();

    if (!updatedUser || error) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/complete-profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType: originalUserType } = req.user;
    const { userType: newUserType, ...profileData } = req.body;

    if (!['patient', 'doctor', 'admin'].includes(originalUserType) || 
        !['patient', 'doctor', 'admin'].includes(newUserType)) {
      return res.status(400).json({ message: 'Invalid user type specified.' });
    }

    const { data: originalUser, error: findErr } = await supabase
      .from(originalUserType + 's')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (!originalUser || findErr) {
      return res.status(404).json({ message: 'Original user account not found.' });
    }

    const snakeProfileData = camelToSnake(profileData);

    if (originalUserType === newUserType) {
      const { data: updatedUser, error: updateErr } = await supabase
        .from(originalUserType + 's')
        .update({
          ...snakeProfileData,
          is_profile_complete: true,
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      const { password, ...userWithoutPassword } = updatedUser;
      return res.json({
        message: 'Profile completed successfully!',
        user: userWithoutPassword,
      });
    }

    // Role transformation: create new role entry and delete old one
    // Remove fields that might conflict
    const { id, created_at, updated_at, google_id, ...transferData } = originalUser;
    
    // We retain the google_id if it exists
    if (google_id) transferData.google_id = google_id;
    
    const { data: newUser, error: createErr } = await supabase
      .from(newUserType + 's')
      .insert([{
        ...transferData,
        ...snakeProfileData,
        user_type: newUserType,
        is_profile_complete: true,
      }])
      .select()
      .single();

    if (createErr) throw createErr;

    await supabase.from(originalUserType + 's').delete().eq('id', userId);

    const newToken = jwt.sign(
      { userId: newUser.id, userType: newUser.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const { password, ...userWithoutPassword } = newUser;
    res.json({
      message: 'Profile transformed and completed successfully!',
      user: userWithoutPassword,
      token: newToken,
    });

  } catch (err) {
    console.error("PUT /complete-profile Error:", err);
    res.status(500).send('Server Error');
  }
});

router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const updateData = req.body;

    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type in token.' });
    }

    delete updateData.password;
    delete updateData.userType;
    delete updateData.id;
    delete updateData._id;
    delete updateData.isVerified;
    delete updateData.is_verified;

    const snakeUpdateData = camelToSnake(updateData);

    const { data: updatedUser, error } = await supabase
      .from(userType + 's')
      .update(snakeUpdateData)
      .eq('id', userId)
      .select()
      .single();

    if (!updatedUser || error) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Profile updated successfully!',
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
