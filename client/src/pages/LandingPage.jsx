import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Users, Stethoscope, Brain, Video, LogOut } from "lucide-react";
const ManualButton = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 transform hover:scale-105";

  const sizeClasses = {
    default: 'h-9 px-4 py-2',
    lg: 'h-10 rounded-md px-6',
  }[size];

  const variantClasses = {
    default: 'bg-teal-600 text-white hover:bg-teal-700',
    outline: 'border border-teal-300 bg-transparent hover:bg-teal-50 text-teal-800',
    secondary: 'bg-white text-teal-800 hover:bg-gray-100',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default function LandingPage() {
  const primaryColor = '#0F5257';
  
  // State to track user authentication and type
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'doctor' or 'patient'
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode token to get userType without API call
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decoded = JSON.parse(jsonPayload);
          
          // Verify token is still valid by making API call
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setUser(response.data);
          setIsLoggedIn(true);
          setUserType(decoded.userType || 'patient');
        } catch (err) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        }
      }
    };
    checkAuthStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    setUserType(null);
  };

  const getDashboardRoute = () => {
    if (userType === 'doctor') {
      return '/doctor/dashboard';
    }
    if (userType === 'admin') {
      return '/admin/dashboard';
    }
    return '/patient/dashboard';
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">

    <style>
        {`
        /* Existing animation */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* New animation for hero title */
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* New simple fade-in animation */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* New slide-in from left animation */
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* New slide-in from right animation */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* New bounce-in animation for CTA */
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        /* New pulse animation for navigation button */
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }


        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fadeInDown { animation: fadeInDown 0.6s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.7s ease-out forwards; }
        .animate-slideInRight { animation: slideInRight 0.7s ease-out forwards; }
        .animate-bounceIn { animation: bounceIn 0.8s ease-out forwards; }
        .animate-pulse { animation: pulse 2s infinite ease-in-out; }
        `}
      </style>

    <nav className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2">
            <img src="Logo.svg" className="h-16 w-12 sm:h-20 sm:w-15" style={{ color: primaryColor }} alt="Logo" />
            <span className="text-lg sm:text-2xl lg:text-3xl font-bold">IntelliConsult</span>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <a href="#features" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors">
              About Us
            </a>
            {isLoggedIn ? (
              <>
                <span className="text-sm lg:text-base text-gray-600">Welcome, {(user?.fullName || user?.full_name || 'User')?.split(' ')[0] || 'User'}</span>
                <button 
                  onClick={handleLogout}
                  className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-1"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors">
                Login
              </Link>
            )}
            {isLoggedIn ? (
              <Link to={getDashboardRoute()}>
                <ManualButton className="animate-pulse text-xs sm:text-sm">
                  {userType === 'patient' ? 'My Dashboard' : 'Go to Dashboard'}
                </ManualButton>
              </Link>
            ) : (
              <Link to="/signup">
                <ManualButton className="animate-pulse text-xs sm:text-sm">Get Started</ManualButton>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            {isLoggedIn ? (
              <Link to={getDashboardRoute()}>
                <ManualButton size="default" className="text-xs">
                  {userType === 'patient' ? 'Dashboard' : 'Dashboard'}
                </ManualButton>
              </Link>
            ) : (
              <Link to="/signup">
                <ManualButton size="default" className="text-xs">Sign Up</ManualButton>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>

    {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-emerald-50">
        <div className="container mx-auto text-center">
          <Badge
            className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold bg-teal-100 text-teal-800 animate-fadeInDown" 
            style={{ animationDelay: '0.1s' }} >
            AI-Powered Healthcare Platform
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 animate-fadeInDown px-4" style={{ animationDelay: '0.2s' }}>
            Smart Healthcare for Everyone
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 max-w-3xl mx-auto animate-fadeIn px-4" style={{ animationDelay: '0.4s' }}>
            Experience the future of healthcare with IntelliConsult's Smart Care. AI-powered triage, seamless
            consultations, and intelligent scheduling.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-bounceIn px-4" style={{ animationDelay: '0.6s' }}> 
            <Link to={isLoggedIn ? (userType === 'patient' ? '/patient/doctors' : getDashboardRoute()) : "/signup"} className="w-full sm:w-auto">
              <ManualButton size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                {isLoggedIn 
                  ? (userType === 'patient' ? 'Find Doctors' : (userType === 'doctor' ? 'My Dashboard' : 'Go to Dashboard'))
                  : 'Start Your Journey'
                }
                <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </ManualButton>
            </Link>
            {isLoggedIn && userType === 'patient' && (
              <Link to="/patient/dashboard" className="w-full sm:w-auto">
                <ManualButton variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                  My Appointments
                </ManualButton>
              </Link>
            )}
            {!isLoggedIn && (
              <a href="#features" className="w-full sm:w-auto">
                <ManualButton variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                  Learn More
                </ManualButton>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 animate-fadeInUp">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Why Choose IntelliConsult?
            </h2>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
              Our platform revolutionizes healthcare delivery through intelligent automation and seamless user
              experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.1s' }}> 
              <CardHeader>
                <Brain className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">AI-Powered Triage</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  Intelligent symptom assessment and priority scoring to ensure urgent cases get immediate attention.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.2s' }}> 
              <CardHeader>
                <Video className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">Secure Video Consultations</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  Video call services with real-time transcription and automated clinical note generation.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">Smart Scheduling</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  Intelligent appointment management that optimizes doctor availability and patient preferences.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <CardHeader>
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">Privacy & Security</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  End-to-end encryption ensure your health data remains completely secure.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
              <CardHeader>
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">For Patients & Doctors</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  Dual-sided platform designed to enhance experiences for both healthcare seekers and providers.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="p-4 sm:p-6 group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
              <CardHeader>
                <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold text-base sm:text-lg">Digital Prescriptions</CardTitle>
                <CardDescription className="text-gray-700 text-sm sm:text-base">
                  Seamless e-prescription system with direct pharmacy integration and medication tracking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

          {/* About Section */}
      <section id="about" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-emerald-50"> 
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            <div className="animate-slideInLeft"> 
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                About Our Platform: A Commitment to Smarter, Safer Healthcare
              </h2>
              <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6">
            We are transforming healthcare by building a platform that is intelligent, secure, and designed for people. Our mission is to eliminate the barriers between patients and doctors by creating a seamless digital experience built on a foundation of trust and thoughtful innovation.
              </p>
              <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8">
            This platform wasn't created on assumptions; it was co-designed with the very users it serves. We conducted in-depth interviews with doctors to understand their needs, shaping our AI triage logic and pre-visit forms with their expert insights. We observed real-world clinical processes to ensure our e-prescriptions are safe and intuitive. 

              </p>
              {!isLoggedIn && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link to="/signup" className="w-full sm:w-auto">
                    <ManualButton size="lg" className="w-full sm:w-auto text-sm sm:text-base">Join Our Platform</ManualButton>
                  </Link>
                  <a href="#features" className="w-full sm:w-auto">
                    <ManualButton variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                      View Features
                    </ManualButton>
                  </a>
                </div>
              )}
            </div>
            <div className="relative animate-slideInRight" style={{ animationDelay: '0.2s' }}> 
              <Card className="p-4 sm:p-6 lg:p-8 border-gray-200 bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"> 
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0"> 
                      <Users className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">A Thriving Community</h3>
                      <p className="text-gray-700 text-xs sm:text-sm">Join community of doctors and patients on an interactive platform</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                     <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">  
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Dependable Platform</h3>
                      <p className="text-gray-700 text-xs sm:text-sm">Ensuring consistent availability and uninterrupted service</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0"> 
                      <Brain className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">AI-Powered</h3>
                      <p className="text-gray-700 text-xs sm:text-sm">Intelligent Triage for prioritized care</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {!isLoggedIn && (
        <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: primaryColor }}>
          <div className="container mx-auto text-center text-white">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 animate-fadeInUp px-4">Ready to Experience Smart Healthcare?</h2>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto animate-fadeInUp px-4" style={{ animationDelay: '0.2s' }}>
              Join network of patients and doctors who are already benefiting from our intelligent healthcare platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fadeInUp px-4" style={{ animationDelay: '0.4s' }}>
              <Link to="/signup" className="w-full sm:w-auto">
                <ManualButton size="lg" variant="secondary" className="w-full sm:w-auto text-sm sm:text-base">
                  Get Started Today
                  <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </ManualButton>
              </Link>
            </div>
          </div>
        </section>
      )}
      <footer className="border-t border-gray-200 py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <img src="Logo.svg" className="h-6 w-auto sm:h-8" style={{ color: primaryColor }} />
                <span className="text-base sm:text-lg font-bold">IntelliConsult</span>
              </div>
              <p className="text-gray-700 text-sm sm:text-base">
                Making healthcare proactive, efficient, and accessible through intelligent technology.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h3>
              <ul className="space-y-2 text-gray-700 text-sm sm:text-base">
                <li><Link to="/signup" className="hover:text-gray-900 transition-colors">For Patients</Link></li>
                <li><Link to="/signup" className="hover:text-gray-900 transition-colors">For Doctors</Link></li>
                <li><a href="#features" className="hover:text-gray-900 transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h3>
              <ul className="space-y-2 text-gray-700 text-sm sm:text-base">
                <li><a href="#about" className="hover:text-gray-900 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-2 text-gray-700 text-sm sm:text-base">
                <li><Link to="/help-center" className="hover:text-gray-900 transition-colors">Help Center</Link></li>
                <li className="hover:text-gray-900 transition-colors cursor-pointer">Contact Us</li>
                <li><Link to="/login" className="hover:text-gray-900 transition-colors">Login</Link></li>
              </ul>
            </div>
          </div>
          {/*
<div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
  <p>&copy; {new Date().getFullYear()} IntelliConsult. All rights reserved.</p>
</div>
*/} 
        {/* Chatbot removed from landing page */}
        </div>
      </footer>
    </div>
  );
}