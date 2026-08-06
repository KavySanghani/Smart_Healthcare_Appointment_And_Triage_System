import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Star, Clock, Stethoscope, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserProfileModal } from '@/components/UserProfileModal';

const specialties = ["All Specialties", "Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics"];

export default function FindDoctorsPage() {
  const primaryColor = '#0F5257';

  // State for search and filter inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  
  // State for holding and displaying doctors
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [patient, setPatient] = useState(null);

  // Fetch patient profile
  useEffect(() => {
    const fetchPatientProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatient(response.data);
      } catch (err) {
        console.error('Failed to fetch patient profile:', err);
      }
    };
    fetchPatientProfile();
  }, []);

  // Effect to fetch doctors whenever the search query or specialty changes
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        // Build the URL with query parameters for the backend
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        if (selectedSpecialty && selectedSpecialty !== 'All Specialties') {
          params.append('specialty', selectedSpecialty);
        }
        
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/doctors?${params.toString()}`);
        setDoctors(response.data);
      } catch (err) {
        setError('Failed to fetch doctors. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    // Use a timeout to prevent firing a request on every single keystroke
    const debounceTimeout = setTimeout(() => {
        fetchDoctors();
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, selectedSpecialty]);


  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`h-3 w-3 sm:h-4 sm:w-4 ${index < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};
  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
        <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/Logo.svg" className="h-15 w-13 sm:h-20 sm:w-15" style={{ color: primaryColor }} alt="Logo" />
              <span className="text-lg sm:text-2xl lg:text-3xl font-bold">IntelliConsult</span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link to="/patient/dashboard">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  Dashboard
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="hidden sm:flex border-slate-300 text-slate-800 hover:bg-slate-50 text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> Logout
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer w-8 h-8 sm:w-10 sm:h-10">
                    <AvatarImage src="/patient-consultation.png" alt={patient?.fullName || "Patient"} />
                    <AvatarFallback className="bg-teal-100 text-teal-800">
                      {patient?.fullName ? (patient?.fullName || patient?.full_name || 'Patient').split(" ").map((n) => n[0]).join("") : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setProfileModalOpen(true)}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleLogout} className="text-red-600">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        </nav>
      
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Find Your Doctor</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Search and book with qualified healthcare professionals.</p>
        </div>

        <Card className="bg-white border-gray-200 mb-4 sm:mb-6 lg:mb-8 sticky top-14 sm:top-16 z-40">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="w-full sm:w-48 lg:w-56 text-xs sm:text-sm h-9 sm:h-10">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty} className="text-xs sm:text-sm">{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8 sm:py-12 text-sm sm:text-base">Loading doctors...</div>
        ) : error ? (
          <div className="text-center py-8 sm:py-12 text-red-600 text-sm sm:text-base">{error}</div>
        ) : (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {doctors.length > 0 ? (
              doctors.map((doctor) => (
                <Card key={(doctor?.id || doctor?._id)} className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto sm:mx-0">
                        <AvatarImage src="/female-doctor.jpg" />
                        <AvatarFallback>Dr</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="text-center sm:text-left">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 truncate">{doctor?.fullName || doctor?.full_name || 'N/A'}</h3>
                            <Badge className="bg-teal-100 text-teal-800 text-xs mb-2">{doctor.specialization}</Badge>
                            <p className="text-gray-600 text-xs sm:text-sm lg:text-base mt-2 line-clamp-2">{doctor.bio}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 lg:gap-6 border-t pt-3 sm:pt-4">
                           <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                            <StarRating rating={doctor.averageRating} />
                            <span>({doctor.reviewCount} reviews)</span>
                          </div>
                           <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                             <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                             <span>{doctor.experience} years experience</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 justify-center w-full sm:w-auto sm:min-w-[140px] lg:min-w-[180px]">
                        <Link to={`/patient/book/${(doctor?.id || doctor?._id)}`} className="w-full">
                          <Button className="w-full bg-teal-600 text-white hover:bg-teal-700 h-9 text-xs sm:text-sm">Book Appointment</Button>
                        </Link>
                        <Link to={`/doctor/${(doctor?.id || doctor?._id)}`} className="w-full">
                          <Button variant="outline" className="w-full h-9 text-xs sm:text-sm">View Profile</Button>
                        </Link>
                        <Link to={`/doctor/${(doctor?.id || doctor?._id)}/reviews`} className="w-full">
                          <Button variant="outline" className="w-full h-9 text-xs sm:text-sm">View Reviews</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white border-gray-200">
                <CardContent className="text-center py-8 sm:py-12">
                  <Search className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No Doctors Found</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Try adjusting your search criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        patient={patient} 
      />
    </div>
  );
}