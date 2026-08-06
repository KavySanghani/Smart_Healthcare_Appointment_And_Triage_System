import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Loader2, ArrowLeft, FileText, Pill, Calendar, Clock, FileDown } from "lucide-react";
const API_BASE_URL = `${import.meta.env.VITE_API_URL}`;

const PatientPrescriptionView = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrescription = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/prescriptions/appointment/${appointmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setRecord(response.data.medicalRecord || response.data.medical_record);
        } else {
          setError("Could not find a prescription for this appointment.");
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError("No prescription given by doctor till now.");
        } else {
          console.error("Error fetching prescription:", err);
          setError("Failed to fetch prescription details.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrescription();
  }, [appointmentId, navigate]);

  const handleDownloadPDF = async () => {
    if (!record) return;

    setIsDownloading(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/prescriptions/${(record?.id || record?._id)}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `prescription-${(record?.id || record?._id)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Error downloading PDF:", err);
      setError("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-emerald-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-yellow-700">Notice</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/patient/dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="min-h-screen bg-emerald-50 p-4 md:p-8">
      <div className="container max-w-3xl mx-auto">
        <Card className="bg-white shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CardTitle className="text-2xl font-bold text-teal-700">Your Prescription</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={handleDownloadPDF} disabled={isDownloading} className="w-full sm:w-auto">
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
                <Button onClick={() => navigate('/patient/dashboard')} variant="outline" size="sm" className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>
            </div>
            <CardDescription>
              Details from your consultation on {new Date(record.appointment.date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm">Doctor</Label>
                <div className="flex items-center space-x-3 mt-2">
                  <Avatar>
                    <AvatarImage src="/female-doctor.jpg" alt={record.doctor?.fullName || record.doctor?.full_name} />
                    <AvatarFallback>Dr</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{record.doctor?.fullName || record.doctor?.full_name}</p>
                    <p className="text-sm text-gray-500">{record.doctor?.specialization}</p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm">Patient</Label>
                <div className="flex items-center space-x-3 mt-2">
                  <Avatar>
                    <AvatarFallback>{(record?.patient?.fullName || record?.patient?.full_name || 'Patient').split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{record.patient?.fullName || record.patient?.full_name}</p>
                    <p className="text-sm text-gray-500">{record.patient?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center"><FileText className="h-5 w-5 mr-2 text-teal-600" />Diagnosis</h3>
              <p className="p-4 bg-emerald-50/50 rounded-md border">{record.diagnosis}</p>
            </div>

            {(record.prescription || record.prescription_data) && (record.prescription || record.prescription_data).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center"><Pill className="h-5 w-5 mr-2 text-teal-600" />Medications</h3>
                <div className="space-y-3">
                  {(record.prescription || record.prescription_data).map((med, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <p className="font-bold text-md">{med.medication || med.medicineName || med.medicine_name}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium">Dosage:</span> {med.dosage}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium">Frequency:</span> {med.frequency || 'N/A'}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium">Instructions:</span> {med.instructions}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.notes && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Doctor's Notes</h3>
                <p className="p-4 bg-gray-50 rounded-md border text-gray-700">{record.notes}</p>
              </div>
            )}

            {(record.followUpRequired || record.follow_up_required) && (
              <div className="space-y-2 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-md">
                <h3 className="font-semibold text-lg text-blue-800 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" /> Follow-up Required
                </h3>
                <p className="text-blue-700"><span className="font-medium">Date:</span> {new Date(record.followUpDate || record.follow_up_date).toLocaleDateString()}</p>
                {(record.followUpNotes || record.follow_up_notes) && (
                  <p className="text-blue-700"><span className="font-medium">Notes:</span> {record.followUpNotes || record.follow_up_notes}</p>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PatientPrescriptionView;