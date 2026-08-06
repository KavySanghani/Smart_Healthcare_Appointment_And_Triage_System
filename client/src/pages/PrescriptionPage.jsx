import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, FileText, Pill, Plus, X, Save, Loader2, ArrowLeft } from "lucide-react";

const API_BASE_URL = import.meta?.env?.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const DEFAULT_PRESCRIPTION_ROW = { medication: '', dosage: '', instructions: '', duration: '' };

const getInitials = (fullName = '') => {
  if (!fullName.trim()) return 'P';
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export default function PrescriptionPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const primaryColor = '#0F5257';

  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([DEFAULT_PRESCRIPTION_ROW]);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);

        const appointmentsResponse = await axios.get(
          `${API_BASE_URL}/api/appointments/doctor`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const doctorAppointments = Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data
          : appointmentsResponse.data?.appointments || [];

        const foundAppointment = doctorAppointments.find((apt) => (apt?.id || apt?._id) === appointmentId);

        if (!foundAppointment) {
          setError('Appointment not found');
          return;
        }

        setAppointment(foundAppointment);

        try {
          const prescriptionResponse = await axios.get(
            `${API_BASE_URL}/api/prescriptions/appointment/${appointmentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (prescriptionResponse.data.success && prescriptionResponse.data.medicalRecord) {
            const record = prescriptionResponse.data.medicalRecord;
            setDiagnosis(record.diagnosis || '');
            setNotes(record.notes || '');
            setPrescriptions(
              record.prescription && record.prescription.length > 0
                ? record.prescription.map((item) => ({
                    medication: item.medication || '',
                    dosage: item.dosage || '',
                    instructions: item.instructions || '',
                    duration: item.duration || ''
                  }))
                : [DEFAULT_PRESCRIPTION_ROW]
            );
            setFollowUpRequired(Boolean(record.followUpRequired));
            setFollowUpDate(
              record.followUpDate ? new Date(record.followUpDate).toISOString().split('T')[0] : ''
            );
            setFollowUpNotes(record.followUpNotes || '');
          }
        } catch (prescriptionErr) {
          if (prescriptionErr.response?.status !== 404) {
            console.error('Error fetching existing prescription:', prescriptionErr);
          }
        }
      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Failed to load appointment details');
      } finally {
        setIsLoading(false);
      }
    };

    if (appointmentId) {
      fetchData();
    }
  }, [appointmentId, navigate]);

  const addPrescription = () => {
    setPrescriptions((prev) => [...prev, { ...DEFAULT_PRESCRIPTION_ROW }]);
  };

  const removePrescription = (index) => {
    setPrescriptions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePrescription = (index, field, value) => {
    setPrescriptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication error. Please log in again.');
      navigate('/login');
      return;
    }

    if (!diagnosis.trim()) {
      alert('Please enter a diagnosis');
      return;
    }

    const hasIncompleteMedication = prescriptions.some((item) => {
      const hasMedication = (item.medication || '').trim() !== '';
      if (!hasMedication) return false;
      return (item.dosage || '').trim() === '' || (item.instructions || '').trim() === '';
    });

    if (hasIncompleteMedication) {
      alert('Please complete dosage and instructions for each medication');
      return;
    }

    if (followUpRequired && !followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    setIsSaving(true);

    const prescriptionData = {
      appointmentId,
      diagnosis: diagnosis.trim(),
      notes: notes.trim(),
      prescription: prescriptions
        .filter((item) => (item.medication || '').trim() !== '')
        .map((item) => ({
          medication: item.medication.trim(),
          dosage: item.dosage.trim(),
          instructions: item.instructions.trim(),
          duration: item.duration ? item.duration.trim() : ''
        })),
      followUpRequired,
      followUpDate: followUpRequired ? followUpDate : null,
      followUpNotes: followUpRequired ? followUpNotes.trim() : ''
    };

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/prescriptions`,
        prescriptionData,
        config
      );

      if (response.data.success) {
        alert('Prescription saved successfully!');
        navigate('/doctor/dashboard');
        return;
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already exists')) {
        try {
          const getResponse = await axios.get(
            `${API_BASE_URL}/api/prescriptions/appointment/${appointmentId}`,
            config
          );

          const recordId = getResponse.data.medicalRecord?._id;

          if (recordId) {
            const updateResponse = await axios.put(
              `${API_BASE_URL}/api/prescriptions/${recordId}`,
              prescriptionData,
              config
            );

            if (updateResponse.data.success) {
              alert('Prescription updated successfully!');
              navigate('/doctor/dashboard');
              return;
            }
          }
        } catch (updateErr) {
          console.error('Error updating prescription:', updateErr);
          alert(updateErr.response?.data?.message || 'Failed to update prescription');
        }
      } else {
        console.error('Error saving prescription:', err);
        alert(err.response?.data?.message || 'Failed to save prescription');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-emerald-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Appointment not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/doctor/dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientName = appointment.patient?.fullName || appointment.patientNameForVisit || 'Patient';
  const patientEmail = appointment.patient?.email;
  const displaySymptoms = Array.isArray(appointment.symptomsList)
    ? appointment.symptomsList
    : appointment.symptoms;

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/Logo.svg" className="h-25 w-30" alt="Logo" />
              <span className="text-3xl font-bold">IntelliConsult</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/doctor/dashboard')}
                className="border-teal-300 text-teal-800 hover:bg-teal-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" style={{ color: primaryColor }} />
              <span>Prescription & Consultation Notes</span>
            </CardTitle>
            <CardDescription>Complete the prescription and notes for this consultation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 p-4 bg-emerald-50/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-teal-100 text-teal-800">
                    {getInitials(patientName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{patientName}</p>
                  <p className="text-sm text-gray-600">Patient</p>
                  {patientEmail && <p className="text-xs text-gray-500">{patientEmail}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(appointment.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{appointment.time}</span>
                </div>
                {appointment.primaryReason && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Reason: {appointment.primaryReason}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>Diagnosis</span>
                  </CardTitle>
                  <CardDescription>Enter the primary diagnosis for this consultation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis *</Label>
                    <Input
                      id="diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Upper Respiratory Tract Infection, Hypertension, etc."
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Enter the primary diagnosis or condition</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Pill className="h-5 w-5" style={{ color: primaryColor }} />
                      <CardTitle>Prescription</CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPrescription}
                      className="border-teal-300 text-teal-800 hover:bg-teal-50"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Medication
                    </Button>
                  </div>
                  <CardDescription>Add medications prescribed to the patient</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {prescriptions.map((prescription, index) => (
                    <div key={`prescription-${index}`} className="p-4 border rounded-lg bg-emerald-50/30 space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-700">
                          Medication {index + 1}
                        </Label>
                        {prescriptions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrescription(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`medication-${index}`}>Medication Name *</Label>
                          <Input
                            id={`medication-${index}`}
                            value={prescription.medication}
                            onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                            placeholder="e.g., Paracetamol, Amoxicillin"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dosage-${index}`}>Dosage *</Label>
                          <Input
                            id={`dosage-${index}`}
                            value={prescription.dosage}
                            onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                            placeholder="e.g., 500mg, 10ml"
                            required={(prescription.medication || '').trim() !== ''}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`instructions-${index}`}>Instructions *</Label>
                        <Textarea
                          id={`instructions-${index}`}
                          value={prescription.instructions}
                          onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                          placeholder="e.g., Take twice daily after meals"
                          rows={2}
                          required={(prescription.medication || '').trim() !== ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`duration-${index}`}>Duration</Label>
                        <Input
                          id={`duration-${index}`}
                          value={prescription.duration}
                          onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                          placeholder="e.g., 7 days, 2 weeks, As needed"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>Consultation Notes</span>
                  </CardTitle>
                  <CardDescription>Additional notes and observations from the consultation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter any additional notes, observations, or recommendations..."
                      rows={6}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Optional: Add any relevant clinical notes or observations</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>Follow-up</span>
                  </CardTitle>
                  <CardDescription>Schedule a follow-up appointment if needed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followUpRequired"
                      checked={followUpRequired}
                      onCheckedChange={(checked) => setFollowUpRequired(checked === true)}
                    />
                    <Label htmlFor="followUpRequired" className="font-normal cursor-pointer">
                      Follow-up required
                    </Label>
                  </div>

                  {followUpRequired && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="followUpDate">Follow-up Date *</Label>
                        <Input
                          id="followUpDate"
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required={followUpRequired}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="followUpNotes">Follow-up Notes</Label>
                        <Textarea
                          id="followUpNotes"
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          placeholder="e.g., Review blood pressure, Check lab results..."
                          rows={4}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-teal-600 text-white hover:bg-teal-700"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Prescription
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/doctor/dashboard')}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-sm">Patient Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {displaySymptoms && displaySymptoms.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700">Symptoms:</p>
                      <p className="text-gray-600">
                        {Array.isArray(displaySymptoms)
                          ? displaySymptoms.join(', ')
                          : displaySymptoms}
                      </p>
                    </div>
                  )}
                  {appointment.preExistingConditions && appointment.preExistingConditions.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700">Pre-existing Conditions:</p>
                      <p className="text-gray-600">
                        {appointment.preExistingConditions.join(', ')}
                      </p>
                    </div>
                  )}
                  {appointment.allergies && (
                    <div>
                      <p className="font-semibold text-gray-700">Allergies:</p>
                      <p className="text-gray-600">{appointment.allergies || 'None reported'}</p>
                    </div>
                  )}
                  {appointment.medications && (
                    <div>
                      <p className="font-semibold text-gray-700">Current Medications:</p>
                      <p className="text-gray-600">{appointment.medications || 'None reported'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

