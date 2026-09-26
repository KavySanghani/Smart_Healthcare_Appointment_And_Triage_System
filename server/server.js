const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const session = require('express-session');
const passport = require('passport');
const app = express();
const PORT = process.env.PORT || 5001;
const path = require('path'); 
require('./config/passport')(passport);

const _dirname= path.resolve();
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://smart-healthcare-appointment-and-tr-rho.vercel.app',
    'https://smart-healthcare-appointment-and-triage-system-g88n82smo.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Prisma PostgreSQL connection is initialized in the individual route files

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const adminRoutes = require('./routes/admin');
const scheduleRoutes = require('./routes/schedule');
const summaryRoutes = require('./routes/SummaryRoutes');
const triageRoutes = require('./routes/triageRoutes');
const prescriptionRoutes = require('./routes/prescriptions');
const reviewsRoutes = require('./routes/reviews');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reviews', reviewsRoutes);

app.use(express.static(path.join(_dirname,"/client/dist")));
app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.resolve(_dirname, "client","dist","index.html"));
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));