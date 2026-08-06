-- Supabase PostgreSQL Schema Definition

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Definitions
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('upcoming', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  user_type user_role DEFAULT 'patient',
  google_id TEXT UNIQUE,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT TRUE,
  email_verification_token TEXT,
  email_verification_token_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  user_type user_role DEFAULT 'doctor',
  specialization TEXT NOT NULL,
  experience INTEGER NOT NULL,
  license_number TEXT UNIQUE,
  phone_number TEXT,
  address TEXT NOT NULL,
  consultation_fee NUMERIC(10,2) NOT NULL,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  bio TEXT,
  google_id TEXT UNIQUE,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_token_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_token_expires TIMESTAMP WITH TIME ZONE,
  working_hours JSONB,
  blocked_times JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  user_type user_role DEFAULT 'admin',
  google_id TEXT UNIQUE,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_token_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_name_for_visit TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status appointment_status DEFAULT 'upcoming',
  consultation_fee_at_booking NUMERIC(10,2) NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  emergency_disclaimer_acknowledged BOOLEAN DEFAULT FALSE,
  primary_reason TEXT DEFAULT '',
  symptoms_list TEXT[],
  symptoms_other TEXT DEFAULT '',
  symptoms_begin TEXT,
  severe_symptoms_check TEXT[],
  pre_existing_conditions TEXT[],
  pre_existing_conditions_other TEXT DEFAULT '',
  past_surgeries TEXT DEFAULT '',
  family_history TEXT[],
  family_history_other TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  consent_to_ai BOOLEAN DEFAULT FALSE,
  payment_id TEXT,
  order_id TEXT,
  reason_for_visit TEXT,
  symptoms TEXT[],
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL,
  primary_language TEXT NOT NULL,
  doctor_summary TEXT,
  summary_generated_at TIMESTAMP WITH TIME ZONE,
  triage_priority TEXT,
  triage_priority_level TEXT,
  triage_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Appointment Cancellations Table
CREATE TABLE IF NOT EXISTS appointment_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reason_details TEXT,
  cancelled_by TEXT NOT NULL,
  cancelled_by_user_id TEXT NOT NULL,
  is_rescheduled BOOLEAN DEFAULT FALSE,
  new_appointment_id UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Doctor Schedules Table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_start_time TEXT,
  break_end_time TEXT,
  slot_duration INTEGER DEFAULT 30,
  max_appointments_per_day INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  exceptions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Schedule optimization
CREATE INDEX idx_doctor_schedules_doctor_id_day ON doctor_schedules(doctor_id, day_of_week);
CREATE INDEX idx_doctor_schedules_doctor_id_active ON doctor_schedules(doctor_id, is_active);

-- 7. Medical Records Table
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  diagnosis TEXT,
  notes TEXT,
  prescription JSONB,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,
  created_by_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Medical Records
CREATE INDEX idx_medical_records_patient_date ON medical_records(patient_id, created_at DESC);
CREATE INDEX idx_medical_records_doctor_date ON medical_records(doctor_id, created_at DESC);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(appointment_id);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger function to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to tables
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointment_cancellations_updated_at BEFORE UPDATE ON appointment_cancellations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctor_schedules_updated_at BEFORE UPDATE ON doctor_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
