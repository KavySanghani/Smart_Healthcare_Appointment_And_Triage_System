import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Clock, MapPin, IndianRupee, Mail, Phone, Shield, ArrowLeft } from "lucide-react";

export default function AdminDoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
      try {
        // Using the admin-specific endpoint to get FULL details (including email/phone/license)
        // If you haven't created this specific endpoint yet, you might need to use your general /api/doctors/${id}
        // but ensure it returns the sensitive fields for admins.
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/user/${id}`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure we are looking at a doctor
        if (response.data.userType !== 'doctor' && response.data.user_type !== 'doctor') {
             setError('This user is not a doctor.');
        } else {
             setDoctor(response.data);
        }
      } catch (err) {
        setError('Could not fetch doctor profile. They might not exist or you lack permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDoctorProfile();
    }
  }, [id, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-lg text-cyan-700">
        <div className="animate-spin mr-3">
            <Stethoscope />
        </div>
        Loading admin view...
    </div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="text-red-600 text-xl">{error}</div>
            <Button onClick={() => navigate('/admin/dashboard')}>Return to Dashboard</Button>
        </div>
    );
  }

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-6 px-2 sm:px-0">
        <Link to="/admin/dashboard" className="inline-flex items-center text-cyan-700 hover:text-cyan-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
      </div>

      <Card className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="text-center p-6 md:p-8 bg-cyan-50/50 border-b">
          <Avatar className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 border-4 border-white shadow-md">
            {/* Assuming your backend might provide a profile picture URL, otherwise fallback */}
             <AvatarImage src={doctor.profilePicture || "/default-avatar.jpg"} alt={(doctor?.fullName || doctor?.full_name || 'N/A')} />
            <AvatarFallback className="text-4xl bg-cyan-200 text-cyan-800">
              {(doctor?.fullName || doctor?.full_name || 'Doctor').split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">{doctor?.fullName || doctor?.full_name || 'N/A'}</CardTitle>
          
           <div className="flex justify-center items-center gap-3 mt-3">
             <Badge className="bg-teal-100 text-teal-800 text-md hover:bg-teal-200">
                {doctor.specialization || 'General'}
             </Badge>
             {/* Admin Status Badge */}
             <Badge variant={(doctor?.isVerified || doctor?.is_verified) ? "default" : "destructive"} className={(doctor?.isVerified || doctor?.is_verified) ? "bg-green-600" : "bg-amber-600"}>
                {(doctor?.isVerified || doctor?.is_verified) ? "Verified Doctor" : "Pending Verification"}
             </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
            {/* Contact Info Section (Important for Admins) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-3 md:p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-cyan-600" />
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                    <p className="text-gray-700 truncate">{doctor.email}</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-cyan-600" />
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Phone</p>
                    <p className="text-gray-700">{doctor.phone || 'N/A'}</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-cyan-600" />
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">License No.</p>
                    <p className="text-gray-900 font-mono">{doctor.licenseNumber || 'N/A'}</p>
                </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-lg md:text-xl mb-3 text-gray-800 flex items-center">
                About Dr. {(doctor?.fullName || doctor?.full_name || 'Doctor').split(' ').slice(-1)}
            </h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {doctor.bio || 'No biography provided by this doctor.'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 border-t pt-6 md:pt-8">
            <div className="flex items-start space-x-4">
              <Clock className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Experience</p>
                <p className="text-gray-600">{doctor.experience ? `${doctor.experience} years` : 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <MapPin className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Clinic Address</p>
                <p className="text-gray-600">{doctor.address || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <IndianRupee className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Consultation Fee</p>
                <p className="text-gray-600">{doctor.consultationFee ? `₹${doctor.consultationFee}` : 'Not set'}</p>
              </div>
            </div>
             <div className="flex items-start space-x-4">
              <Stethoscope className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Joined On</p>
                <p className="text-gray-600">{new Date(doctor.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}