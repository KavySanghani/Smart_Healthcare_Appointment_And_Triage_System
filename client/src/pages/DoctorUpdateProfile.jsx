import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Save, Loader2, LogOut, CalendarDays, Settings, CreditCard, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserProfileModal } from "@/components/UserProfileModal";

export default function DoctorUpdateProfile() {
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        specialization: "",
        experience: "",
        licenseNumber: "",
        address: "",
        consultationFee: "",
        bio: "",
        phoneNumber: ""
    });

    const specializations = [
        "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology", 
        "Neurology", "Oncology", "Orthopedics", "Pediatrics", "Psychiatry", 
        "Radiology", "General Practice", "Internal Medicine"
    ];

    useEffect(() => {
        const fetchDoctorProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.userType !== 'doctor' && response.data.user_type !== 'doctor') {
                    setError('Access denied. Not a doctor account.');
                    return;
                }

                setDoctor(response.data);
                setFormData({
                    fullName: response.data.fullName || "",
                    email: response.data.email || "",
                    specialization: response.data.specialization || "",
                    experience: response.data.experience || "",
                    licenseNumber: response.data.licenseNumber || "",
                    address: response.data.address || "",
                    consultationFee: response.data.consultationFee || "",
                    bio: response.data.bio || "",
                    phoneNumber: response.data.phoneNumber || ""
                });
            } catch (err) {
                console.error("Error fetching doctor profile:", err);
                setError('Failed to fetch doctor profile. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDoctorProfile();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (name === 'phoneNumber') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
            updatedValue = digitsOnly;

            setFormErrors(prev => ({
                ...prev,
                phoneNumber: digitsOnly.length === 0 || digitsOnly.length === 10 ? '' : prev.phoneNumber
            }));
        }

        setFormData(prev => ({
            ...prev,
            [name]: updatedValue
        }));
    };

    const handleSpecializationChange = (value) => {
        setFormData(prev => ({
            ...prev,
            specialization: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const errors = {};
        if (formData.phoneNumber && formData.phoneNumber.length !== 10) {
            errors.phoneNumber = 'Phone number must be exactly 10 digits.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        } else {
            setFormErrors({});
        }

        setIsSaving(true);

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/update-profile`, 
                formData, 
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setDoctor(response.data.user);
            setSuccessMessage(response.data.message || 'Profile updated successfully!');
            
            // Show alert message and then route to dashboard
            alert('Profile updated successfully!');
            navigate('/doctor/dashboard');

        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const handleProfileUpdate = (updatedDoctor) => {
        setDoctor(updatedDoctor);
        setIsProfileModalOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (error && !doctor) {
        return (
            <div className="flex items-center justify-center h-screen text-red-600">
                {error}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <Link to="/" className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-20 w-15" alt="Logo" />
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
                                        <AvatarImage src="/female-doctor.jpg" alt={doctor?.fullName} />
                                        <AvatarFallback className="bg-teal-100 text-teal-800 text-xs sm:text-sm">
                                            {doctor?.fullName ? (doctor?.fullName || doctor?.full_name || 'Doctor').split(" ").map((n) => n[0]).join("") : "Dr"}
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
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Update Profile</h1>
                        <p className="text-sm sm:text-base text-gray-600">Update your professional information and consultation details.</p>
                    </div>

                    {successMessage && (
                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm sm:text-base">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm sm:text-base">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6 sm:gap-8">
                            {/* Personal Information */}
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg sm:text-xl">Personal Information</CardTitle>
                                    <CardDescription className="text-sm">Update your basic personal details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName" className="text-sm sm:text-base">Full Name*</Label>
                                            <Input
                                                id="fullName"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                className="text-sm sm:text-base"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-sm sm:text-base">Email Address*</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="text-sm sm:text-base"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber" className="text-sm sm:text-base">Phone Number</Label>
                                            <Input
                                                id="phoneNumber"
                                                name="phoneNumber"
                                                type="tel"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                placeholder="10-digit mobile number"
                                                className="text-sm sm:text-base"
                                                maxLength={10}
                                            />
                                            {formErrors.phoneNumber && (
                                                <p className="text-xs text-red-600">{formErrors.phoneNumber}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="licenseNumber" className="text-sm sm:text-base">Medical License Number*</Label>
                                            <Input
                                                id="licenseNumber"
                                                name="licenseNumber"
                                                value={formData.licenseNumber}
                                                onChange={handleInputChange}
                                                className="text-sm sm:text-base"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="text-sm sm:text-base">Address</Label>
                                        <Textarea
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Your clinic/hospital address"
                                            rows={3}
                                            className="text-sm sm:text-base"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Professional Information */}
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg sm:text-xl">Professional Information</CardTitle>
                                    <CardDescription className="text-sm">Update your medical specialization and experience</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="specialization" className="text-sm sm:text-base">Specialization*</Label>
                                            <Select value={formData.specialization} onValueChange={handleSpecializationChange}>
                                                <SelectTrigger className="text-sm sm:text-base">
                                                    <SelectValue placeholder="Select your specialization" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {specializations.map((spec) => (
                                                        <SelectItem key={spec} value={spec} className="text-sm sm:text-base">
                                                            {spec}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="experience" className="text-sm sm:text-base">Years of Experience*</Label>
                                            <Input
                                                id="experience"
                                                name="experience"
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={formData.experience}
                                                onChange={handleInputChange}
                                                className="text-sm sm:text-base"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="consultationFee" className="text-sm sm:text-base">Consultation Fee (in ₹)*</Label>
                                        <Input
                                            id="consultationFee"
                                            name="consultationFee"
                                            type="number"
                                            min="0"
                                            value={formData.consultationFee}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 800"
                                            className="text-sm sm:text-base"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio" className="text-sm sm:text-base">Bio/About</Label>
                                        <Textarea
                                            id="bio"
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            placeholder="Tell patients about yourself, your expertise, and approach to treatment..."
                                            rows={4}
                                            className="text-sm sm:text-base"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Save Button */}
                            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                                <Link to="/doctor/dashboard" className="w-full sm:w-auto">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button 
                                    type="submit" 
                                    className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            <span className="text-sm sm:text-base">Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            <span className="text-sm sm:text-base">Save Changes</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                patient={doctor}
                onProfileUpdate={handleProfileUpdate}
            />
        </div>
    );
}