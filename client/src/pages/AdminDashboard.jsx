import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Stethoscope, Users, Calendar, LogOut, User, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Doctor Action States
  const [verifyingId, setVerifyingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);

  // Patient Action States
  const [verifyingPatientId, setVerifyingPatientId] = useState(null);
  const [suspendingPatientId, setSuspendingPatientId] = useState(null);
  
  // --- Filter States ---
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [patientEmailFilter, setPatientEmailFilter] = useState('');
  const [patientDateFromFilter, setPatientDateFromFilter] = useState('');
  const [patientDateToFilter, setPatientDateToFilter] = useState('');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  useOutsideClick(dropdownRef, () => setIsProfileOpen(false));

  
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
            setLoading(false);
        } else {
            setAdminProfile(response.data);
        }
      } catch (err) {
          setError("Failed to fetch admin profile.");
          console.error("Failed to fetch admin profile", err);
          setLoading(false);
      }
    };
    fetchAdminProfile();
  }, [navigate]);


  useEffect(() => {
    
    if (!adminProfile) {
      return;
    }

    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoading(true);
      try {
        // Construct query parameters
        const params = new URLSearchParams();
        if (nameFilter) params.append('name', nameFilter);
        if (emailFilter) params.append('email', emailFilter);
        if (licenseFilter) params.append('license', licenseFilter);
        if (specializationFilter !== 'all') params.append('specialization', specializationFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (patientNameFilter) params.append('patientName', patientNameFilter);
        if (patientEmailFilter) params.append('patientEmail', patientEmailFilter);
        if (patientDateFromFilter) params.append('patientDateFrom', patientDateFromFilter);
        if (patientDateToFilter) params.append('patientDateTo', patientDateToFilter);

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setDoctors(response.data.doctors);
        setPatients(response.data.patients);
        setError(null);

      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchUsers();
    }, 300); 

    return () => clearTimeout(timeoutId); 

  }, [
    adminProfile,
    nameFilter, 
    emailFilter, 
    licenseFilter, 
    specializationFilter, 
    statusFilter,
    patientNameFilter, 
    patientEmailFilter,
    patientDateFromFilter,
    patientDateToFilter
  ]);

  // --- Doctor Handlers ---
  const handleVerify = async (doctorId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVerifyingId(doctorId);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/verify-doctor/${doctorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDoctors(docs => docs.map(doc => (doc?.id || doc?._id) === doctorId ? { ...doc, isVerified: true } : doc));
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to verify doctor."}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (doctorId) => {
    if (!window.confirm("Are you sure you want to reject and permanently delete this doctor?")) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setRejectingId(doctorId);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/admin/reject-doctor/${doctorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDoctors(docs => docs.filter(doc => (doc?.id || doc?._id) !== doctorId));
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to reject doctor."}`);
    } finally {
      setRejectingId(null);
    }
  };

  const handleSuspend = async (doctorId) => {
    if (!window.confirm("Are you sure you want to suspend this doctor? They will not appear in search results.")) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSuspendingId(doctorId);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/suspend-doctor/${doctorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDoctors(docs => docs.map(doc => (doc?.id || doc?._id) === doctorId ? { ...doc, isVerified: false } : doc));
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to suspend doctor."}`);
    } finally {
      setSuspendingId(null);
    }
  };

  // --- Patient Handlers ---

  const handleVerifyPatient = async (patientId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVerifyingPatientId(patientId);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/verify-patient/${patientId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatients(pats => pats.map(p => (p?.id || p?._id) === patientId ? { ...p, isVerified: true } : p));
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to verify patient."}`);
    } finally {
      setVerifyingPatientId(null);
    }
  };

  const handleSuspendPatient = async (patientId) => {
    if (!window.confirm("Are you sure you want to suspend this patient? They will receive an email notification.")) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSuspendingPatientId(patientId);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/suspend-patient/${patientId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatients(pats => pats.map(p => (p?.id || p?._id) === patientId ? { ...p, isVerified: false } : p));
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to suspend patient."}`);
    } finally {
      setSuspendingPatientId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const uniqueSpecializations = useMemo(() => {
    const specs = new Set(doctors.map(doc => doc.specialization).filter(Boolean));
    return Array.from(specs);
  }, [doctors]);


  if (!adminProfile && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700">Error: {error}</span>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800" >
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <nav className="container mx-auto px-2 sm:px-4 lg:px-8 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2">
            <img src="/Logo.svg" className="h-15 w-10 sm:h-20 sm:w-15" alt="IntelliConsult Logo" />
            <Link to="/" className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-800 hover:text-cyan-600 transition-colors">
              IntelliConsult
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <Button variant="outline" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 text-xs sm:text-sm h-8 sm:h-9" onClick={() => navigate('/admin/appointments')}>
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">View All Appointments</span>
              <span className="sm:hidden">Appts</span>
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

      <main className="p-2 sm:p-4 lg:p-6">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">Admin Dashboard</h1>

          {/* Doctors Table */}
          <Card className="mb-4 sm:mb-6 lg:mb-8 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl">
                    <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-700" />
                    Doctors
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">A list of all registered doctors and their verification status.</CardDescription>
                </div>
              </div>

              {/* --- Server-Side Filters --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
                <div className="space-y-1">
                  <Label htmlFor="nameFilter" className="text-xs font-medium">Name</Label>
                  <Input id="nameFilter" placeholder="Search by name..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emailFilter" className="text-xs font-medium">Email</Label>
                  <Input id="emailFilter" placeholder="Search by email..." value={emailFilter} onChange={e => setEmailFilter(e.target.value)} className="h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="licenseFilter" className="text-xs font-medium">License</Label>
                  <Input id="licenseFilter" placeholder="Search by license..." value={licenseFilter} onChange={e => setLicenseFilter(e.target.value)} className="h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="statusFilter" className="text-xs font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="statusFilter" className="h-9 text-xs sm:text-sm"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="specFilter" className="text-xs font-medium">Specialization</Label>
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger id="specFilter" className="h-9 text-xs sm:text-sm"><SelectValue placeholder="Filter by specialization..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      {uniqueSpecializations.map(spec => (<SelectItem key={spec} value={spec}>{spec}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              <div className="rounded-md border max-h-[400px] sm:max-h-[500px] overflow-x-auto overflow-y-auto relative"> 
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Full Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm">Specialization</TableHead>
                      <TableHead className="text-xs sm:text-sm">License Number</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-cyan-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <TableRow key={(doctor?.id || doctor?._id)}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <button 
                              onClick={() => navigate(`/admin/doctor-profile/${(doctor?.id || doctor?._id)}`)} 
                              className="text-cyan-700 hover:text-cyan-900 hover:underline focus:outline-none text-left"
                            >
                              {(doctor?.fullName || doctor?.full_name || 'N/A')}
                            </button>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{doctor.email}</TableCell>
                          <TableCell className="text-xs sm:text-sm"><Badge variant="outline" className="text-xs">{doctor.specialization}</Badge></TableCell>
                          <TableCell className="text-xs sm:text-sm">{doctor.licenseNumber}</TableCell>
                          <TableCell className="text-center">
                            {(doctor?.isVerified || doctor?.is_verified) ? (
                              <Badge className="bg-green-100 text-green-800 text-xs"><ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Verified</Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 text-xs"><ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {(doctor?.isVerified || doctor?.is_verified) ? (
                              <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 h-8 text-xs" onClick={() => handleSuspend((doctor?.id || doctor?._id))} disabled={suspendingId === (doctor?.id || doctor?._id)}>
                                {suspendingId === (doctor?.id || doctor?._id) ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Suspend'}
                              </Button>
                            ) : (
                              <div className="flex justify-center gap-1 sm:gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => handleVerify((doctor?.id || doctor?._id))} disabled={verifyingId === (doctor?.id || doctor?._id) || rejectingId === (doctor?.id || doctor?._id)}>
                                  {verifyingId === (doctor?.id || doctor?._id) ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Verify'}
                                </Button>
                                <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 h-8 text-xs" onClick={() => handleReject((doctor?.id || doctor?._id))} disabled={rejectingId === (doctor?.id || doctor?._id) || verifyingId === (doctor?.id || doctor?._id)}>
                                  {rejectingId === (doctor?.id || doctor?._id) ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Reject'}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      !loading && <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8 text-xs sm:text-sm">No doctors match the current filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-purple-700" />
                    Patients
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">A list of all registered patients.</CardDescription>
                </div>
              </div>

              {/* --- Server-Side Patient Filters --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
                <div className="space-y-1">
                  <Label htmlFor="patientNameFilter" className="text-xs font-medium">Name</Label>
                  <Input id="patientNameFilter" placeholder="Search by name..." value={patientNameFilter} onChange={e => setPatientNameFilter(e.target.value)} className="h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="patientEmailFilter" className="text-xs font-medium">Email</Label>
                  <Input id="patientEmailFilter" placeholder="Search by email..." value={patientEmailFilter} onChange={e => setPatientEmailFilter(e.target.value)} className="h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateFromFilter" className="text-xs font-medium">Joined From</Label>
                  <Input id="dateFromFilter" type="date" value={patientDateFromFilter} onChange={e => setPatientDateFromFilter(e.target.value)} className="text-gray-700 h-9 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateToFilter" className="text-xs font-medium">Joined To</Label>
                  <Input id="dateToFilter" type="date" value={patientDateToFilter} onChange={e => setPatientDateToFilter(e.target.value)} className="text-gray-700 h-9 text-xs sm:text-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              <div className="rounded-md border max-h-[400px] sm:max-h-[500px] overflow-x-auto overflow-y-auto relative">
                <Table>
                
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                          <TableHead className="text-xs sm:text-sm">Full Name</TableHead>
                          <TableHead className="text-xs sm:text-sm">Email</TableHead>
                          <TableHead className="text-xs sm:text-sm">Joined On</TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-cyan-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && patients.length > 0 ? (
                      patients.map((patient) => (
                        <TableRow key={(patient?.id || patient?._id)}>
                          <TableCell className="font-medium text-xs sm:text-sm">{patient?.fullName || patient?.full_name || 'N/A'}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{patient.email}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                          
                          
                          <TableCell className="text-center">
                               {(patient?.isVerified ?? patient?.is_verified) !== false ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs"><ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Active</Badge>
                               ) : (
                                  <Badge variant="destructive" className="text-xs"><ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Suspended</Badge>
                               )}
                          </TableCell>

                        
                          <TableCell className="text-center">
                              {(patient?.isVerified ?? patient?.is_verified) !== false ? (
                                  <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                                      onClick={() => handleSuspendPatient((patient?.id || patient?._id))}
                                      disabled={suspendingPatientId === (patient?.id || patient?._id)}
                                  >
                                      {suspendingPatientId === (patient?.id || patient?._id) ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Suspend'}
                                  </Button>
                              ) : (
                                  <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                                      onClick={() => handleVerifyPatient((patient?.id || patient?._id))}
                                      disabled={verifyingPatientId === (patient?.id || patient?._id)}
                                  >
                                      {verifyingPatientId === (patient?.id || patient?._id) ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : 'Verify'}
                                  </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      !loading && <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8 text-xs sm:text-sm">No patients match the current filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

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