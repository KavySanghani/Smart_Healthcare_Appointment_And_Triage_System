import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Plus, Search, Stethoscope, LogOut, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserProfileModal } from '@/components/UserProfileModal';
import { ReviewModal } from '@/components/ReviewModal.jsx';
import { FileText } from 'lucide-react';
import {  useLocation, useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const primaryColor = '#0F5257';

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [reviewModalAppointment, setReviewModalAppointment] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const [profileResponse, appointmentsResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/appointments/my-appointments`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPatient(profileResponse.data);
        setAppointments(appointmentsResponse.data);
      } catch (err) {
        setError(`Failed to fetch data (${err.response?.status || 'Network Error'}). Please try logging in again.`);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    const aptToReview = location.state?.showReviewFor;
    
    if (aptToReview) {
      const freshAppointmentData = appointments.find(a => (a?.id || a?._id) === (aptToReview?.id || aptToReview?._id));

      setReviewModalAppointment(freshAppointmentData || aptToReview);
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, appointments, navigate]);
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      
      await axios.put(`${import.meta.env.VITE_API_URL}/api/appointments/${appointmentId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(prevAppointments =>
        prevAppointments.map(apt =>
          (apt?.id || apt?._id) === appointmentId ? { ...apt, status: 'cancelled' } : apt
        )
      );
      
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel appointment.");
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading your dashboard...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingAppointments = appointments.filter((apt) => 
    new Date(apt.date) >= today && apt.status === 'upcoming'
  );
  const pastAppointments = appointments.filter((apt) => 
    new Date(apt.date) < today || apt.status === 'completed' || apt.status === 'cancelled'
  );

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
              <Link to="/patient/doctors">
                <Button variant="outline" size="sm" className="border-teal-300 text-teal-800 hover:bg-teal-50 hover:text-teal-900 text-xs sm:text-sm">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> 
                  <span className="hidden sm:inline">Find Doctors</span>
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="hidden sm:flex border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900 text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> 
                Logout
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer w-8 h-8 sm:w-10 sm:h-10">
                      <AvatarImage src="/patient-consultation.png" alt={patient?.fullName || patient?.full_name || 'Patient'} />
                      <AvatarFallback className="bg-teal-100 text-teal-800">
                        {(patient?.fullName || patient?.full_name || 'Patient').split(" ").map((n) => n[0]).join("")}
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
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Welcome back, {(patient?.fullName || patient?.full_name || 'Patient').split(' ')[0]}!</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Manage your appointments and health journey.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <Link to="/patient/doctors">
            <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <CardHeader className="pb-3 flex-row items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Book Appointment</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Find and book with doctors</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-3 flex-row items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Upcoming</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{upcomingAppointments.length} appointments</CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-white border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-3 flex-row items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Past Visits</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{pastAppointments.length} completed</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">Upcoming Appointments</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your scheduled consultations</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <div key={(apt?.id || apt?._id)} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-emerald-50/50">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                            <AvatarImage src="/female-doctor.jpg" />
                            <AvatarFallback>Dr</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{apt.doctor?.fullName || apt.doctor?.full_name || 'Doctor'}</h3>
                            <p className="text-xs sm:text-sm font-medium text-teal-800">For: {apt.patientNameForVisit || 'Patient'}</p>
                            <p className="text-xs sm:text-sm text-gray-600">{apt.doctor?.specialization || 'General'}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{new Date(apt.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{apt.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Badge className="bg-teal-100 text-teal-800 w-fit text-xs">Upcoming</Badge>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link 
                            to={`/call/${(apt?.id || apt?._id)}`} 
                            state={{ 
                              userName: patient?.fullName || patient?.full_name || 'Patient',
                              userType: 'patient', 
                              appointment: apt 
                            }}
                            className="flex-1 min-h-[36px]"
                          >
                            <Button
                              size="sm"
                              className="w-full min-h-[36px] h-9 text-xs sm:text-sm bg-green-600 text-white hover:bg-green-700"
                            >
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Join Call
                            </Button>
                          </Link>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="min-h-[36px] h-9 text-xs sm:text-sm flex-1"
                            onClick={() => handleCancelAppointment((apt?.id || apt?._id))}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">No upcoming appointments</p>
                    <Link to="/patient/doctors">
                      <Button className="bg-teal-600 text-white hover:bg-teal-700 text-xs sm:text-sm">Book Your First Appointment</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">Recent Visits</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your consultation history</CardDescription>
            </CardHeader>
            <CardContent>
              {pastAppointments.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {pastAppointments.map((apt) => (
                    <div key={(apt?.id || apt?._id)} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 border rounded-lg bg-emerald-50/50">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                          <AvatarImage src="/female-doctor.jpg" />
                          <AvatarFallback>Dr</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{apt.doctor?.fullName || apt.doctor?.full_name || 'Doctor'}</h3>
                          <p className="text-xs sm:text-sm font-medium text-teal-800">For: {apt.patientNameForVisit || 'Patient'}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{apt.doctor?.specialization || 'General'}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{new Date(apt.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Badge variant={apt.status === 'completed' ? 'outline' : 'destructive'} className="w-fit text-xs">
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </Badge>
                        {apt.status === 'completed' && (
                          <Link to={`/patient/prescription/${(apt?.id || apt?._id)}`} className="w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 sm:h-9 text-xs sm:text-sm w-full"
                            >
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              View Prescription
                            </Button>
                          </Link>
                        )}
                        {apt.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
                            onClick={() => setReviewModalAppointment(apt)}
                          >
                            Leave Review
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No past appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        patient={patient}
        onProfileUpdate={setPatient}
      />
      <ReviewModal
        isOpen={!!reviewModalAppointment}
        onClose={() => setReviewModalAppointment(null)}
        appointment={reviewModalAppointment}
      />
    </div>
    
  );
}
