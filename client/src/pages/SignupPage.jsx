import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const specialties = ["Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics"];

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "", email: "", userType: "", password: "", confirmPassword: "",
    specialization: "", experience: "", licenseNumber: "", address: "", consultationFee: "", bio: "",
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const primaryColor = '#0F5257';

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!formData.userType) {
      setError("Please select a user role.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/signup`, formData);
      setSuccess(response.data.message);
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred during signup.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSelectChange = (name, value) => setFormData({ ...formData, [name]: value });

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <img src="/Logo.svg" className="h-17 w-15" alt="IntelliConsult Logo" />
          <span className="text-2xl font-bold text-gray-900">IntelliConsult</span>
        </div>
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Create an Account</CardTitle>
            <CardDescription className="text-gray-600">Get started with IntelliConsult</CardDescription>
          </CardHeader>
          <CardContent>
          
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-100 text-red-800">
                {error}
              </div>
            )}

            {!success && (
              <>
                <form onSubmit={handleLocalSubmit} className="space-y-4">
                  {/* Common Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-gray-700">Full Name</Label>
                    <Input id="fullName" name="fullName" type="text" placeholder="e.g., Jane Doe" value={formData.fullName} onChange={handleInputChange} required minLength={2} maxLength={100}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userType" className="text-gray-700">I am a</Label>
                    <Select value={formData.userType} onValueChange={(value) => handleSelectChange('userType', value)} required>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select your role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>

                  {/* Doctor Fields */}
                  {formData.userType === 'doctor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="specialization" className="text-gray-700">Specialization</Label>
                        <Select value={formData.specialization} onValueChange={(value) => handleSelectChange('specialization', value)} required>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select your specialty" /></SelectTrigger>
                          <SelectContent>
                            {specialties.map(specialty => (
                              <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience" className="text-gray-700">Years of Experience</Label>
                        <Input id="experience" name="experience" type="number" placeholder="e.g., 10" value={formData.experience} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber" className="text-gray-700">Medical License Number</Label>
                        <Input id="licenseNumber" name="licenseNumber" type="text" placeholder="Your license number" value={formData.licenseNumber} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-gray-700">Clinic Address</Label>
                        <Textarea id="address" name="address" placeholder="e.g., 123 Health St, Wellness City" value={formData.address} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="consultationFee" className="text-gray-700">Consultation Fee (in ₹)</Label>
                        <Input id="consultationFee" name="consultationFee" type="number" placeholder="e.g., 800" value={formData.consultationFee} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-gray-700">Brief Bio</Label>
                        <Textarea id="bio" name="bio" placeholder="Tell patients a little about yourself..." value={formData.bio} onChange={handleInputChange} />
                      </div>
                    </>
                  )}

                 
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleInputChange} required />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleInputChange} required />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>

                
              </>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Already have an account?{" "}<Link to="/login" className="text-teal-700 hover:text-teal-800 font-medium">Sign in</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}