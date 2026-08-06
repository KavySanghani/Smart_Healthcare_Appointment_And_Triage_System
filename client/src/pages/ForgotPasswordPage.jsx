import React, { useState } from "react";
import { Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ForgotPasswordPage() {
  const [userType, setUserType] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const primaryColor = '#0F5257';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !userType) {
      setError("Please enter your email and select your role.");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email, userType });
      setSuccess(response.data.message);
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <Stethoscope className="h-8 w-8" style={{ color: primaryColor }} />
          <span className="text-3xl font-bold text-gray-900">IntelliConsult</span>
        </div>
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Forgot Password</CardTitle>
            <CardDescription className="text-gray-600">Enter your email to reset your password</CardDescription>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userType">I am a</Label>
                  <Select value={userType} onValueChange={setUserType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg" disabled={isLoading}>
                  {isLoading ? 'Sending Email...' : 'Send Reset Link'}
                </Button>
              </form>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Remembered your password?{" "}<Link to="/login" className="text-teal-700 hover:text-teal-800 font-medium">Sign in</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}