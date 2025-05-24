import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUser } from '../utils/auth';
import { ServiceRequest, ServiceRequestStatus } from '../types/service';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Calendar, Clock, DollarSign, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';

const ServiceRequests: React.FC = () => {
  const user = getUser();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch requests where user is either client or provider
      const clientQuery = query(
        collection(db, 'serviceRequests'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const providerQuery = query(
        collection(db, 'serviceRequests'),
        where('providerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const [clientSnapshot, providerSnapshot] = await Promise.all([
        getDocs(clientQuery),
        getDocs(providerQuery)
      ]);

      const clientRequests = clientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        deadline: doc.data().deadline?.toDate(),
      })) as ServiceRequest[];

      const providerRequests = providerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        deadline: doc.data().deadline?.toDate(),
      })) as ServiceRequest[];

      // Combine and remove duplicates
      const allRequests = [...clientRequests, ...providerRequests];
      const uniqueRequests = allRequests.filter((request, index, self) => 
        index === self.findIndex(r => r.id === request.id)
      );

      setRequests(uniqueRequests);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      toast.error('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const updateRequestStatus = async (requestId: string, status: ServiceRequestStatus) => {
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status,
        updatedAt: new Date(),
      });

      setRequests(prev => prev.map(request => 
        request.id === requestId ? { ...request, status } : request
      ));

      toast.success(`Request ${status} successfully`);
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const getStatusColor = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const RequestCard: React.FC<{ request: ServiceRequest; isProvider: boolean }> = ({ request, isProvider }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={isProvider ? undefined : undefined} />
              <AvatarFallback>
                {isProvider ? request.clientName.charAt(0) : request.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{request.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isProvider ? `Client: ${request.clientName}` : `Provider: ${request.providerId}`}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(request.status)}>
            {request.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{request.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">${request.totalAmount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{request.estimatedHours}h</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{request.deadline.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{request.messages.length} messages</span>
          </div>
        </div>

        <div className="flex space-x-2">
          {isProvider && request.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                onClick={() => updateRequestStatus(request.id, 'accepted')}
              >
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateRequestStatus(request.id, 'cancelled')}
              >
                Decline
              </Button>
            </>
          )}
          
          {isProvider && request.status === 'accepted' && (
            <Button 
              size="sm"
              onClick={() => updateRequestStatus(request.id, 'in-progress')}
            >
              Start Work
            </Button>
          )}
          
          {isProvider && request.status === 'in-progress' && (
            <Button 
              size="sm"
              onClick={() => updateRequestStatus(request.id, 'completed')}
            >
              Mark Complete
            </Button>
          )}
          
          {!isProvider && request.status === 'pending' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateRequestStatus(request.id, 'cancelled')}
            >
              Cancel Request
            </Button>
          )}
          
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const clientRequests = requests.filter(r => r.clientId === user?.uid);
  const providerRequests = requests.filter(r => r.providerId === user?.uid);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
              <p className="text-lg text-gray-600">Manage your service requests and orders</p>
            </div>

            <Tabs defaultValue="client" className="space-y-6">
              <TabsList>
                <TabsTrigger value="client">
                  My Requests ({clientRequests.length})
                </TabsTrigger>
                <TabsTrigger value="provider">
                  Incoming Requests ({providerRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="client">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Requests I've Made</h2>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 bg-white rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : clientRequests.length > 0 ? (
                    clientRequests.map((request) => (
                      <RequestCard 
                        key={request.id} 
                        request={request} 
                        isProvider={false}
                      />
                    ))
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-gray-500 mb-4">You haven't made any service requests yet</p>
                      <Button>Browse Services</Button>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="provider">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Requests for My Services</h2>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 bg-white rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : providerRequests.length > 0 ? (
                    providerRequests.map((request) => (
                      <RequestCard 
                        key={request.id} 
                        request={request} 
                        isProvider={true}
                      />
                    ))
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-gray-500 mb-4">No one has requested your services yet</p>
                      <Button>Create a Service</Button>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServiceRequests;
