import React, { useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Star } from 'lucide-react';

export function ReviewModal({ isOpen, onClose, appointment }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Guard clause in case appointment data isn't ready
  if (!appointment) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reviews`, 
        {
          doctorId: (appointment?.doctor?.id || appointment?.doctor?._id),
          appointmentId: (appointment?.id || appointment?._id),
          rating,
          comment
        }, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert("Review submitted successfully! Thank you.");
      setRating(0);
      setComment("");
      onClose(); // Close the modal
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a Review for Dr. {appointment.doctor.fullName}</DialogTitle>
          <DialogDescription>
            Your feedback helps other patients and our doctors.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`cursor-pointer transition-colors ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Feedback (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}