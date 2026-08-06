import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import { Star } from "lucide-react";
import {
  Stethoscope,
  GraduationCap,
  Wallet,
  IdCard,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2
} from "lucide-react";

export function UserProfileModal({ isOpen, onClose, patient, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '' });
  const isDoctor = patient?.userType === 'doctor' || patient?.user_type === 'doctor';

  // When the patient data is available, populate the form
  useEffect(() => {
    if (patient && !isDoctor) {
      setFormData({ fullName: patient.fullName });
    }
  }, [patient, isDoctor]);

  const handleSave = async () => {
    if (isDoctor) return;
    const token = localStorage.getItem('token');
    try {    
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onProfileUpdate(response.data); // Update the state in the parent component
      setIsEditing(false); // Switch back to view mode
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Could not update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    if (isDoctor) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    // Reset form data to the original patient data
    setFormData({ fullName: patient.fullName });
  };

  const doctorHighlights = useMemo(() => {
    if (!patient) return [];
    return [
    {
      label: "Specialization",
      value: patient?.specialization || 'Not provided',
      icon: Stethoscope
    },
    {
      label: "Experience",
      value: patient?.experience ? `${patient?.experience} yrs` : 'Not provided',
      icon: GraduationCap
    },
    {
      label: "Consultation Fee",
      value: patient?.consultationFee !== undefined && patient?.consultationFee !== null && patient?.consultationFee !== ''
        ? `₹${patient?.consultationFee}`
        : 'Not provided',
      icon: Wallet
    },
    {
      label: "License Number",
      value: patient?.licenseNumber || 'Not provided',
      icon: IdCard
    },
    {
      label: "Ratings",
      value: patient.averageRating ? `${patient.averageRating} / 5` : 'No ratings yet',
      icon: Star
    }
  ];
  }, [patient?.specialization, patient?.experience, patient?.consultationFee, patient?.licenseNumber]);

  const workingHours = useMemo(() => {
    if (!patient) return [];
    if (!patient?.workingHours) return [];
    return Object.entries(patient?.workingHours)
      .filter(([, data]) => data?.enabled)
      .map(([day, data]) => ({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        start: data.start,
        end: data.end
      }));
  }, [patient?.workingHours]);

  const dialogSizeClass = isDoctor ? "sm:max-w-[650px]" : "sm:max-w-[425px]";

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${dialogSizeClass} max-h-[85vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle>
            {isDoctor ? 'Doctor Profile' : (isEditing ? 'Edit Profile' : 'Your Profile')}
          </DialogTitle>
          <DialogDescription>
            {isDoctor
              ? "Review the professional details you've shared with patients."
              : (isEditing
                  ? "Make changes to your profile here. Click save when you're done."
                  : "View your personal details.")
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-1">
        {isDoctor ? (
          <div className="space-y-5 py-2">
            <div className="flex flex-col sm:flex-row gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 bg-emerald-100 text-emerald-800 text-2xl">
                <AvatarImage src="/female-doctor.jpg" alt={(patient?.fullName || patient?.full_name || 'N/A')} />
                <AvatarFallback>
                  {patient.fullName?.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-1">Doctor workspace</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  Dr. {(patient?.fullName || patient?.full_name || 'N/A')}
                </h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {patient?.specialization || 'Specialization not set'}
                  </Badge>
                  <Badge variant={(patient?.isVerified || patient?.is_verified) ? "default" : "outline"} className={(patient?.isVerified || patient?.is_verified) ? "bg-teal-600 hover:bg-teal-700" : ""}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {(patient?.isVerified || patient?.is_verified) ? 'Verified' : 'Pending verification'}
                  </Badge>
                  {patient.isProfileComplete && (
                    <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
                      Profile complete
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    <span>{patient.email}</span>
                  </div>
                  {patient.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <span>{patient.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctorHighlights.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-emerald-50 bg-emerald-50/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                      <p className="text-sm font-semibold text-gray-900">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Contact & Location</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Email</p>
                    <p>{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Phone</p>
                    <p>{patient.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Clinic Address</p>
                    <p>{patient.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Professional Bio</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {patient.bio || 'You have not added a bio yet. Share your approach and expertise to help patients know you better.'}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Availability</h3>
              {workingHours.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {workingHours.map(({ day, start, end }) => (
                    <div key={day} className="flex items-center justify-between rounded-xl bg-emerald-50/70 px-3 py-2 text-sm text-gray-800">
                      <span className="font-medium">{day}</span>
                      <span className="flex items-center gap-1 text-gray-700">
                        <Clock className="h-3 w-3" />
                        {start} - {end}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">You have not configured your working hours yet.</p>
              )}
            </div>
          </div>
        ) : isEditing ? (
          // --- EDITING VIEW ---
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
        ) : (
          // --- VIEWING VIEW ---
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Full Name</Label>
              <p className="text-base">{patient?.fullName || patient?.full_name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <p className="text-base">{patient.email}</p>
            </div>
          </div>
        )}
        </div>

        <DialogFooter>
          {isDoctor ? (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Link to="/doctor/update-profile" className="w-full sm:w-auto">
                <Button className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto" onClick={onClose}>
                  Update Profile
                </Button>
              </Link>
            </>
          ) : isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}