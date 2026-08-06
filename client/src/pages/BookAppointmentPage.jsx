import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowRight, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const commonSymptoms = [
  "Fever", "Cough", "Headache", "Nausea", "Dizziness", "Abdominal Pain",
  "Back Pain", "Shortness of Breath", "Fatigue"
];
const severeSymptoms = [
  "Severe chest pain or pressure",
  "Sudden difficulty breathing or shortness of breath",
  "Sudden confusion, disorientation, or difficulty speaking",
  "Sudden weakness, numbness, or drooping on one side of your face or body",
  "Sudden, severe headache (worst of your life)",
  "High fever (over 103°F / 39.4°C)",
  "Uncontrolled bleeding"
];
const preExistingConditions = [
  "Hypertension (High Blood Pressure)", "Diabetes (Type 1 or 2)", "Asthma",
  "Heart Disease", "Cancer", "Kidney Disease", "Thyroid Issues", "Depression", "Anxiety"
];
const familyHistoryOptions = [
  "Heart Disease", "Stroke", "Diabetes", "High Blood Pressure", "Cancer"
];

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState({ date: "", time: "" });
  
  const [appointmentDetails, setAppointmentDetails] = useState({
    patientNameForVisit: "", 
    phoneNumber: "",
    email: "",
    birthDate: "",
    sex: "",
    primaryLanguage: "",
    primaryReason: "",
    symptomsList: [],
    symptomsOther: "",
    symptomsBegin: "",
    severeSymptomsCheck: [],
    preExistingConditions: [],
    preExistingConditionsOther: "",
    pastSurgeries: "",
    familyHistory: [],
    familyHistoryOther: "",
    allergies: "",
    medications: "",
    consentToAI: false,
    emergencyDisclaimerAcknowledged: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [error, setError] = useState(''); 
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        setIsLoading(true);
        setSlotsLoading(true); 
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        const [doctorResponse, profileResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/doctors/${doctorId}`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, authHeaders),
        ]);

        setDoctor(doctorResponse.data);

        setAppointmentDetails(prev => ({ 
          ...prev, 
          patientNameForVisit: profileResponse.data.fullName || profileResponse.data.full_name || "",
          email: profileResponse.data.email || "",
        }));
        setIsLoading(false); 
        
        const slotsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/appointments/available-slots/${doctorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const now = new Date();
        const futureSlots = (slotsResponse.data || []).filter(slot => {
          if (!slot?.date || !slot?.time) return false;
          const slotDateTime = new Date(`${slot.date} ${slot.time}`);
          return slotDateTime > now;
        });
        setAvailableSlots(futureSlots);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch page details. The doctor may not exist or the server is down.");
      } finally {
        setIsLoading(false); 
        setSlotsLoading(false);
      }
    };
    fetchData();
  }, [doctorId, navigate]);

  const handleDetailsChange = (field, value) => {
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    
    if (field === "phoneNumber") {
      const numericValue = value.replace(/[^0-9]/g, '');
      if (numericValue.length > 10) return;
      
      setAppointmentDetails((prev) => ({ ...prev, [field]: numericValue }));
      
      if (numericValue.length > 0 && numericValue.length < 10) {
        setFormErrors(prev => ({ ...prev, [field]: "Phone number must be 10 digits." }));
      }
    } else if (field === "birthDate") {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      if (selectedDate > today) {
        setFormErrors(prev => ({ ...prev, [field]: "Date of birth cannot be in the future." }));
      }
      setAppointmentDetails((prev) => ({ ...prev, [field]: value }));
    
    } else {
      setAppointmentDetails((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleChecklistChange = (field, value, isChecked) => {
    setAppointmentDetails((prev) => {
      const list = prev[field] || [];

      if (isChecked) {
        if (value === "None of the above") {
          return { ...prev, [field]: ["None of the above"] };
        } else {
          const newList = list.filter(item => item !== "None of the above");
          return { ...prev, [field]: [...newList, value] };
        }
      } else {
        return { ...prev, [field]: list.filter((item) => item !== value) };
      }
    });
  };

  const handleBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("You must be logged in to book an appointment.");
      return;
    }
    
    if (!appointmentDetails.consentToAI) {
      alert("You must consent to AI processing to continue.");
      return;
    }

    setIsBooking(true);
    
    const bookingData = {
      doctorId,
      date: selectedSlot.date,
      time: selectedSlot.time,
      ...appointmentDetails,
      symptoms: [...appointmentDetails.symptomsList, appointmentDetails.symptomsOther].filter(Boolean),
      preExistingConditions: [...appointmentDetails.preExistingConditions, appointmentDetails.preExistingConditionsOther].filter(Boolean),
      familyHistory: [...appointmentDetails.familyHistory, appointmentDetails.familyHistoryOther].filter(Boolean),
    };
    
    // Clean up redundant fields before sending
    delete bookingData.symptomsList;
    delete bookingData.symptomsOther;
    delete bookingData.preExistingConditionsOther;
    delete bookingData.familyHistoryOther;
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/appointments/book`, bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Appointment booked successfully!");
      navigate('/patient/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || "Failed to book appointment.");
      setIsBooking(false);
    }
  };

  const handlePayment = async () => {
    if (Object.values(formErrors).some(err => err)) {
      alert("Please fix the errors on the form before proceeding.");
      return;
    }
    if (!doctor || !selectedSlot.date) {
      alert("Please complete all booking details first.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert("You must be logged in to make a payment.");
      return;
    }

    setIsPaymentProcessing(true);

    try {
      const fee = Number(doctor?.consultationFee || doctor?.consultation_fee || 0);
      const orderResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/appointments/create-payment-order`, {
        doctorId,
        amount: fee,
        currency: 'INR'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { orderId, amount, currency } = orderResponse.data;

      const options = {
        key: 'rzp_test_Raq438yqSnyOM4', 
        amount: amount,
        currency: currency,
        name: 'IntelliConsult',
        description: `Consultation with ${(doctor?.fullName || doctor?.full_name || 'N/A')}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/appointments/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              doctorId,
              date: selectedSlot.date,
              time: selectedSlot.time,
              ...appointmentDetails,
              symptoms: [...appointmentDetails.symptomsList, appointmentDetails.symptomsOther].filter(Boolean),
              preExistingConditions: [...appointmentDetails.preExistingConditions, appointmentDetails.preExistingConditionsOther].filter(Boolean),
              familyHistory: [...appointmentDetails.familyHistory, appointmentDetails.familyHistoryOther].filter(Boolean),
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyResponse.data.success) {
              alert("Payment successful! Appointment booked.");
              navigate('/patient/dashboard');
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: appointmentDetails.patientNameForVisit,
          email: appointmentDetails.email,
          contact: appointmentDetails.phoneNumber
        },
        theme: {
          color: '#0F5257'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
    </div>
  );
  if (error) return <div className="text-center p-8 text-red-600">{error}</div>;
  if (!doctor) return null;

  const isStep2Valid = 
    appointmentDetails.patientNameForVisit &&
    appointmentDetails.phoneNumber &&
    appointmentDetails.email &&
    appointmentDetails.birthDate &&
    appointmentDetails.sex &&
    appointmentDetails.primaryLanguage &&
    appointmentDetails.primaryReason &&
    appointmentDetails.symptomsBegin &&
    appointmentDetails.severeSymptomsCheck.length > 0 &&
    appointmentDetails.consentToAI &&
    appointmentDetails.emergencyDisclaimerAcknowledged &&
    !Object.values(formErrors).some(err => err);

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
                <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <img src="/Logo.svg" className="h-15 w-13 sm:h-20 sm:w-15" alt="Logo" />
                    <span className="text-lg sm:text-2xl lg:text-3xl font-bold text-teal-900">IntelliConsult</span>
                </Link>
                <Button variant="outline" onClick={() => navigate('/patient/dashboard')} className="text-xs sm:text-sm">
                  Dashboard
                </Button>
            </div>
        </div>
      </nav>

      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${step >= 1 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
          <div className={`w-8 sm:w-12 h-0.5 ${step >= 2 ? "bg-teal-600" : "bg-gray-200"}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${step >= 2 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
          <div className={`w-8 sm:w-12 h-0.5 ${step >= 3 ? "bg-teal-600" : "bg-gray-200"}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${step >= 3 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"}`}>3</div>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Doctor Info Card */}
          <Card className="bg-white border-gray-200 mb-6 sm:mb-8">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                <AvatarImage src="/female-doctor.jpg" />
                <AvatarFallback>Dr</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{doctor?.fullName || doctor?.full_name || 'N/A'}</h2>
                <Badge className="bg-teal-100 text-teal-800 mb-2 mt-1 hover:bg-teal-200">{doctor.specialization}</Badge>
                <p className="text-sm text-gray-500">Consultation Fee: ₹{doctor.consultationFee}</p>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Select Time */}
          {step === 1 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Select Appointment Time</CardTitle>
                <CardDescription>Choose an available time slot.</CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="text-center p-8 flex flex-col items-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-teal-600" />
                    Loading slots...
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {availableSlots.map((slot, index) => {
                      const isSelected = selectedSlot.date === slot.date && selectedSlot.time === slot.time;
                      return (
                        <Button 
                          key={index} 
                          variant={isSelected ? "default" : "outline"} 
                          className={`h-auto p-4 justify-start flex items-center space-x-3 border ${
                            isSelected 
                              ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700" 
                              : "bg-white hover:bg-emerald-50 text-gray-700 border-gray-200"
                          }`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <Calendar className={`h-5 w-5 ${isSelected ? "text-white" : "text-teal-600"}`} />
                          <div className="text-left">
                            <div className="font-medium">{new Date(slot.date).toDateString()}</div>
                            <div className={`text-sm ${isSelected ? "text-teal-100" : "text-gray-500"}`}>{slot.time}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 border rounded-lg bg-gray-50">
                    <p className="text-gray-600 font-medium">No available slots found.</p>
                    <p className="text-sm text-gray-500 mt-1">Please try a different date or check back later.</p>
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={() => setStep(2)} 
                    disabled={!selectedSlot.date}
                    className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto"
                  >
                    Next Step <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details Form */}
          {step === 2 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
                <CardDescription>Please provide details about the patient's visit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-red-800">Medical Emergency Disclaimer</AlertTitle>
                  <AlertDescription className="text-red-700 mt-2">
                    If you are experiencing a medical emergency (such as severe chest pain, difficulty breathing, uncontrolled bleeding, or sudden weakness), <strong>please call emergency services immediately.</strong>
                  </AlertDescription>
                  <div className="flex items-start space-x-2 mt-4 pt-4 border-t border-red-200">
                    <Checkbox 
                      id="emergencyDisclaimer" 
                      checked={appointmentDetails.emergencyDisclaimerAcknowledged}
                      onCheckedChange={(checked) => handleDetailsChange("emergencyDisclaimerAcknowledged", checked)} 
                    />
                    <Label htmlFor="emergencyDisclaimer" className="font-medium text-red-900 cursor-pointer leading-snug">
                      I confirm this is NOT a medical emergency.
                    </Label>
                  </div>
                </Alert>

                {/* Patient Demographics */}
                <div className="space-y-4 p-4 sm:p-5 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h3 className="font-semibold text-lg text-teal-900 flex items-center">
                    <div className="h-6 w-1 bg-teal-600 rounded-full mr-2"></div>
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="patientNameForVisit">Patient's Full Name *</Label>
                      <Input id="patientNameForVisit" value={appointmentDetails.patientNameForVisit || ""} onChange={(e) => handleDetailsChange("patientNameForVisit", e.target.value)} className="bg-white" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        value={appointmentDetails.phoneNumber || ""} 
                        onChange={(e) => handleDetailsChange("phoneNumber", e.target.value)} 
                        className="bg-white"
                        maxLength={10}
                      />
                      {formErrors.phoneNumber && <p className="text-xs text-red-600">{formErrors.phoneNumber}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" value={appointmentDetails.email || ""} onChange={(e) => handleDetailsChange("email", e.target.value)} className="bg-white" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Birth Date *</Label>
                      <Input id="birthDate" type="date" value={appointmentDetails.birthDate || ""} onChange={(e) => handleDetailsChange("birthDate", e.target.value)} className="bg-white" />
                      {formErrors.birthDate && <p className="text-xs text-red-600">{formErrors.birthDate}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex *</Label>
                      <Select value={appointmentDetails.sex} onValueChange={(value) => handleDetailsChange("sex", value)}>
                        <SelectTrigger id="sex" className="bg-white w-full"><SelectValue placeholder="Select sex" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="primaryLanguage">Primary Language Spoken *</Label>
                      <Input id="primaryLanguage" value={appointmentDetails.primaryLanguage} onChange={(e) => handleDetailsChange("primaryLanguage", e.target.value)} className="bg-white" placeholder="e.g., English, Hindi" />
                    </div>
                  </div>
                </div>

                {/* Triage Questions */}
                <div className="space-y-5 p-4 sm:p-5 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h3 className="font-semibold text-lg text-teal-900 flex items-center">
                     <div className="h-6 w-1 bg-teal-600 rounded-full mr-2"></div>
                     Medical Details
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="primaryReason" className="text-base">What is the primary reason for your visit? *</Label>
                    <Input 
                      id="primaryReason" 
                      placeholder="e.g., Fever, Annual checkup..." 
                      value={appointmentDetails.primaryReason} 
                      onChange={(e) => handleDetailsChange("primaryReason", e.target.value)} 
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base">What symptoms are you experiencing?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {commonSymptoms.map((symptom) => (
                        <div key={symptom} className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors">
                          <Checkbox 
                            id={symptom} 
                            onCheckedChange={(checked) => handleChecklistChange("symptomsList", symptom, checked)} 
                            checked={appointmentDetails.symptomsList.includes(symptom)}
                          />
                          <Label htmlFor={symptom} className="font-normal cursor-pointer text-sm">{symptom}</Label>
                        </div>
                      ))}
                    </div>
                    <Input placeholder="Other symptoms..." value={appointmentDetails.symptomsOther} onChange={(e) => handleDetailsChange("symptomsOther", e.target.value)} className="bg-white mt-2" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base">When did your main symptoms begin? *</Label>
                    <RadioGroup 
                      value={appointmentDetails.symptomsBegin} 
                      onValueChange={(value) => handleDetailsChange("symptomsBegin", value)} 
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {["Less than 24 hours ago", "1-3 days ago", "4-7 days ago", "1-2 weeks ago", "More than 2 weeks ago"].map((timeframe, idx) => (
                         <div key={idx} className="flex items-center space-x-2 p-2 rounded hover:bg-white">
                           <RadioGroupItem value={timeframe} id={`s${idx}`} />
                           <Label htmlFor={`s${idx}`} className="font-normal cursor-pointer">{timeframe}</Label>
                         </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-3 p-4 bg-red-50 rounded-md border border-red-100">
                    <Label className="text-base text-red-900 font-medium">Have you experienced any of the following severe symptoms in the last 7 days? *</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                        {severeSymptoms.map((symptom) => (
                        <div key={symptom} className="flex items-center space-x-2">
                            <Checkbox 
                            id={symptom} 
                            onCheckedChange={(checked) => handleChecklistChange("severeSymptomsCheck", symptom, checked)} 
                            checked={appointmentDetails.severeSymptomsCheck.includes(symptom)}
                            />
                            <Label htmlFor={symptom} className="font-normal text-sm">{symptom}</Label>
                        </div>
                        ))}
                        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-red-200">
                        <Checkbox 
                            id="none-severe" 
                            onCheckedChange={(checked) => handleChecklistChange("severeSymptomsCheck", "None of the above", checked)} 
                            checked={appointmentDetails.severeSymptomsCheck.includes("None of the above")}
                        />
                        <Label htmlFor="none-severe" className="font-medium text-sm">None of the above</Label>
                        </div>
                    </div>
                  </div>
                </div>

                 <div className="space-y-5 p-4 sm:p-5 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h3 className="font-semibold text-lg text-teal-900 flex items-center">
                     <div className="h-6 w-1 bg-teal-600 rounded-full mr-2"></div>
                     History
                  </h3>
                  <div className="space-y-3">
                    <Label className="text-base">Do you have any pre-existing medical conditions?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {preExistingConditions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox id={condition} onCheckedChange={(checked) => handleChecklistChange("preExistingConditions", condition, checked)} checked={appointmentDetails.preExistingConditions.includes(condition)} />
                          <Label htmlFor={condition} className="font-normal text-sm">{condition}</Label>
                        </div>
                      ))}
                    </div>
                    <Input placeholder="Other conditions..." value={appointmentDetails.preExistingConditionsOther} onChange={(e) => handleDetailsChange("preExistingConditionsOther", e.target.value)} className="bg-white" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pastSurgeries">Past surgeries or hospitalizations</Label>
                    <Textarea id="pastSurgeries" placeholder="Procedure and year..." value={appointmentDetails.pastSurgeries} onChange={(e) => handleDetailsChange("pastSurgeries", e.target.value)} className="bg-white" rows={2} />
                  </div>

                  <div className="space-y-3">
                    <Label>Immediate Family History</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {familyHistoryOptions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox id={condition+"-fam"} onCheckedChange={(checked) => handleChecklistChange("familyHistory", condition, checked)} checked={appointmentDetails.familyHistory.includes(condition)} />
                          <Label htmlFor={condition+"-fam"} className="font-normal text-sm">{condition}</Label>
                        </div>
                      ))}
                       <div className="flex items-center space-x-2">
                          <Checkbox id="none-fam" onCheckedChange={(checked) => handleChecklistChange("familyHistory", "None of the above", checked)} checked={appointmentDetails.familyHistory.includes("None of the above")} />
                          <Label htmlFor="none-fam" className="font-normal text-sm">None of the above</Label>
                      </div>
                    </div>
                    <Input placeholder="If cancer, specify type..." value={appointmentDetails.familyHistoryOther} onChange={(e) => handleDetailsChange("familyHistoryOther", e.target.value)} className="bg-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies (Food, Drug, Seasonal)</Label>
                    <Textarea id="allergies" placeholder="List any allergies..." value={appointmentDetails.allergies} onChange={(e) => handleDetailsChange("allergies", e.target.value)} className="bg-white" rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medications">Current Medications</Label>
                    <Textarea id="medications" placeholder="e.g., Lisinopril 10mg..." value={appointmentDetails.medications} onChange={(e) => handleDetailsChange("medications", e.target.value)} className="bg-white" rows={2} />
                  </div>
                </div>

                {/* Consent */}
                <div className="flex items-start space-x-3 p-4 border border-teal-100 bg-teal-50/50 rounded-lg">
                  <Checkbox 
                    id="consentToAI" 
                    checked={appointmentDetails.consentToAI} 
                    onCheckedChange={(checked) => handleDetailsChange("consentToAI", checked)} 
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="consentToAI" className="font-semibold text-teal-900 cursor-pointer">Consent to AI Processing *</Label>
                    <p className="text-sm text-gray-600">
                      I confirm the information is accurate and consent to it being processed by an AI to create a medical summary for my doctor.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    disabled={!isStep2Valid}
                    className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Review Booking <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Confirm Your Appointment</CardTitle>
                <CardDescription>Review your details before confirming.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-emerald-50/50 p-5 rounded-lg space-y-4 border border-emerald-100">
                  <h3 className="font-semibold text-lg text-teal-900 border-b border-emerald-200 pb-2">Booking Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                     <div className="flex flex-col"><span className="text-gray-500">Doctor</span><span className="font-medium text-gray-900">{doctor?.fullName || doctor?.full_name || 'N/A'}</span></div>
                     <div className="flex flex-col"><span className="text-gray-500">Date & Time</span><span className="font-medium text-gray-900">{new Date(selectedSlot.date).toDateString()} at {selectedSlot.time}</span></div>
                     <div className="flex flex-col"><span className="text-gray-500">Patient</span><span className="font-medium text-gray-900">{appointmentDetails.patientNameForVisit}</span></div>
                     <div className="flex flex-col"><span className="text-gray-500">Primary Reason</span><span className="font-medium text-gray-900">{appointmentDetails.primaryReason}</span></div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button onClick={handlePayment} size="lg" className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto" disabled={isPaymentProcessing}>
                    {isPaymentProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isPaymentProcessing ? "Processing..." : "Pay & Book"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}