import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUser } from '../utils/auth';
import { Service } from '../types/service';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Star, Clock, MapPin, Calendar, DollarSign, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';

const ServiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    estimatedHours: '',
    deadline: '',
  });

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const serviceDoc = await getDoc(doc(db, 'services', id));
        
        if (serviceDoc.exists()) {
          const serviceData = {
            id: serviceDoc.id,
            ...serviceDoc.data(),
            createdAt: serviceDoc.data().createdAt?.toDate(),
            updatedAt: serviceDoc.data().updatedAt?.toDate(),
          } as Service;
          
          setService(serviceData);
        } else {
          toast.error('Service not found');
          navigate('/services');
        }
      } catch (error) {
        console.error('Error fetching service:', error);
        toast.error('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id, navigate]);

  const handleContactProvider = () => {
    if (!user || !service) {
      toast.error('You must be logged in to contact the provider');
      return;
    }

    if (user.uid === service.providerId) {
      toast.error('You cannot contact yourself');
      return;
    }

    // Navigate to messages with provider information
    navigate('/messages', {
      state: {
        sellerId: service.providerId,
        initialMessage: `Hi! I'm interested in your service: ${service.title}. Could you provide more details?`
      }
    });
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !service) {
      toast.error('You must be logged in to make a request');
      return;
    }

    if (user.uid === service.providerId) {
      toast.error('You cannot request your own service');
      return;
    }

    if (!requestForm.title || !requestForm.description || !requestForm.estimatedHours || !requestForm.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingRequest(true);

    try {
      const estimatedHours = parseFloat(requestForm.estimatedHours);
      const totalAmount = estimatedHours * service.hourlyRate;

      const requestData = {
        serviceId: service.id,
        clientId: user.uid,
        clientName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        clientEmail: user.email || '',
        providerId: service.providerId,
        title: requestForm.title,
        description: requestForm.description,
        estimatedHours,
        totalAmount,
        hourlyRate: service.hourlyRate,
        deadline: Timestamp.fromDate(new Date(requestForm.deadline)),
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messages: [],
        attachments: [],
      };

      await addDoc(collection(db, 'serviceRequests'), requestData);
      
      toast.success('Service request sent successfully!');
      setRequestDialogOpen(false);
      setRequestForm({
        title: '',
        description: '',
        estimatedHours: '',
        deadline: '',
      });
    } catch (error) {
      console.error('Error creating service request:', error);
      toast.error('Failed to send service request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar isAuthenticated={true} />
        <div className="flex">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar isAuthenticated={true} />
        <div className="flex">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
              <Button onClick={() => navigate('/services')}>Back to Services</Button>
            </div>
          </main>
        </div>
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
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/services')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{service.rating.toFixed(1)} ({service.reviewCount} reviews)</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{service.responseTime}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span className="capitalize">{service.location.type}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {service.category.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{service.description}</p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Skills & Expertise</h3>
                        <div className="flex flex-wrap gap-2">
                          {service.skills.map((skill, index) => (
                            <Badge key={index} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Availability</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-1">Days:</p>
                            <p className="text-sm text-muted-foreground">
                              {service.availability.days.join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Time Slots:</p>
                            <p className="text-sm text-muted-foreground">
                              {service.availability.timeSlots.join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {service.requirements && (
                        <div>
                          <h3 className="font-semibold mb-2">Requirements</h3>
                          <p className="text-muted-foreground">{service.requirements}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Provider Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Provider</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={service.providerAvatar} />
                        <AvatarFallback>{service.providerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{service.providerName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {service.completedJobs} jobs completed
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Response Time:</span>
                        <span className="font-medium">{service.responseTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rating:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{service.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing & Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-primary">
                        ${service.hourlyRate}
                      </div>
                      <div className="text-sm text-muted-foreground">per hour</div>
                    </div>

                    <div className="space-y-3">
                      {user?.uid !== service.providerId ? (
                        <>
                          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full">
                                Request Service
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Request Service</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleRequestSubmit} className="space-y-4">
                                <div>
                                  <Label htmlFor="title">Project Title *</Label>
                                  <Input
                                    id="title"
                                    placeholder="Brief title for your project"
                                    value={requestForm.title}
                                    onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="description">Description *</Label>
                                  <Textarea
                                    id="description"
                                    placeholder="Describe what you need help with..."
                                    value={requestForm.description}
                                    onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="estimatedHours">Estimated Hours *</Label>
                                  <Input
                                    id="estimatedHours"
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    placeholder="How many hours do you think this will take?"
                                    value={requestForm.estimatedHours}
                                    onChange={(e) => setRequestForm(prev => ({ ...prev, estimatedHours: e.target.value }))}
                                    required
                                  />
                                  {requestForm.estimatedHours && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Estimated cost: ${(parseFloat(requestForm.estimatedHours) * service.hourlyRate).toFixed(2)}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <Label htmlFor="deadline">Deadline *</Label>
                                  <Input
                                    id="deadline"
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={requestForm.deadline}
                                    onChange={(e) => setRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                                    required
                                  />
                                </div>

                                <div className="flex space-x-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setRequestDialogOpen(false)}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={submittingRequest}
                                    className="flex-1"
                                  >
                                    {submittingRequest ? 'Sending...' : 'Send Request'}
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={handleContactProvider}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Contact Provider
                          </Button>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          This is your service
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServiceDetails;
