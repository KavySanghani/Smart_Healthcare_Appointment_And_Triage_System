import React, { useState } from "react";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const primaryColor = '#0F5257';

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const passwordError = "Password must be at least 8 characters long and contain one uppercase, one lowercase, one number, and one special character.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!passwordRegex.test(password)) {
      setError(passwordError);
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`, 
        { password, confirmPassword }
      );
      setSuccess(response.data.message);
    } catch (error) {
      setError(error.response?.data?.message || "An error occurred.");
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
            <CardTitle className="text-2xl font-bold text-gray-900">Reset Your Password</CardTitle>
            <CardDescription className="text-gray-600">Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
          
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800">
                {success}
                <Button asChild variant="link" className="p-0 h-auto text-green-800">
                  <Link to="/login">Click here to log in</Link>
                </Button>
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
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your new password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Must be 8+ characters, with one uppercase, one lowercase, one number, and one special character.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm your new password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg" disabled={isLoading}>
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
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