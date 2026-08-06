import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Clock, MapPin, IndianRupee, ArrowLeft } from "lucide-react";

export default function DoctorProfilePage() {
  const { id } = useParams(); 
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/doctors/${id}`);
        setDoctor(response.data);
      } catch (err) {
        setError('Could not fetch doctor profile.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDoctorProfile();
    }
  }, [id]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading profile...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
  }

  if (!doctor) {
    return <div className="flex items-center justify-center h-screen">Doctor not found.</div>;
  }

  return (
    <div className="min-h-screen bg-emerald-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          to="/admin/dashboard"
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <Card className="bg-white shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="text-center p-8 bg-teal-50/50 border-b">
            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-white shadow-md">
              <AvatarFallback className="text-4xl">
                {(doctor?.fullName || doctor?.full_name || 'Doctor').split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-bold text-gray-900">{doctor?.fullName || doctor?.full_name || 'N/A'}</CardTitle>
            <Badge className="mt-2 bg-teal-100 text-teal-800 text-md py-1 px-3">
              {doctor.specialization}
            </Badge>
          </CardHeader>

          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <Clock className="h-6 w-6 text-teal-600 mt-1" />
                <div>
                  <p className="font-semibold">Experience</p>
                  <p className="text-gray-600">{doctor.experience} years</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <MapPin className="h-6 w-6 text-teal-600 mt-1" />
                <div>
                  <p className="font-semibold">Clinic Address</p>
                  <p className="text-gray-600">{doctor.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <IndianRupee className="h-6 w-6 text-teal-600 mt-1" />
                <div>
                  <p className="font-semibold">Consultation Fee</p>
                  <p className="text-gray-600">₹{doctor.consultationFee}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Stethoscope className="h-6 w-6 text-teal-600 mt-1" />
                <div>
                  <p className="font-semibold">License Number</p>
                  <p className="text-gray-600">{doctor.licenseNumber}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}