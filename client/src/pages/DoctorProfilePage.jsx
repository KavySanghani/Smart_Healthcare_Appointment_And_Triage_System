import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Clock, Star, MapPin, IndianRupee } from "lucide-react";

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
        setError('Could not fetch doctor profile. The doctor may not exist or the server is unavailable.');
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
      {/* Added animation keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>

      <Card className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden fade-in">
        <CardHeader className="text-center p-6 md:p-8 bg-teal-50/50 border-b">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 border-4 border-white shadow-md transition-transform duration-300 hover:scale-105 fade-in-up" style={{ animationDelay: '0.1s' }}>
            <AvatarImage src="/female-doctor.jpg" alt={(doctor?.fullName || doctor?.full_name || 'N/A')} />
            <AvatarFallback className="text-4xl">
              {(doctor?.fullName || doctor?.full_name || 'Doctor').split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 fade-in-up" style={{ animationDelay: '0.2s' }}>{doctor?.fullName || doctor?.full_name || 'N/A'}</CardTitle>
          <Badge className="mt-2 bg-teal-100 text-teal-800 text-sm md:text-md py-1 px-3 fade-in-up" style={{ animationDelay: '0.3s' }}>{doctor.specialization}</Badge>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="mb-8 fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="font-bold text-xl mb-3 text-gray-800">About Dr. {(doctor?.fullName || doctor?.full_name || 'Doctor').split(' ').slice(-1)}</h3>
            <p className="text-gray-600 leading-relaxed">{doctor.bio || 'No biography available.'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 border-t pt-6 md:pt-8">
            <div className="flex items-start space-x-4 fade-in-up" style={{ animationDelay: '0.5s' }}>
              <Clock className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Experience</p>
                <p className="text-gray-600">{doctor.experience} years</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 fade-in-up" style={{ animationDelay: '0.6s' }}>
              <MapPin className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Clinic Address</p>
                <p className="text-gray-600">{doctor.address}</p>
              </div>
            </div>
            {/* ADDED: Consultation Fee Display */}
            <div className="flex items-start space-x-4 fade-in-up" style={{ animationDelay: '0.7s' }}>
              <IndianRupee className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">Consultation Fee</p>
                <p className="text-gray-600">₹{doctor.consultationFee}</p>
              </div>
            </div>
             <div className="flex items-start space-x-4 fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Stethoscope className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-700">License</p>
                <p className="text-gray-600">Verified</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 fade-in-up" style={{ animationDelay: '0.9s' }}>
            <Link to={`/patient/book/${(doctor?.id || doctor?._id)}`}>
             <Button size="lg" className="w-full md:w-auto bg-teal-600 text-white hover:bg-teal-700 px-6 py-3 md:px-10 md:py-6 text-lg transition-transform duration-300 hover:scale-105">
                Book an Appointment
             </Button>
            </Link>
            <Link to="/patient/doctors" className="block mt-4 text-sm text-teal-700 hover:underline">
              ← Back to search results
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

