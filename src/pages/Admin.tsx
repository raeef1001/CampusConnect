import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, limit, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from '../components/ui/use-toast';
import { 
  Shield, 
  Users, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Ban, 
  Star,
  MessageSquare,
  Flag,
  TrendingDown,
  UserX,
  Clock
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { FloatingChat } from '../components/ui/floating-chat';

interface PendingListing {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  sellerUniversity: string;
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface ReportedUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userUniversity: string;
  userAvatar?: string;
  reportCount: number;
  averageRating: number;
  totalReviews: number;
  lastReportDate: any;
  reports: Report[];
  status: 'active' | 'warned' | 'suspended' | 'banned';
}

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  description: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface AdminStats {
  totalListings: number;
  pendingListings: number;
  totalUsers: number;
  reportedUsers: number;
  totalReports: number;
  averageRating: number;
}

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalListings: 0,
    pendingListings: 0,
    totalUsers: 0,
    reportedUsers: 0,
    totalReports: 0,
    averageRating: 0
  });
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([]);
  const [selectedListing, setSelectedListing] = useState<PendingListing | null>(null);
  const [selectedUser, setSelectedUser] = useState<ReportedUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('7');

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setIsAdmin(userData?.role === 'admin' || userData?.isAdmin === true);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
      setAdminLoading(false);
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  // Fetch admin data
  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchPendingListings(),
        fetchReportedUsers()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive'
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Get total listings
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const totalListings = listingsSnapshot.size;
      const pendingListings = listingsSnapshot.docs.filter(doc => 
        doc.data().status === 'pending'
      ).length;

      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get reports
      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const totalReports = reportsSnapshot.size;

      // Get reported users count
      const reportedUsersSet = new Set();
      reportsSnapshot.docs.forEach(doc => {
        reportedUsersSet.add(doc.data().reportedUserId);
      });

      // Calculate average rating
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      let totalRating = 0;
      let reviewCount = 0;
      reviewsSnapshot.docs.forEach(doc => {
        const rating = doc.data().rating;
        if (rating) {
          totalRating += rating;
          reviewCount++;
        }
      });
      const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

      setStats({
        totalListings,
        pendingListings,
        totalUsers,
        reportedUsers: reportedUsersSet.size,
        totalReports,
        averageRating: Math.round(averageRating * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingListings = async () => {
    try {
      const q = query(
        collection(db, 'listings'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      const listings: PendingListing[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get seller info
        let sellerName = 'Unknown Seller';
        let sellerUniversity = 'Unknown University';
        try {
          const sellerDoc = await getDoc(doc(db, 'users', data.sellerId));
          if (sellerDoc.exists()) {
            const sellerData = sellerDoc.data();
            sellerName = sellerData.name || sellerName;
            sellerUniversity = sellerData.university || sellerUniversity;
          }
        } catch (error) {
          console.error('Error fetching seller info:', error);
        }

        listings.push({
          id: docSnap.id,
          ...data,
          sellerName,
          sellerUniversity
        } as PendingListing);
      }
      
      setPendingListings(listings);
    } catch (error) {
      console.error('Error fetching pending listings:', error);
    }
  };

  const fetchReportedUsers = async () => {
    try {
      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const userReports: { [userId: string]: Report[] } = {};

      // Group reports by user
      reportsSnapshot.docs.forEach(doc => {
        const report = { id: doc.id, ...doc.data() } as Report;
        const userId = report.reporterId; // This should be reportedUserId
        if (!userReports[userId]) {
          userReports[userId] = [];
        }
        userReports[userId].push(report);
      });

      const reportedUsersList: ReportedUser[] = [];
      
      for (const [userId, reports] of Object.entries(userReports)) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get user reviews for rating calculation
            const reviewsQuery = query(
              collection(db, 'reviews'),
              where('sellerId', '==', userId)
            );
            const reviewsSnapshot = await getDocs(reviewsQuery);
            
            let totalRating = 0;
            let reviewCount = 0;
            reviewsSnapshot.docs.forEach(doc => {
              const rating = doc.data().rating;
              if (rating) {
                totalRating += rating;
                reviewCount++;
              }
            });
            
            const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
            const lastReportDate = Math.max(...reports.map(r => r.createdAt?.seconds || 0));

            reportedUsersList.push({
              id: userId,
              userId,
              userName: userData.name || 'Unknown User',
              userEmail: userData.email || 'Unknown Email',
              userUniversity: userData.university || 'Unknown University',
              userAvatar: userData.avatar,
              reportCount: reports.length,
              averageRating: Math.round(averageRating * 10) / 10,
              totalReviews: reviewCount,
              lastReportDate: { seconds: lastReportDate },
              reports,
              status: userData.status || 'active'
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }

      // Sort by report count and last report date
      reportedUsersList.sort((a, b) => {
        if (a.reportCount !== b.reportCount) {
          return b.reportCount - a.reportCount;
        }
        return b.lastReportDate.seconds - a.lastReportDate.seconds;
      });

      setReportedUsers(reportedUsersList);
    } catch (error) {
      console.error('Error fetching reported users:', error);
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user?.uid
      });

      // Create notification for seller
      const listing = pendingListings.find(l => l.id === listingId);
      if (listing) {
        await addDoc(collection(db, 'notifications'), {
          userId: listing.sellerId,
          type: 'listing_approved',
          message: `Your listing "${listing.title}" has been approved!`,
          read: false,
          createdAt: serverTimestamp(),
          relatedId: listingId
        });
      }

      toast({
        title: 'Success',
        description: 'Listing approved successfully'
      });

      fetchPendingListings();
      fetchStats();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve listing',
        variant: 'destructive'
      });
    }
  };

  const handleRejectListing = async (listingId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: user?.uid,
        rejectionReason: rejectionReason.trim()
      });

      // Create notification for seller
      const listing = pendingListings.find(l => l.id === listingId);
      if (listing) {
        await addDoc(collection(db, 'notifications'), {
          userId: listing.sellerId,
          type: 'listing_rejected',
          message: `Your listing "${listing.title}" was rejected. Reason: ${rejectionReason.trim()}`,
          read: false,
          createdAt: serverTimestamp(),
          relatedId: listingId
        });
      }

      toast({
        title: 'Success',
        description: 'Listing rejected successfully'
      });

      setSelectedListing(null);
      setRejectionReason('');
      fetchPendingListings();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject listing',
        variant: 'destructive'
      });
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!suspensionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a suspension reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(suspensionDuration));

      await updateDoc(doc(db, 'users', userId), {
        status: 'suspended',
        suspendedAt: serverTimestamp(),
        suspendedBy: user?.uid,
        suspensionReason: suspensionReason.trim(),
        suspensionEndDate: suspensionEndDate,
        suspensionDuration: parseInt(suspensionDuration)
      });

      // Create notification for user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'account_suspended',
        message: `Your account has been suspended for ${suspensionDuration} days. Reason: ${suspensionReason.trim()}`,
        read: false,
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Success',
        description: 'User suspended successfully'
      });

      setSelectedUser(null);
      setSuspensionReason('');
      setSuspensionDuration('7');
      fetchReportedUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend user',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600">Manage listings, users, and platform moderation</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin Panel
                </Badge>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="listings">
                    Pending Listings
                    {stats.pendingListings > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                        {stats.pendingListings}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="users">
                    Reported Users
                    {reportedUsers.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                        {reportedUsers.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalListings}</div>
                        <p className="text-xs text-muted-foreground">
                          {stats.pendingListings} pending approval
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                          {stats.reportedUsers} reported users
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Rating</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">
                          Average user rating
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalReports}</div>
                        <p className="text-xs text-muted-foreground">
                          User reports submitted
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {stats.pendingListings + reportedUsers.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Items requiring attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Rated Users</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportedUsers.filter(u => u.averageRating < 3 && u.totalReviews >= 3).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Users with rating &lt; 3.0
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest moderation actions needed</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {pendingListings.slice(0, 3).map((listing) => (
                            <div key={listing.id} className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{listing.title}</p>
                                <p className="text-xs text-gray-500">by {listing.sellerName}</p>
                              </div>
                              <Badge variant="outline">Pending</Badge>
                            </div>
                          ))}
                          {pendingListings.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No pending listings
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Reports</CardTitle>
                        <CardDescription>Users requiring attention</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {reportedUsers.slice(0, 3).map((user) => (
                            <div key={user.id} className="flex items-center space-x-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.userAvatar} />
                                <AvatarFallback>
                                  {user.userName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.userName}</p>
                                <p className="text-xs text-gray-500">
                                  {user.reportCount} reports • {user.averageRating.toFixed(1)} ⭐
                                </p>
                              </div>
                              <Badge variant="destructive">{user.reportCount}</Badge>
                            </div>
                          ))}
                          {reportedUsers.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No reported users
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="listings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Listings</CardTitle>
                      <CardDescription>
                        Review and approve or reject new listings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pendingListings.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No pending listings</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pendingListings.map((listing) => (
                            <div key={listing.id} className="border rounded-lg p-4">
                              <div className="flex items-start space-x-4">
                                <img
                                  src={listing.imageUrl || '/placeholder.svg'}
                                  alt={listing.title}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold truncate">{listing.title}</h3>
                                  <p className="text-gray-600 text-sm mb-2">{listing.description}</p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span>Price: ${listing.price}</span>
                                    <span>Category: {listing.category}</span>
                                    <span>Condition: {listing.condition}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-sm text-gray-500">by {listing.sellerName}</span>
                                    <Badge variant="outline">{listing.sellerUniversity}</Badge>
                                    <span className="text-xs text-gray-400">
                                      {formatDate(listing.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>{listing.title}</DialogTitle>
                                        <DialogDescription>
                                          Review listing details
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <img
                                          src={listing.imageUrl || '/placeholder.svg'}
                                          alt={listing.title}
                                          className="w-full h-64 object-cover rounded-lg"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Price</Label>
                                            <p className="text-lg font-semibold">${listing.price}</p>
                                          </div>
                                          <div>
                                            <Label>Category</Label>
                                            <p>{listing.category}</p>
                                          </div>
                                          <div>
                                            <Label>Condition</Label>
                                            <p>{listing.condition}</p>
                                          </div>
                                          <div>
                                            <Label>Seller</Label>
                                            <p>{listing.sellerName}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <Label>Description</Label>
                                          <p className="mt-1">{listing.description}</p>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApproveListing(listing.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setSelectedListing(listing)}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Reject Listing</DialogTitle>
                                        <DialogDescription>
                                          Please provide a reason for rejecting this listing.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                          <Textarea
                                            id="rejection-reason"
                                            placeholder="Explain why this listing is being rejected..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedListing(null);
                                              setRejectionReason('');
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => handleRejectListing(listing.id)}
                                          >
                                            Reject Listing
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reported Users</CardTitle>
                      <CardDescription>
                        Users with multiple reports or low ratings requiring attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportedUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No reported users</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reportedUsers.map((user) => (
                            <div key={user.id} className="border rounded-lg p-4">
                              <div className="flex items-start space-x-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarImage src={user.userAvatar} />
                                  <AvatarFallback>
                                    {user.userName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold">{user.userName}</h3>
                                  <p className="text-gray-600 text-sm">{user.userEmail}</p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                                    <span>University: {user.userUniversity}</span>
                                    <span>Reports: {user.reportCount}</span>
                                    <span>Rating: {user.averageRating.toFixed(1)} ⭐ ({user.totalReviews} reviews)</span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Badge 
                                      variant={user.status === 'suspended' ? 'destructive' : 'outline'}
                                    >
                                      {user.status}
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      Last report: {formatDate(user.lastReportDate)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Reports
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Reports for {user.userName}</DialogTitle>
                                        <DialogDescription>
                                          Review all reports submitted against this user
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {user.reports.map((report) => (
                                          <div key={report.id} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                              <div>
                                                <p className="font-medium">Reported by: {report.reporterName}</p>
                                                <p className="text-sm text-gray-500">Reason: {report.reason}</p>
                                              </div>
                                              <Badge variant="outline">
                                                {formatDate(report.createdAt)}
                                              </Badge>
                                            </div>
                                            <p className="text-sm">{report.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  {user.status !== 'suspended' && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => setSelectedUser(user)}
                                        >
                                          <Ban className="h-4 w-4 mr-1" />
                                          Suspend
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Suspend User</DialogTitle>
                                          <DialogDescription>
                                            Suspend {user.userName} from the platform
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label htmlFor="suspension-duration">Suspension Duration</Label>
                                            <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select duration" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="1">1 day</SelectItem>
                                                <SelectItem value="3">3 days</SelectItem>
                                                <SelectItem value="7">7 days</SelectItem>
                                                <SelectItem value="14">14 days</SelectItem>
                                                <SelectItem value="30">30 days</SelectItem>
                                                <SelectItem value="90">90 days</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label htmlFor="suspension-reason">Suspension Reason</Label>
                                            <Textarea
                                              id="suspension-reason"
                                              placeholder="Explain why this user is being suspended..."
                                              value={suspensionReason}
                                              onChange={(e) => setSuspensionReason(e.target.value)}
                                              rows={3}
                                            />
                                          </div>
                                          <div className="flex justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setSelectedUser(null);
                                                setSuspensionReason('');
                                                setSuspensionDuration('7');
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleSuspendUser(user.userId)}
                                            >
                                              Suspend User
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Reports</CardTitle>
                      <CardDescription>
                        Overview of all reports and moderation statistics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                              <Flag className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium">Total Reports</p>
                                <p className="text-2xl font-bold">{stats.totalReports}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                              <UserX className="h-5 w-5 text-orange-500" />
                              <div>
                                <p className="text-sm font-medium">Reported Users</p>
                                <p className="text-2xl font-bold">{reportedUsers.length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                              <Ban className="h-5 w-5 text-red-600" />
                              <div>
                                <p className="text-sm font-medium">Suspended Users</p>
                                <p className="text-2xl font-bold">
                                  {reportedUsers.filter(u => u.status === 'suspended').length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                              <TrendingDown className="h-5 w-5 text-yellow-500" />
                              <div>
                                <p className="text-sm font-medium">Low Rated</p>
                                <p className="text-2xl font-bold">
                                  {reportedUsers.filter(u => u.averageRating < 3 && u.totalReviews >= 3).length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Recent Reports Summary</h3>
                        {reportedUsers.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No reports to display</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {reportedUsers.slice(0, 5).map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.userAvatar} />
                                    <AvatarFallback>
                                      {user.userName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.userName}</p>
                                    <p className="text-sm text-gray-500">
                                      {user.reportCount} reports • {user.averageRating.toFixed(1)} ⭐
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant={user.reportCount > 3 ? 'destructive' : 'secondary'}
                                  >
                                    {user.reportCount} reports
                                  </Badge>
                                  <Badge 
                                    variant={user.status === 'suspended' ? 'destructive' : 'outline'}
                                  >
                                    {user.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
