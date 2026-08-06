import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import axios from 'axios';


export default function VideoCallPage() {
  const { roomId } = useParams(); 
  const location = useLocation(); 
  const navigate = useNavigate(); 
  
  const userName = location.state?.userName || "User";
  const userType = location.state?.userType;
  const userid = location.state?.userid; 
  const appointment = location.state?.appointment;
  
  const handleLeaveRoom = () => {
    if (userType === 'doctor') {
      const token = localStorage.getItem('token');
      if (token) {
        axios.put(`${import.meta.env.VITE_API_URL}/api/appointments/${roomId}/complete`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.error("Failed to complete appointment", err));
      }
            navigate(`/doctor/prescription/${userid}`); 

    } else if (userType === 'patient') {
      navigate('/patient/dashboard', {
        replace: true,
        state: {
          showReviewFor: appointment 
        }
      });
    } else {
      navigate('/'); 
    }
  };

  const myMeeting = async (element) => {
     if (!element) return;

    const APP_ID = Number(import.meta.env.VITE_ZEGO_ID);
    const SERVER_SECRET = import.meta.env.VITE_ZEGO_SECRET;

    if (!APP_ID || !SERVER_SECRET) {
      console.error('ZEGO env vars missing. In production generate token on server instead of exposing secret.');
      return;
    }
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID,
      SERVER_SECRET,
      roomId,
      Date.now().toString(), 
      userName
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);

    zp.joinRoom({
      container: element, 
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall, 
      },
      showPreJoinView: true,       
      showScreenSharingButton: true,
      onLeaveRoom: handleLeaveRoom, 
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f0f2f5]">
      <div className="w-full h-full max-h-screen" ref={myMeeting} />
    </div>
  );
}