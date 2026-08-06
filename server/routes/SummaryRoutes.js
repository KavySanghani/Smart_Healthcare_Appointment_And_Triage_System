const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const protect = require('../middleware/auth');
const supabase = require('../config/supabase');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const formatAppointmentData = (appointment) => {
  let allSymptoms = appointment.symptoms_list ? [...appointment.symptoms_list] : [];
  
  if (appointment.symptoms_other) {
    allSymptoms.push(appointment.symptoms_other);
  }

  if (allSymptoms.length === 0 && appointment.symptoms && typeof appointment.symptoms === 'string') {
    allSymptoms.push(appointment.symptoms);
  }
  
  const severeSymptoms = appointment.severe_symptoms_check || []; 

  const conditions = appointment.pre_existing_conditions || [];
  const conditionsOther = appointment.pre_existing_conditions_other || '';
  const allConditions = [...conditions];
  if (conditionsOther) allConditions.push(conditionsOther);

  const familyHistory = appointment.family_history || [];
  const familyHistoryOther = appointment.family_history_other || '';
  const allFamilyHistory = [...familyHistory];
  if (familyHistoryOther) allFamilyHistory.push(familyHistoryOther);

  let age = 'Not provided';
  if (appointment.birth_date) {
     const birthDate = new Date(appointment.birth_date);
     const today = new Date();
     age = today.getFullYear() - birthDate.getFullYear();
  }

  return `
PATIENT CONSULTATION SUMMARY REQUEST:

PATIENT BASIC DETAILS:
- Name: ${appointment.patient_name_for_visit || 'Not provided'}
- Age: ${age}
- Sex: ${appointment.sex || 'Not provided'}

CHIEF COMPLAINT:
${appointment.primary_reason || appointment.reason_for_visit || 'Not specified'}

CURRENT SYMPTOMS:
${allSymptoms.length > 0 ? allSymptoms.map(s => '- ' + s).join('\\n') : '- None reported'}

SYMPTOM BEGINNING:
${appointment.symptoms_begin || 'Not specified'}
  
SEVERE SYMPTOMS :
${severeSymptoms.length > 0 ? severeSymptoms.map(s => '- ' + s).join('\\n') : '- None reported'}

MEDICAL HISTORY:
Pre-existing Conditions:
${allConditions.length > 0 ? allConditions.map(c => '- ' + c).join('\\n') : '- None'}

Past Surgeries/Hospitalizations:
${appointment.past_surgeries || 'None'}

Family Medical History:
${allFamilyHistory.length > 0 ? allFamilyHistory.map(h => '- ' + h).join('\\n') : '- None'}

Current Medications:
${appointment.medications || 'None'}

Allergies:
${appointment.allergies || 'None'}
`;
};

const generateAISummary = async (formData) => {
  const prompt = `Generate a concise clinical summary.

PATIENT DATA:
${formData}

Provide a brief 2-3 sentence summary focusing on:
- provide age and gender if given by the patient
- Chief complaint and symptoms
- Any red flags or urgent concerns
- Key medical history
-If the chief complaint or symptoms contain irrelevant, abusive, or non-medical content (e.g.,"Let's go for a date", “I want to play football with you”, bad words, or spam), clearly state: “The patient input appears to be spam or non-medical.”

Keep it professional and concise.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
    });

    return chatCompletion.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to generate AI summary');
  }
};

router.get('/appointment/:appointmentId', protect, async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const { data: appointment, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();
      
    if (!appointment || aptErr) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctor_summary) {
      return res.json({
        success: true,
        summary: appointment.doctor_summary,
        cached: true
      });
    }

    const formattedData = formatAppointmentData(appointment);
    const summary = await generateAISummary(formattedData);

    await supabase.from('appointments').update({
        doctor_summary: summary,
        summary_generated_at: new Date().toISOString()
    }).eq('id', appointmentId);

    res.json({
      success: true,
      summary: summary,
      cached: false
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate summary',
      error: error.message 
    });
  }
});

module.exports = router;
