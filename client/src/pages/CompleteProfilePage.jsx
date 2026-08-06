import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope } from "lucide-react";


const specialties = ["Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics"];

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const primaryColor = '#0F5257';

  const [userInfo, setUserInfo] = useState({ fullName: 'Loading...', email: 'Loading...' });

  const [formData, setFormData] = useState({
    userType: "", 
    specialization: "",
    experience: "",
    licenseNumber: "",
    address: "",
    consultationFee: "",
    bio: "",
    
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch basic profile info to display user's name/email for context
  useEffect(() => {
    const fetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login'); // Redirect if no token
            return;
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserInfo({ fullName: response.data.fullName, email: response.data.email });
        } catch (err) {
            console.error("Failed to fetch basic profile info", err);
        }
    };
    fetchProfile();
  }, [navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication error. Please log in again.");
      setIsLoading(false);
      navigate('/login');
      return;
    }

    if (!formData.userType) {
        alert("Please select your role.");
        setIsLoading(false);
        return;
    }

    const profileData = {
        userType: formData.userType, // Send the selected userType
        ...(formData.userType === 'doctor' && {
            specialization: formData.specialization,
            experience: formData.experience,
            licenseNumber: formData.licenseNumber,
            address: formData.address,
            consultationFee: formData.consultationFee,
            bio: formData.bio,
        }),
    };


    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/complete-profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(response.data.message || 'Profile completed successfully!');

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      

      switch (formData.userType) {
        case 'doctor': navigate('/doctor/dashboard'); break;
        case 'patient': navigate('/patient/dashboard'); break;
        case 'admin': navigate('/admin/dashboard'); break; // Assuming this route exists
        default: navigate('/'); // Fallback
      }

    } catch (err) {
      const message = err.response?.data?.message || "An error occurred while completing your profile.";
      setError(message);
      console.error("Profile completion error:", err.response || err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-lg"> {/* Increased width slightly */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Stethoscope className="h-8 w-8" style={{ color: primaryColor }} />
          <span className="text-2xl font-bold text-gray-900">IntelliConsult</span>
        </div>

        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Complete Your Profile</CardTitle>
            <CardDescription className="text-gray-600">
              Welcome, {userInfo.fullName}! Please provide a few more details to get started.
            </CardDescription>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-gray-700 font-semibold">Select Your Role*</Label>
                <Select value={formData.userType} onValueChange={(value) => handleSelectChange('userType', value)} required>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Are you a Patient, Doctor, or Admin?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.userType === 'doctor' && (
                <>
                  <hr className="my-4"/>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Doctor Details</h3>
                    <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-gray-700">Specialization*</Label>
                    <Select value={formData.specialization} onValueChange={(value) => handleSelectChange('specialization', value)} required>
                      <SelectTrigger><SelectValue placeholder="Select your specialty" /></SelectTrigger>
                      <SelectContent>
                        {specialties.map(specialty => (
                          <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience" className="text-gray-700">Years of Experience*</Label>
                      <Input id="experience" name="experience" type="number" placeholder="e.g., 10" value={formData.experience} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultationFee" className="text-gray-700">Consultation Fee (in ₹)*</Label>
                      <Input id="consultationFee" name="consultationFee" type="number" placeholder="e.g., 800" value={formData.consultationFee} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="text-gray-700">Medical License Number*</Label>
                    <Input id="licenseNumber" name="licenseNumber" type="text" placeholder="Your license number" value={formData.licenseNumber} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-700">Clinic Address*</Label>
                    <Textarea id="address" name="address" placeholder="e.g., 123 Health St, Wellness City" value={formData.address} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-gray-700">Brief Bio</Label>
                    <Textarea id="bio" name="bio" placeholder="Tell patients a little about yourself (optional)..." value={formData.bio} onChange={handleInputChange} />
                  </div>
                </>
              )}


              <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Complete Profile'}
              </Button>
            </form>
             <div className="mt-4 text-center">
                 <p className="text-xs text-gray-500">You signed in with Google ({userInfo.email})</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}