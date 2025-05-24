import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Flag, AlertTriangle } from 'lucide-react';
import { toast } from '../ui/use-toast';

interface ReportUserProps {
  userId: string;
  userName: string;
  listingId?: string;
  listingTitle?: string;
  trigger?: React.ReactNode;
}

const reportReasons = [
  'Inappropriate behavior',
  'Spam or fake listings',
  'Fraudulent activity',
  'Harassment',
  'Offensive content',
  'Scam or misleading information',
  'Violation of terms of service',
  'Other'
];

export function ReportUser({ 
  userId, 
  userName, 
  listingId, 
  listingTitle, 
  trigger 
}: ReportUserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReport = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to report a user.',
        variant: 'destructive'
      });
      return;
    }

    if (user.uid === userId) {
      toast({
        title: 'Cannot Report Yourself',
        description: 'You cannot report your own account.',
        variant: 'destructive'
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Reason Required',
        description: 'Please select a reason for reporting.',
        variant: 'destructive'
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        title: 'Description Too Short',
        description: 'Please provide at least 10 characters describing the issue.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get reporter info
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Create report
      const reportData = {
        reporterId: user.uid,
        reporterName: userData?.name || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        reportedUserId: userId,
        reportedUserName: userName,
        reason: reason,
        description: description.trim(),
        listingId: listingId || null,
        listingTitle: listingTitle || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        severity: getSeverityLevel(reason)
      };

      await addDoc(collection(db, 'reports'), reportData);

      // Create notification for admins (you might want to implement admin notification system)
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'user_report',
        message: `New user report: ${userName} reported for ${reason}`,
        reportData: reportData,
        read: false,
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting. Our team will review this shortly.',
      });

      setIsOpen(false);
      setReason('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityLevel = (reason: string): 'low' | 'medium' | 'high' => {
    const highSeverity = ['Fraudulent activity', 'Harassment', 'Scam or misleading information'];
    const mediumSeverity = ['Inappropriate behavior', 'Offensive content', 'Violation of terms of service'];
    
    if (highSeverity.includes(reason)) return 'high';
    if (mediumSeverity.includes(reason)) return 'medium';
    return 'low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Flag className="h-4 w-4 mr-1" />
            Report User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Report {userName}</span>
          </DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting inappropriate behavior.
            {listingTitle && (
              <span className="block mt-1 text-sm">
                Related to listing: "{listingTitle}"
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for reporting</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reportReason) => (
                  <SelectItem key={reportReason} value={reportReason}>
                    {reportReason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
              rows={4}
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>False reports may result in action against your account. Only report genuine violations of our community guidelines.</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setReason('');
                setDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={submitting || !reason || description.trim().length < 10}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
