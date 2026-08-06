import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Calendar, ArrowLeft, CheckCircle, XCircle, LogOut, User, Mail } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';

function useOutsideClick(ref, handler) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        handler();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler]);
}

export default function AdminAppointmentsPage() {
  // Separate states for each appointment type
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [cancelledAppointments, setCancelledAppointments] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  useOutsideClick(dropdownRef, () => setIsProfileOpen(false));

  // Fetch admin profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.userType !== 'admin' && response.data.user_type !== 'admin') {
          setError("Access Denied. You are not an admin.");
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setAdminProfile(response.data);
        }
      } catch (err) {
        setError("Failed to fetch admin profile.");
        console.error("Failed to fetch admin profile", err);
      }
    };
    fetchAdminProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchAppointments = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/appointments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const allAppointments = response.data;

        // 1. Filter by status
        const upcoming = allAppointments.filter(a => a.status === 'upcoming' || a.status === 'rescheduled');
        const cancelled = allAppointments.filter(a => a.status === 'cancelled');
        const completed = allAppointments.filter(a => a.status === 'completed');

        // 2. Sort upcoming appointments (soonest first)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Set the new states
        setUpcomingAppointments(upcoming);
        setCancelledAppointments(cancelled);
        setCompletedAppointments(completed);

      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching data.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Reusable component for the appointment table body
  const AppointmentTableBody = ({ appointments }) => {
    if (appointments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
            No appointments found in this category.
          </TableCell>
        </TableRow>
      );
    }

    return appointments.map((appt) => (
      <TableRow key={(appt?.id || appt?._id)}>
        <TableCell className="font-medium">
          {appt.patientNameForVisit || 'N/A'}
        </TableCell>
        <TableCell>{appt.doctor?.fullName || 'N/A'}</TableCell>
        <TableCell>
          <Badge variant="outline">
            {appt.doctor?.specialization || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell>
          {new Date(appt.date).toLocaleDateString()} at {appt.time}
        </TableCell>
        <TableCell>
          {getStatusBadge(appt.status)}
        </TableCell>
      </TableRow>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-emerald-50">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-emerald-50">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700">Error: {error}</span>
        <Button onClick={() => navigate('/admin/dashboard')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      {/* Navigation Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <nav className="container mx-auto px-2 sm:px-4 lg:px-8 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2">
            <img src="/Logo.svg" className="h-15 w-10 sm:h-20 sm:w-15" alt="IntelliConsult Logo" />
            <Link to="/" className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-800 hover:text-cyan-600 transition-colors">
              IntelliConsult
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <Button 
              variant="outline" 
              className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 text-xs sm:text-sm h-8 sm:h-9" 
              onClick={() => navigate('/admin/dashboard')}
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-200 flex items-center justify-center text-cyan-800 font-semibold text-xs cursor-pointer hover:bg-cyan-300 transition-colors"
              >
                {adminProfile ? ((adminProfile?.fullName || adminProfile?.full_name) || adminProfile?.full_name || 'Admin').substring(0, 2).toUpperCase() : 'AD'}
              </div>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{(adminProfile?.fullName || adminProfile?.full_name) || "Admin"}</p>
                      <p className="text-xs text-gray-500 truncate">{adminProfile?.email || ""}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfileModal(true); setIsProfileOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="container mx-auto">

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 flex items-center">
          <Calendar className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-cyan-700" />
          All Appointments
        </h1>

        {/* Grid for Upcoming and Cancelled */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Upcoming Appointments Card */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl text-blue-800">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Sorted by soonest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SCROLLABLE CONTAINER (h-400px) */}
              <div className="h-[300px] sm:h-[400px] overflow-x-auto overflow-y-auto relative border rounded-md"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AppointmentTableBody appointments={upcomingAppointments} />
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Cancelled Appointments Card */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl text-red-800">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Cancelled Appointments
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                List of cancelled appointments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SCROLLABLE CONTAINER (h-400px) */}
              <div className="h-[300px] sm:h-[400px] overflow-x-auto overflow-y-auto relative border rounded-md"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Patient</TableHead>
                      <TableHead className="text-xs sm:text-sm">Doctor</TableHead>
                      <TableHead className="text-xs sm:text-sm">Spec</TableHead>
                      <TableHead className="text-xs sm:text-sm">Date & Time</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AppointmentTableBody appointments={cancelledAppointments} />
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Appointments Card (Full Width) */}
        <Card className="shadow-sm mt-4 sm:mt-6 lg:mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl text-green-800">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Completed Appointments
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              History of all completed appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* SCROLLABLE CONTAINER (h-500px) */}
            <div className="h-[400px] sm:h-[500px] overflow-x-auto overflow-y-auto relative border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Patient</TableHead>
                    <TableHead className="text-xs sm:text-sm">Doctor</TableHead>
                    <TableHead className="text-xs sm:text-sm">Specialization</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date & Time</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AppointmentTableBody appointments={completedAppointments} />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Profile</h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Your Name</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900">{(adminProfile?.fullName || adminProfile?.full_name) || 'Loading...'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Your Email</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900 break-all">{adminProfile?.email || 'Loading...'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setShowProfileModal(false)} className="text-xs sm:text-sm">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}