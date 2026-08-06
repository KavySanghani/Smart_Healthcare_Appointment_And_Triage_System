import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, Plus, Edit, Trash2, User, ArrowLeft, LogOut, CalendarDays, Settings, Loader2, Pill, FileText, CreditCard, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { UserProfileModal } from "@/components/UserProfileModal";

const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
];

const API_BASE_URL = import.meta?.env?.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const getAppointmentDateTime = (dateString, timeString) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;

    if (!timeString) return date;

    let normalizedTime = timeString.trim();
    let meridiem = null;

    const meridiemMatch = normalizedTime.match(/(am|pm)$/i);
    if (meridiemMatch) {
        meridiem = meridiemMatch[0].toUpperCase();
        normalizedTime = normalizedTime.replace(/(am|pm)$/i, '').trim();
    }

    const timeParts = normalizedTime.split(':').map(part => part.trim());
    let hours = parseInt(timeParts[0], 10);
    let minutes = parseInt(timeParts[1] || '0', 10);

    if (Number.isNaN(hours)) return date;
    if (Number.isNaN(minutes)) minutes = 0;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);

    return combinedDate;
};

const isAppointmentInPast = (appointment) => {
    if (!appointment) return false;
    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.time);
    if (!appointmentDateTime) return false;
    return appointmentDateTime.getTime() < Date.now();
};

const getDisplayStatus = (appointment) => {
    if (!appointment) return 'unknown';
    const baseStatus = appointment.status?.toLowerCase();
    const normalizedStatus = baseStatus === 'pending' ? 'upcoming' : baseStatus;
    if ((normalizedStatus === 'upcoming' || !normalizedStatus) && isAppointmentInPast(appointment)) {
        return 'missed';
    }
    return normalizedStatus || 'unknown';
};

export default function DoctorSchedulePage() {
    const [doctor, setDoctor] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // State for managing working hours locally before saving
    const [workingHours, setWorkingHours] = useState(null);
    const [blockedTimes, setBlockedTimes] = useState([]);
    const [newBlock, setNewBlock] = useState({
        reason: "",
        date: new Date().toISOString().split('T')[0],
        startTime: "12:00",
        endTime: "13:00",
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isPatientDetailsOpen, setIsPatientDetailsOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [isPrescriptionLoading, setIsPrescriptionLoading] = useState(false);
    const [prescriptionError, setPrescriptionError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            try {
                const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
                const [profileRes, appointmentsRes, scheduleRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/users/profile`, authHeaders),
                    axios.get(`${API_BASE_URL}/api/appointments/doctor`, authHeaders),
                    axios.get(`${API_BASE_URL}/api/schedule/working-hours`, authHeaders)
                ]);

                setDoctor(profileRes.data);
                setAppointments(appointmentsRes.data);

                // Merge with default working hours to prevent undefined errors
                const defaultWorkingHours = {
                    monday: { enabled: false, start: "09:00", end: "17:00" },
                    tuesday: { enabled: false, start: "09:00", end: "17:00" },
                    wednesday: { enabled: false, start: "09:00", end: "17:00" },
                    thursday: { enabled: false, start: "09:00", end: "17:00" },
                    friday: { enabled: false, start: "09:00", end: "17:00" },
                    saturday: { enabled: false, start: "09:00", end: "17:00" },
                    sunday: { enabled: false, start: "09:00", end: "17:00" },
                };
                const fetchedHours = scheduleRes.data || {};
                const safeHours = { ...defaultWorkingHours };
                for (const day of Object.keys(defaultWorkingHours)) {
                    if (fetchedHours[day]) {
                        safeHours[day] = { ...defaultWorkingHours[day], ...fetchedHours[day] };
                    }
                }
                setWorkingHours(safeHours);
                setBlockedTimes(profileRes.data.blockedTimes || []);
            } catch (err) {
                console.error("Error fetching data:", err.response || err);
                setError(`Failed to fetch schedule data (${err.response?.status || 'Network Error'}).`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const handleProfileUpdate = (updatedDoctor) => {
        setDoctor(updatedDoctor);
        setIsProfileModalOpen(false);
    };

    const handleWorkingHoursChange = (day, field, value) => {
        setWorkingHours(prev => {
            const currentDay = prev?.[day] || { enabled: false, start: "09:00", end: "17:00" };
            return {
                ...prev,
                [day]: { ...currentDay, [field]: value },
            };
        });
    };

    const handleSaveChanges = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/schedule/working-hours`,
                { workingHours },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Working hours updated successfully!');
        } catch (err) {
            console.error("Error saving working hours:", err);
            alert('Failed to update working hours.');
        }
    };

const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
            case 'upcoming':
                return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Upcoming</Badge>;
            case 'completed':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Cancelled</Badge>;
        case 'missed':
            return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">Missed</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Unknown</Badge>;
        }
    };

    const handleBlockInputChange = (field, value) => {
        setNewBlock(prev => ({ ...prev, [field]: value }));
    };

    const handleAddBlock = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/schedule/blocked-times`,
                newBlock,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBlockedTimes(prev => [...prev, response.data]);
            setIsModalOpen(false);
            setNewBlock({
                reason: "",
                date: new Date().toISOString().split('T')[0],
                startTime: "12:00",
                endTime: "13:00",
            });
        } catch (err) {
            console.error("Error adding block:", err);
            alert(err.response?.data?.message || 'Failed to add block.');
        }
    };

    const handleDeleteBlock = async (blockId) => {
        if (!window.confirm("Are you sure you want to delete this block?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(
                `${API_BASE_URL}/api/schedule/blocked-times/${blockId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBlockedTimes(prev => prev.filter(block => (block?.id || block?._id) !== blockId));
        } catch (err) {
            console.error("Error deleting block:", err);
            alert(err.response?.data?.message || 'Failed to delete block.');
        }
    };

    const groupAppointmentsByDate = (appointments) => {
        const grouped = {};
        // Filter out appointments with null patients first
        const validAppointments = appointments.filter(appointment => appointment.patient);

        validAppointments.forEach(appointment => {
            const date = new Date(appointment.date).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(appointment);
        });
        return grouped;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow";
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const handleViewDetails = (appointment) => {
        setSelectedAppointment(appointment);
        setSelectedPrescription(null);
        setPrescriptionError('');
        setIsPatientDetailsOpen(true);
        if (appointment?._id) {
            fetchPrescriptionForAppointment((appointment?.id || appointment?._id));
        }
    };

    const fetchPrescriptionForAppointment = async (appointmentId) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setIsPrescriptionLoading(true);
        setPrescriptionError('');
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/prescriptions/appointment/${appointmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                setSelectedPrescription(response.data.medicalRecord);
            } else {
                setSelectedPrescription(null);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setSelectedPrescription(null);
            } else {
                console.error('Error fetching prescription:', err);
                setPrescriptionError(err.response?.data?.message || 'Failed to load prescription.');
            }
        } finally {
            setIsPrescriptionLoading(false);
        }
    };

    const handleCompleteConsultation = async (appointmentId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Authentication error. Please log in again.");
            navigate('/login');
            return;
        }

        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/appointments/${appointmentId}/complete`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAppointments(prevAppointments =>
                prevAppointments.map(apt =>
                    (apt?.id || apt?._id) === appointmentId ? { ...apt, status: 'completed' } : apt
                )
            );

            alert("Appointment marked as completed! Redirecting to prescription form...");
            navigate(`/doctor/prescription/${appointmentId}`);
        } catch (err) {
            console.error("Error completing appointment:", err.response || err);
            alert(err.response?.data?.message || "Failed to start consultation.");
        }
    };

    if (isLoading || !workingHours) return <div className="flex items-center justify-center h-screen">Loading Schedule...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <Link to="/" className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-15 w-13 sm:h-20 sm:w-15" alt="Logo" />
                            <span className="text-lg sm:text-2xl lg:text-3xl font-bold">IntelliConsult</span>
                        </Link>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <Link to="/doctor/dashboard" className="hidden sm:block">
                                <Button variant="outline" size="sm" className="border-gray-300">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Link to="/doctor/dashboard" className="block sm:hidden">
                                <Button variant="outline" size="sm" className="border-gray-300 px-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-300 hidden sm:flex">
                                <LogOut className="h-4 w-4 mr-2" />
                                <span className="hidden md:inline">Logout</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 cursor-pointer hover:opacity-80 transition-opacity">
                                        <AvatarImage src="/female-doctor.jpg" alt={(doctor?.fullName || doctor?.full_name || 'N/A')} />
                                        <AvatarFallback className="bg-teal-100 text-teal-800 text-xs sm:text-sm">
                                            {(doctor?.fullName || doctor?.full_name || 'Doctor').split(" ").map((n) => n[0]).join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer">
                                        <UserCircle className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/schedule" className="flex items-center w-full">
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            <span>Schedule</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/update-profile" className="flex items-center w-full">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>Update Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/earnings" className="flex items-center w-full">
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            <span>Earnings</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
                    <p className="text-sm sm:text-base text-gray-600">View your appointments and manage your availability</p>
                </div>

                <Tabs defaultValue="appointments" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-emerald-100 mb-6 sm:mb-8">
                        <TabsTrigger value="appointments" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">All Appointments</span>
                            <span className="sm:hidden">Appointments</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Schedule Settings</span>
                            <span className="sm:hidden">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="appointments" className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                            <Card className="bg-white">
                                <CardHeader className="pb-2 sm:pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Appointments</CardTitle>
                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-teal-600">{appointments.length}</div>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white">
                                <CardHeader className="pb-2 sm:pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Today's Appointments</CardTitle>
                                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                        {appointments.filter(apt =>
                                            new Date(apt.date).toDateString() === new Date().toDateString()
                                        ).length}
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white sm:col-span-1 col-span-full">
                                <CardHeader className="pb-2 sm:pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Upcoming</CardTitle>
                                        <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                                        {appointments.filter(apt => getDisplayStatus(apt) === 'upcoming').length}
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">All Appointments</CardTitle>
                                <CardDescription className="text-sm">Complete list of your scheduled appointments</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {appointments.length > 0 ? (
                                    <div className="space-y-4 sm:space-y-6">
                                        {Object.entries(groupAppointmentsByDate(appointments))
                                            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
                                            .map(([date, dateAppointments]) => (
                                                <div key={date} className="space-y-3">
                                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                                                        {formatDate(date)}
                                                        <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                                                            ({dateAppointments.length} appointment{dateAppointments.length !== 1 ? 's' : ''})
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {dateAppointments
                                                            .sort((a, b) => a.time.localeCompare(b.time))
                                                            .map((appointment) => (
                                                                <div key={(appointment?.id || appointment?._id)} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-emerald-50 transition-colors">
                                                                    <div className="flex items-center space-x-3 sm:space-x-4">
                                                                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                                                            <AvatarImage src="/placeholder.svg" />
                                                                            <AvatarFallback className="bg-teal-100 text-teal-800 text-xs sm:text-sm">
                                                                                {appointment.patientNameForVisit || appointment.patient_name_for_visit ?
                                                                                    (appointment?.patientNameForVisit || appointment?.patient_name_for_visit || 'Patient').split(" ").map((n) => n[0]).join("") :
                                                                                    appointment.patient?.fullName || appointment.patient?.full_name ?
                                                                                    (appointment?.patient?.fullName || appointment?.patient?.full_name || 'Patient').split(" ").map((n) => n[0]).join("") :
                                                                                    "??"
                                                                                }
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                                                                {appointment.patientNameForVisit || appointment.patient_name_for_visit || appointment.patient?.fullName || appointment.patient?.full_name || "Unknown Patient"}
                                                                            </h4>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                {getStatusBadge(getDisplayStatus(appointment))}
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {appointment.time || "Time TBD"}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 sm:min-w-0 space-y-1">
                                                                        <p className="text-xs sm:text-sm text-gray-600">
                                                                            <span className="font-medium">Reason:</span> {appointment.reasonForVisit || appointment.reason_for_visit || appointment.primaryReason || appointment.primary_reason || "No reason specified"}
                                                                        </p>
                                                                        {appointment.symptoms && (
                                                                            <p className="text-xs sm:text-sm text-gray-600">
                                                                                <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                                                                            </p>
                                                                        )}
                                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                            <span>Contact: {appointment.patient?.email || "No email"}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 min-w-[140px] sm:min-w-[120px]">
                                                                        {getDisplayStatus(appointment) === 'upcoming' && (
                                                                            <Button
                                                                                size="sm"
                                                                                className="bg-teal-600 text-white hover:bg-teal-700 w-full text-xs sm:text-sm"
                                                                                onClick={() => handleCompleteConsultation((appointment?.id || appointment?._id))}
                                                                            >
                                                                                Start Consultation
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" onClick={() => handleViewDetails(appointment)}>
                                                                            View Details
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 sm:py-12">
                                        <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
                                        <p className="text-sm sm:text-base text-gray-600">Your appointment schedule is currently empty.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg sm:text-xl">Working Hours</CardTitle>
                                    <CardDescription className="text-sm">Set your availability for each day of the week</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 sm:space-y-4">
                                    {workingHours && daysOfWeek.map((day) => (
                                        <div key={day.key} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border border-gray-200 rounded-lg">
                                            <div className="w-full sm:w-20">
                                                <Label className="font-medium text-sm sm:text-base">{day.label}</Label>
                                            </div>
                                            <div className="flex items-center space-x-3 sm:space-x-4">
                                                <Switch
                                                    checked={workingHours[day.key]?.enabled || false}
                                                    onCheckedChange={(checked) => handleWorkingHoursChange(day.key, "enabled", checked)}
                                                />
                                                {workingHours[day.key]?.enabled && (
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <Input
                                                            type="time"
                                                            value={workingHours[day.key]?.start || ""}
                                                            onChange={(e) => handleWorkingHoursChange(day.key, "start", e.target.value)}
                                                            className="w-24 sm:w-32 text-xs sm:text-sm"
                                                        />
                                                        <span className="text-gray-500 text-xs sm:text-sm">to</span>
                                                        <Input
                                                            type="time"
                                                            value={workingHours[day.key]?.end || ""}
                                                            onChange={(e) => handleWorkingHoursChange(day.key, "end", e.target.value)}
                                                            className="w-24 sm:w-32 text-xs sm:text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Button onClick={handleSaveChanges} className="w-full bg-teal-600 text-white hover:bg-teal-700 text-sm sm:text-base">Save Working Hours</Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                        <div>
                                            <CardTitle className="text-lg sm:text-xl">Blocked Times</CardTitle>
                                            <CardDescription className="text-sm">Block specific time slots</CardDescription>
                                        </div>
                                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto text-xs sm:text-sm">
                                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                    Add Block
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xs sm:max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle className="text-base sm:text-lg">Add New Block</DialogTitle>
                                                    <DialogDescription className="text-sm">
                                                        Block off a time slot on a specific date.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-3 sm:gap-4 py-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                                        <Label htmlFor="reason" className="sm:text-right text-xs sm:text-sm">Reason</Label>
                                                        <Input 
                                                            id="reason" 
                                                            value={newBlock.reason} 
                                                            onChange={(e) => handleBlockInputChange('reason', e.target.value)} 
                                                            className="col-span-1 sm:col-span-3 text-xs sm:text-sm" 
                                                            placeholder="e.g., Lunch, Meeting" 
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                                        <Label htmlFor="date" className="sm:text-right text-xs sm:text-sm">Date</Label>
                                                        <Input 
                                                            id="date" 
                                                            type="date" 
                                                            value={newBlock.date} 
                                                            onChange={(e) => handleBlockInputChange('date', e.target.value)} 
                                                            className="col-span-1 sm:col-span-3 text-xs sm:text-sm" 
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                                        <Label htmlFor="startTime" className="sm:text-right text-xs sm:text-sm">Start Time</Label>
                                                        <Input 
                                                            id="startTime" 
                                                            type="time" 
                                                            value={newBlock.startTime} 
                                                            onChange={(e) => handleBlockInputChange('startTime', e.target.value)} 
                                                            className="col-span-1 sm:col-span-3 text-xs sm:text-sm" 
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                                        <Label htmlFor="endTime" className="sm:text-right text-xs sm:text-sm">End Time</Label>
                                                        <Input 
                                                            id="endTime" 
                                                            type="time" 
                                                            value={newBlock.endTime} 
                                                            onChange={(e) => handleBlockInputChange('endTime', e.target.value)} 
                                                            className="col-span-1 sm:col-span-3 text-xs sm:text-sm" 
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                                    <DialogClose asChild>
                                                        <Button variant="outline" className="w-full sm:w-auto text-sm">Cancel</Button>
                                                    </DialogClose>
                                                    <Button onClick={handleAddBlock} className="w-full sm:w-auto text-sm">Save Block</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {blockedTimes.map((block) => (
                                            <div key={(block?.id || block?._id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-3 border border-gray-200 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-sm sm:text-base">{block.reason}</div>
                                                    <div className="text-xs sm:text-sm text-gray-500">
                                                        {new Date(block.date).toLocaleDateString()} • {block.startTime} - {block.endTime}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2 justify-end">
                                                    <Button variant="outline" size="icon" className="h-6 w-6 sm:h-8 sm:w-8" disabled><Edit className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                                                    <Button variant="outline" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 hover:text-red-700" onClick={() => handleDeleteBlock((block?.id || block?._id))}>
                                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {blockedTimes.length === 0 && (
                                            <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No blocked times added.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Patient Details Modal */}
            <Dialog open={isPatientDetailsOpen} onOpenChange={setIsPatientDetailsOpen}>
                <DialogContent className="max-w-xs sm:max-w-lg md:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span>Patient Details</span>
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Complete information about the patient and appointment
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Patient Information */}
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Patient Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Full Name</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.patientNameForVisit || selectedAppointment.patient_name_for_visit || selectedAppointment.patient?.fullName || selectedAppointment.patient?.full_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Email</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.email || selectedAppointment.patient?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Phone Number</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.phoneNumber || selectedAppointment.phone_number || selectedAppointment.patient?.phoneNumber || selectedAppointment.patient?.phone_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Date of Birth</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">
                                            {selectedAppointment.birthDate || selectedAppointment.birth_date
                                                ? new Date(selectedAppointment.birthDate || selectedAppointment.birth_date).toLocaleDateString()
                                                : selectedAppointment.patient?.dateOfBirth || selectedAppointment.patient?.date_of_birth || selectedAppointment.patient?.dob
                                                    ? new Date(selectedAppointment.patient.dateOfBirth || selectedAppointment.patient.date_of_birth || selectedAppointment.patient.dob).toLocaleDateString()
                                                    : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Sex</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.sex || selectedAppointment.patient?.gender || selectedAppointment.patient?.sex || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Primary Language</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.primaryLanguage || selectedAppointment.primary_language || 'N/A'}</p>
                                    </div>
                                </div>
                                {selectedAppointment.patient?.address && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Address</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.patient.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* Appointment Information */}
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Appointment Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Date & Time</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">
                                            {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Status</Label>
                                        <div className="mt-1">
                                            {getStatusBadge(getDisplayStatus(selectedAppointment))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Consultation Fee</Label>
                                        <p className="text-xs sm:text-sm text-gray-900">₹{selectedAppointment.consultationFeeAtBooking || selectedAppointment.consultation_fee_at_booking || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Information */}
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Medical Information</h3>

                                <div>
                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Primary Reason for Visit</Label>
                                    <p className="text-xs sm:text-sm text-gray-900 mt-1">
                                        {selectedAppointment.primaryReason || selectedAppointment.primary_reason || selectedAppointment.reasonForVisit || selectedAppointment.reason_for_visit || 'Not specified'}
                                    </p>
                                </div>

                                {selectedAppointment.symptomsList && selectedAppointment.symptomsList.length > 0 && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Symptoms</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.symptomsList.map((symptom, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {symptom}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.symptomsOther && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Other Symptoms</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.symptomsOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.symptomsBegin && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">When Symptoms Began</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.symptomsBegin}</p>
                                    </div>
                                )}

                                {selectedAppointment.severeSymptomsCheck && selectedAppointment.severeSymptomsCheck.length > 0 && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Severe Symptoms (Last 7 Days)</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.severeSymptomsCheck.map((symptom, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-800 border-red-200">
                                                    {symptom}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.preExistingConditions && selectedAppointment.preExistingConditions.length > 0 && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Pre-existing Conditions</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.preExistingConditions.map((condition, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                                                    {condition}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.preExistingConditionsOther && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Other Pre-existing Conditions</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.preExistingConditionsOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.familyHistory && selectedAppointment.familyHistory.length > 0 && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Family History</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAppointment.familyHistory.map((history, index) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                                                    {history}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.familyHistoryOther && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Other Family History</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.familyHistoryOther}</p>
                                    </div>
                                )}

                                {selectedAppointment.pastSurgeries && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Past Surgeries & Hospitalizations</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.pastSurgeries}</p>
                                    </div>
                                )}

                                {selectedAppointment.allergies && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Allergies</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.allergies}</p>
                                    </div>
                                )}

                                {selectedAppointment.medications && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Current Medications & Supplements</Label>
                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedAppointment.medications}</p>
                                    </div>
                                )}

                                {selectedAppointment.urgency && (
                                    <div>
                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Urgency Level</Label>
                                        <div className="mt-1">
                                            <Badge className={
                                                selectedAppointment.urgency === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    selectedAppointment.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                        'bg-gray-100 text-gray-800 border-gray-200'
                                            }>
                                                {selectedAppointment.urgency} Priority
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Notes */}
                            {selectedAppointment.additionalNotes && (
                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Additional Notes</h3>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-900">{selectedAppointment.additionalNotes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Prescription Summary */}
                            {selectedAppointment.status === 'completed' && (
                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Prescription Summary</h3>
                                    {isPrescriptionLoading ? (
                                        <div className="flex items-center text-xs sm:text-sm text-gray-600 space-x-2">
                                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-teal-600" />
                                            <span>Loading prescription...</span>
                                        </div>
                                    ) : selectedPrescription ? (
                                        <div className="space-y-3 sm:space-y-4">
                                            <div>
                                                <Label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
                                                    <span>Diagnosis</span>
                                                </Label>
                                                <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedPrescription.diagnosis || 'Not specified'}</p>
                                            </div>
                                            {selectedPrescription.notes && (
                                                <div>
                                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Consultation Notes</Label>
                                                    <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedPrescription.notes}</p>
                                                </div>
                                            )}
                                            {selectedPrescription.prescription && selectedPrescription.prescription.length > 0 && (
                                                <div className="space-y-3">
                                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Medications</Label>
                                                    <div className="space-y-3">
                                                        {selectedPrescription.prescription.map((item, index) => (
                                                            <div key={`${item.medication}-${index}`} className="p-2 sm:p-3 border border-gray-200 rounded-lg bg-emerald-50/50">
                                                                <div className="flex items-center space-x-2 font-semibold text-gray-900">
                                                                    <Pill className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
                                                                    <span className="text-xs sm:text-sm">{item.medication || `Medication ${index + 1}`}</span>
                                                                </div>
                                                                <p className="text-xs sm:text-sm text-gray-700 mt-1">
                                                                    <span className="font-medium">Dosage:</span> {item.dosage || 'N/A'}
                                                                </p>
                                                                <p className="text-xs sm:text-sm text-gray-700">
                                                                    <span className="font-medium">Instructions:</span> {item.instructions || 'N/A'}
                                                                </p>
                                                                {item.duration && (
                                                                    <p className="text-xs sm:text-sm text-gray-700">
                                                                        <span className="font-medium">Duration:</span> {item.duration}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Follow-up Required</Label>
                                                    <p className="text-xs sm:text-sm text-gray-900 mt-1">
                                                        {selectedPrescription.followUpRequired ? 'Yes' : 'No'}
                                                    </p>
                                                </div>
                                                {selectedPrescription.followUpRequired && selectedPrescription.followUpDate && (
                                                    <div>
                                                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Follow-up Date</Label>
                                                        <p className="text-xs sm:text-sm text-gray-900 mt-1">
                                                            {new Date(selectedPrescription.followUpDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedPrescription.followUpNotes && (
                                                <div>
                                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Follow-up Notes</Label>
                                                    <p className="text-xs sm:text-sm text-gray-900 mt-1">{selectedPrescription.followUpNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs sm:text-sm text-gray-600">No prescription has been recorded for this appointment yet.</p>
                                    )}
                                    {prescriptionError && (
                                        <p className="text-xs sm:text-sm text-red-600">{prescriptionError}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button variant="outline" onClick={() => setIsPatientDetailsOpen(false)} className="w-full sm:w-auto text-sm">
                            Close
                        </Button>
                        {getDisplayStatus(selectedAppointment) === 'upcoming' && (
                            <Button
                                className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto text-sm"
                                onClick={() => handleCompleteConsultation((selectedAppointment?.id || selectedAppointment?._id))}
                            >
                                Start Consultation
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                patient={doctor}
                onProfileUpdate={handleProfileUpdate}
            />
        </div>
    );
};