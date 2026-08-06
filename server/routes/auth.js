const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const supabase = require('../config/supabase');
const router = express.Router();
const crypto = require('crypto');
const sendEmail = require('../utils/email_utils.js');

const getTable = (userType) => {
  switch (userType) {
    case 'patient': return 'patients';
    case 'doctor': return 'doctors';
    case 'admin': return 'admins';
    default: return null;
  }
};

router.post('/signup', async (req, res) => {
  const { userType, email, password } = req.body;
  const table = getTable(userType);

  if (!table) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }

  try {
    // Check if user exists across all tables
    const { data: patientExists } = await supabase.from('patients').select('id').eq('email', email).maybeSingle();
    const { data: doctorExists } = await supabase.from('doctors').select('id').eq('email', email).maybeSingle();
    const { data: adminExists } = await supabase.from('admins').select('id').eq('email', email).maybeSingle();

    if (patientExists || doctorExists || adminExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const isProfileComplete = userType !== 'doctor';

    // Map body to snake_case for Supabase
    const { fullName, specialization, experience, licenseNumber, phoneNumber, address, consultationFee, ...rest } = req.body;
    
    const userData = {
      full_name: fullName,
      email: email,
      password: hashedPassword,
      is_profile_complete: isProfileComplete,
      email_verification_token: hashedToken,
      email_verification_token_expires: tokenExpires,
      user_type: userType
    };

    if (userType === 'doctor') {
      if (specialization) userData.specialization = specialization;
      if (experience) userData.experience = experience;
      if (licenseNumber) userData.license_number = licenseNumber;
      if (phoneNumber) userData.phone_number = phoneNumber;
      if (address) userData.address = address;
      if (consultationFee) userData.consultation_fee = consultationFee;
      
      userData.working_hours = {
        monday: { enabled: false, start: "09:00", end: "17:00" },
        tuesday: { enabled: false, start: "09:00", end: "17:00" },
        wednesday: { enabled: false, start: "09:00", end: "17:00" },
        thursday: { enabled: false, start: "09:00", end: "17:00" },
        friday: { enabled: false, start: "09:00", end: "17:00" },
        saturday: { enabled: false, start: "09:00", end: "17:00" },
        sunday: { enabled: false, start: "09:00", end: "17:00" }
      };
    }

    const { data: user, error } = await supabase.from(table).insert([userData]).select().single();
    
    if (error) {
      throw error;
    }
    
    const verificationURL = `http://localhost:5001/api/auth/verify-email/${token}`;
    
    const message = `
      <h1>Welcome to IntelliConsult!</h1>
      <p>Thank you for registering. Please click the link below to verify your email address. This link is valid for 10 minutes.</p>
      <a href="${verificationURL}" style="background-color: #0F5257; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Your Email</a>
      <p>If you did not create this account, please ignore this email.</p>
    `;
    
          const emailSent = await sendEmail({
        email: user.email,
        subject: 'IntelliConsult - Email Verification',
        html: message,
      });
      
      if (!emailSent) {
        console.error("Failed to send verification email");
        await supabase.from(table).delete().eq('id', user.id);
        return res.status(500).json({ message: 'Failed to send verification email. Please try signing up again.' });
      }

      res.status(201).json({ 
        message: `Registration successful! Please check your email at ${user.email} to verify your account.` 
      });
    
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();

    let user = null;
    let type = 'patient';
    
    let { data: pUser } = await supabase.from('patients').select('*').eq('email_verification_token', hashedToken).gt('email_verification_token_expires', now).maybeSingle();
    if (pUser) {
        user = pUser;
        type = 'patient';
    } else {
        let { data: dUser } = await supabase.from('doctors').select('*').eq('email_verification_token', hashedToken).gt('email_verification_token_expires', now).maybeSingle();
        if (dUser) {
            user = dUser;
            type = 'doctor';
        } else {
            let { data: aUser } = await supabase.from('admins').select('*').eq('email_verification_token', hashedToken).gt('email_verification_token_expires', now).maybeSingle();
            if (aUser) {
                user = aUser;
                type = 'admin';
            }
        }
    }
    
    if (!user) {
      return res.redirect('http://localhost:5173/login?verified=false');
    }
    
    await supabase.from(getTable(type)).update({
        is_email_verified: true,
        email_verification_token: null,
        email_verification_token_expires: null,
    }).eq('id', user.id);
    
    res.redirect('http://localhost:5173/login?verified=true');
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('http://localhost:5173/login?verified=false');
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email, userType } = req.body;
  const table = getTable(userType);
  
  if (!table) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }

  try {
    const { data: user } = await supabase.from(table).select('*').eq('email', email).maybeSingle();

    if (!user) {
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    if (user.google_id && !user.password) {
      return res.status(200).json({ message: 'This account is registered with Google. Please log in using Google.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    await supabase.from(table).update({
        password_reset_token: hashedToken,
        password_reset_token_expires: tokenExpires,
    }).eq('id', user.id);

    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>Please click the link below to create a new password. This link is valid for 10 minutes.</p>
      <a href="${resetURL}" style="background-color: #0F5257; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'IntelliConsult - Password Reset',
      html: message,
    });

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }
});

router.put('/reset-password/:token', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const unhashedToken = req.params.token;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
    const now = new Date().toISOString();

    let user = null;
    let type = 'patient';
    
    let { data: pUser } = await supabase.from('patients').select('*').eq('password_reset_token', hashedToken).gt('password_reset_token_expires', now).maybeSingle();
    if (pUser) {
        user = pUser;
        type = 'patient';
    } else {
        let { data: dUser } = await supabase.from('doctors').select('*').eq('password_reset_token', hashedToken).gt('password_reset_token_expires', now).maybeSingle();
        if (dUser) {
            user = dUser;
            type = 'doctor';
        } else {
            let { data: aUser } = await supabase.from('admins').select('*').eq('password_reset_token', hashedToken).gt('password_reset_token_expires', now).maybeSingle();
            if (aUser) {
                user = aUser;
                type = 'admin';
            }
        }
    }

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await supabase.from(getTable(type)).update({
        password: hashedPassword,
        password_reset_token: null,
        password_reset_token_expires: null,
        is_email_verified: true,
    }).eq('id', user.id);

    res.status(200).json({ message: 'Password reset successful! You can now log in.' });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'An error occurred while resetting your password.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  const table = getTable(userType);

  if (!table) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }
  try {
    const { data: user } = await supabase.from(table).select('*').eq('email', email).maybeSingle();
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or user role.' });
    }
    
    if (user.google_id && !user.password) {
      return res.status(400).json({ message: 'This account is registered with Google. Please use Google Sign In.' });
    }
    
    if (!user.password) {
      return res.status(400).json({ message: 'Invalid account. No password set.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    if ('is_verified' in user && user.is_verified === false) {
      return res.status(403).json({ 
        message: 'Your account has been suspended or is currently under review. Please contact support.' 
      });
    }

    if (!user.is_email_verified) {
      return res.status(401).json({ 
        message: 'Your email is not verified. Please check your inbox for the verification link.' 
      });
    }

    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (!user.is_profile_complete) {
        return res.status(200).json({ 
          token, 
          profileComplete: false, 
          message: 'Login successful, please complete your profile.' 
        });
    }

    res.status(200).json({ 
      token, 
      profileComplete: true, 
      message: 'Logged in successfully!' 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
}));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/login?error=google_failed', 
    failureMessage: true,
    session: false 
  }),
  (req, res) => {
    const user = req.user; // Note: Ensure passport strategy is also returning snake_case or adapt here
    const userType = user.user_type || user.userType; 

    const token = jwt.sign(
      { userId: user.id, userType: userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let redirectPath;
    if (!user.is_profile_complete && !user.isProfileComplete) {
      redirectPath = '/complete-profile'; 
    } else {
      switch (userType) {
        case 'doctor': redirectPath = '/doctor/dashboard'; break;
        case 'patient': redirectPath = '/patient/dashboard'; break;
        case 'admin': redirectPath = '/admin/dashboard'; break; 
        default: redirectPath = '/'; 
      }
    }

    res.redirect(`http://localhost:5173/auth/callback?token=${token}&userType=${userType}&next=${encodeURIComponent(redirectPath)}`);
  }
);

module.exports = router;