import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Service, ServiceCategory } from '../types/service';
import { getUser } from '../utils/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Star, Clock, MapPin, Search, Filter, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';

const Services: React.FC = () => {
  const user = getUser();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'recent'>('recent');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const categories: { value: ServiceCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Services' },
    { value: 'assignments', label: 'Assignments Help' },
    { value: 'notes', label: 'Notes & Study Materials' },
    { value: 'lab-tasks', label: 'Lab Tasks' },
    { value: 'tuition', label: 'Tuition & Teaching' },
    { value: 'part-time-job', label: 'Part-time Jobs' },
    { value: 'task-offer', label: 'Task Offers' },
  ];

  const fetchServices = async () => {
    try {
      setLoading(true);
      console.log('Fetching services from Firestore...');
      
      // Simple query to get all services
      const servicesRef = collection(db, 'services');
      const snapshot = await getDocs(servicesRef);
      
      console.log('Firestore snapshot size:', snapshot.size);
      
      const allServices: Service[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Service document:', doc.id, data);
        
        const service: Service = {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'assignments',
          hourlyRate: data.hourlyRate || 0,
          providerId: data.providerId || '',
          providerName: data.providerName || 'Unknown',
          providerEmail: data.providerEmail || '',
          providerAvatar: data.providerAvatar || '',
          skills: data.skills || [],
          availability: data.availability || { days: [], timeSlots: [] },
          location: data.location || { type: 'online' },
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          responseTime: data.responseTime || 'New provider',
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tags: data.tags || [],
          requirements: data.requirements || '',
          portfolio: data.portfolio || { images: [], documents: [] },
        };
        
        allServices.push(service);
      });
      
      console.log('Processed services:', allServices);
      setServices(allServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filter and sort services
  const filteredAndSortedServices = React.useMemo(() => {
    let filtered = services;

    // Filter by active status
    filtered = filtered.filter(service => service.isActive);

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower) ||
        service.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        service.providerName.toLowerCase().includes(searchLower)
      );
    }

    // Sort services
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    } else {
      filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }

    return filtered;
  }, [services, selectedCategory, searchTerm, sortBy]);

  const ServiceCard: React.FC<{ service: Service }> = ({ service }) => (
    <Link to={`/services/${service.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={service.providerAvatar} />
                <AvatarFallback>{(service.providerName || 'U').charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.providerName}</p>
              </div>
            </div>
            <Badge variant="secondary">
              {categories.find(cat => cat.value === service.category)?.label || 'Other'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {service.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {service.skills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {service.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{service.skills.length - 3} more
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{service.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({service.reviewCount})</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">{service.responseTime}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-xs capitalize">{service.location.type}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {service.completedJobs} jobs completed
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-primary">${service.hourlyRate}</span>
              <span className="text-sm text-muted-foreground">/hour</span>
            </div>
            <Button size="sm" onClick={(e) => e.preventDefault()}>
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Student Services</h1>
                <p className="text-lg text-gray-600">Find help with assignments, tutoring, and more</p>
              </div>
              <Link to="/services/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Offer Service
                </Button>
              </Link>
            </div>

            {/* Debug Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm">
              <p>Debug: Found {services.length} total services, showing {filteredAndSortedServices.length} after filters</p>
              <p>Category: {selectedCategory}, Sort: {sortBy}, Search: "{searchTerm}"</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ServiceCategory | 'all')}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'rating' | 'price' | 'recent')}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Services Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-white rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedServices.length > 0 ? (
                    filteredAndSortedServices.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))
                  ) : (
                    <div className="col-span-full bg-white p-8 rounded-lg shadow-sm border text-center">
                      <p className="text-gray-500 mb-4">
                        {services.length === 0 
                          ? "No services found. Be the first to create one!" 
                          : "No services match your current filters."
                        }
                      </p>
                      <Link to="/services/create">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          {services.length === 0 ? "Create First Service" : "Create New Service"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {filteredAndSortedServices.length > 0 && (
                  <div className="text-center mt-8">
                    <Button 
                      variant="outline" 
                      onClick={fetchServices}
                      disabled={loading}
                    >
                      Refresh Services
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Services;
