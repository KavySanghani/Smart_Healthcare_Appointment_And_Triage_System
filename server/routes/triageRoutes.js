const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const protect = require('../middleware/auth');
const supabase = require('../config/supabase');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const ESI_KNOWLEDGE_BASE = `
EMERGENCY SEVERITY INDEX (ESI) TRIAGE SYSTEM:

RED (P1) - IMMEDIATE/LIFE THREATENING:
- Immediate life-saving intervention (e.g., unresponsive, severe bleeding).
- Cardiac arrest, respiratory arrest
- Severe respiratory distress
- Unresponsive or altered mental status
- Severe hemorrhage, shock
- Chest pain with cardiac symptoms
- Stroke symptoms (FAST positive)
- Severe trauma with unstable vitals
- Seizures (active/continuous)

YELLOW (P2) - URGENT/NON-LIFE THREATENING:
- High risk (e.g., confusion, severe pain, high fever in infant).
- High fever with concerning symptoms
- Moderate respiratory distress
- Disoriented, severe pain, signs of stroke
- Suspected fractures with deformity
- Vomiting blood, severe dehydration
- Chest pain (stable vitals)

GREEN (P3) - MINOR/OBSERVATION:
- Multiple resources needed (stable but requires tests/treatment)
- Minor injuries, lacerations
- Low-grade fever without red flags
- Stable vital sign
- Chronic conditions without acute exacerbation
- Minor infections

BLACK (P4) - NON-URGENT:
- One resource (e.g., simple laceration)
- Prescription refills
- Routine check-ups
- No immediate medical concerns
`;

const Examples = `
EXAMPLES:

Example 1:
PATIENT TRIAGE ASSESSMENT:
PRIMARY REASON: - Severe chest pain or pressure
MAIN SYMPTOM BEGIN: less than 25 hours
SEVERE SYMPTOMS: - Severe chest pain or pressure
MEDICAL HISTORY:
Pre-existing Conditions: - Hypertension
Age: 55
Sex: Male

Classification:
{
  "priority": "RED",
  "priorityLevel": "P1",
  "label": "Immediate"
}

Example 2:
PATIENT TRIAGE ASSESSMENT:
PRIMARY REASON: Ankle pain after fall which has caused swelling
SYMPTOM BEGIN: Less than 24 hours
SEVERE SYMPTOMS - RED FLAGS: None reported
MEDICAL HISTORY:
Pre-existing Conditions: None
Age: 28
Sex: Female

Classification:
{
  "priority": "GREEN",
  "priorityLevel": "P3",
  "label": "Minor"
}

Example 3:
PATIENT TRIAGE ASSESSMENT:
PRIMARY REASON: High fever and vomiting
SYMPTOM BEGIN: less than 24 hours
SEVERE SYMPTOMS - RED FLAGS: - High fever (over 103°F / 39.4°C)
WARNING: High fever reported
MEDICAL HISTORY:
Pre-existing Conditions: None
Age: 6
Sex: Male

Classification:
{
  "priority": "YELLOW",
  "priorityLevel": "P2",
  "label": "Urgent"
}

Example 4:
PATIENT TRIAGE ASSESSMENT:
PRIMARY REASON: Prescription refill
SYMPTOM BEGIN: More than 2 weeks
SEVERE SYMPTOMS - RED FLAGS: None reported
MEDICAL HISTORY:
Pre-existing Conditions: - Diabetes
Current Medications: Metformin
Age: 42
Sex: Female

Classification:
{
  "priority": "BLACK",
  "priorityLevel": "P4",
  "label": "Non-Urgent"
}
`;

const formatTriageData = (appointment) => {
const symptomsList = appointment.symptoms_list || [];
const symptomsOther = appointment.symptoms_other || '';
const allSymptoms = [...symptomsList];
if (symptomsOther) {
  allSymptoms.push(symptomsOther);
}

const severeSymptoms = appointment.severe_symptoms_check || [];

const conditions = appointment.pre_existing_conditions || [];
const conditionsOther = appointment.pre_existing_conditions_other || '';
const allConditions = [...conditions];
if (conditionsOther) {
  allConditions.push(conditionsOther);
}

const familyHistory = appointment.family_history || [];
const familyHistoryOther = appointment.family_history_other || '';
const allFamilyHistory = [...familyHistory];
if (familyHistoryOther) {
  allFamilyHistory.push(familyHistoryOther);
}

let age = 'Unknown';
if (appointment.birth_date) {
  const birthDate = new Date(appointment.birth_date);
  const today = new Date();
  age = today.getFullYear() - birthDate.getFullYear();
}

return `
PATIENT TRIAGE ASSESSMENT:

CHIEF COMPLAINT:
${appointment.primary_reason || appointment.reason_for_visit || 'Not specified'}

CURRENT SYMPTOMS:
${allSymptoms.length > 0 ? allSymptoms.map(s => '- ' + s).join('\\n') : '- None reported'}

SYMPTOM ONSET:
${appointment.symptoms_begin || 'Unknown'}

SEVERE SYMPTOMS - RED FLAGS:
${severeSymptoms.length > 0 ? '- ' + severeSymptoms.join('\\n- ') : 'None reported'}
${severeSymptoms.includes('Severe chest pain or pressure') ? 'CRITICAL: Severe chest pain reported' : ''}
${severeSymptoms.includes('Sudden difficulty breathing or shortness of breath') ? 'CRITICAL: Respiratory distress reported' : ''}
${severeSymptoms.includes('Sudden confusion, disorientation, or difficulty speaking') ? 'CRITICAL: Neurological symptoms reported' : ''}
${severeSymptoms.includes('Sudden weakness, numbness, or drooping on one side of your face or body') ? 'CRITICAL: Stroke symptoms reported' : ''}
${severeSymptoms.includes('Sudden, severe headache (worst of your life)') ? 'CRITICAL: Severe headache reported' : ''}
${severeSymptoms.includes('High fever (over 103°F / 39.4°C)') ? 'WARNING: High fever reported' : ''}
${severeSymptoms.includes('Uncontrolled bleeding') ? 'CRITICAL: Uncontrolled bleeding reported' : ''}

MEDICAL HISTORY:

Pre-existing Conditions:
${allConditions.length > 0 ? '- ' + allConditions.join('\\n- ') : 'None'}

Past Surgeries/Hospitalizations:
${appointment.past_surgeries || 'None'}

Family Medical History:
${allFamilyHistory.length > 0 ? '- ' + allFamilyHistory.join('\\n- ') : 'None'}

Current Medications:
${appointment.medications || 'None'}

Allergies:
${appointment.allergies || 'None'}

DEMOGRAPHICS:
Age: ${age}
Sex: ${appointment.sex || 'Unknown'}
;

`;
};

const performAITriage = async (patientData) => {
  const prompt = `${ESI_KNOWLEDGE_BASE}

${patientData}

Thinking yourself as a nurse or a medical practitioner using the ESI system and the examples, analyze the patient and provide triage classification.
Respond in this exact JSON format:
{
  "priority": "RED/YELLOW/GREEN/BLACK",
  "priorityLevel": "P1/P2/P3/P4",
  "label": "Immediate/Urgent/Minor/Non-Urgent"
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
    console.log("ai is giving the triage");
    return result;
  } catch (error) {
    console.error('Groq AI Triage Error:', error);
    throw new Error('Failed to perform AI triage');
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

    if (appointment.triage_priority && appointment.triage_priority_level) {
      return res.json({
        success: true,
        triage: {
          priority: appointment.triage_priority,
          priorityLevel: appointment.triage_priority_level,
          label: appointment.triage_label
        },
        cached: true
      });
    }

    const patientData = formatTriageData(appointment);
    const triageResult = await performAITriage(patientData);

    await supabase.from('appointments').update({
        triage_priority: triageResult.priority,
        triage_priority_level: triageResult.priorityLevel,
        triage_label: triageResult.label
    }).eq('id', appointmentId);

    res.json({
      success: true,
      triage: triageResult,
      cached: false
    });

  } catch (error) {
    console.error('Error performing triage:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to perform triage',
      error: error.message 
    });
  }
});

module.exports = router;
