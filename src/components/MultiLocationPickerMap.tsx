import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trash2, Navigation } from 'lucide-react';

// Fix for default icon issue with Leaflet and Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create custom icons for different location types
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const mainLocationIcon = createCustomIcon('#ef4444'); // Red for main location
const deliveryLocationIcon = createCustomIcon('#3b82f6'); // Blue for delivery locations

export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  type: 'main' | 'delivery';
  name?: string;
}

interface MultiLocationPickerMapProps {
  onLocationsChange: (locations: LocationData[]) => void;
  initialLocations?: LocationData[];
  maxDeliveryLocations?: number;
  deliveryRadius?: number; // in kilometers
}

const MultiLocationPickerMap: React.FC<MultiLocationPickerMapProps> = ({ 
  onLocationsChange, 
  initialLocations = [],
  maxDeliveryLocations = 3,
  deliveryRadius = 5 // 5km default radius
}) => {
  const defaultCenter: [number, number] = [23.777176, 90.399452]; // Default to Dhaka, Bangladesh
  const [locations, setLocations] = useState<LocationData[]>(initialLocations);
  const [mode, setMode] = useState<'main' | 'delivery'>('main');
  const mapRef = useRef<L.Map | null>(null);

  const mainLocation = locations.find(loc => loc.type === 'main');
  const deliveryLocations = locations.filter(loc => loc.type === 'delivery');

  useEffect(() => {
    onLocationsChange(locations);
  }, [locations, onLocationsChange]);

  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        
        if (mode === 'main') {
          // Remove existing main location and add new one
          const newLocations = locations.filter(loc => loc.type !== 'main');
          const newMainLocation: LocationData = {
            id: `main-${Date.now()}`,
            lat,
            lng,
            type: 'main',
            name: 'Main Selling Location'
          };
          setLocations([...newLocations, newMainLocation]);
        } else if (mode === 'delivery') {
          // Check if we can add more delivery locations
          if (deliveryLocations.length >= maxDeliveryLocations) {
            alert(`Maximum ${maxDeliveryLocations} delivery locations allowed`);
            return;
          }

          // Check if location is within delivery radius of main location
          if (mainLocation) {
            const distance = calculateDistance(
              mainLocation.lat, 
              mainLocation.lng, 
              lat, 
              lng
            );
            
            if (distance > deliveryRadius) {
              alert(`Delivery location must be within ${deliveryRadius}km of the main location`);
              return;
            }
          }

          const newDeliveryLocation: LocationData = {
            id: `delivery-${Date.now()}`,
            lat,
            lng,
            type: 'delivery',
            name: `Delivery Location ${deliveryLocations.length + 1}`
          };
          setLocations([...locations, newDeliveryLocation]);
        }
      },
    });
    return null;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  const removeLocation = (id: string) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please select manually on the map.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Locations
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'main' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('main')}
            className="flex items-center gap-1"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            Main Location
          </Button>
          <Button
            variant={mode === 'delivery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('delivery')}
            disabled={!mainLocation}
            className="flex items-center gap-1"
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Delivery Locations ({deliveryLocations.length}/{maxDeliveryLocations})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            className="flex items-center gap-1"
          >
            <Navigation className="h-3 w-3" />
            My Location
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          {mode === 'main' 
            ? "Click on the map to set your main selling location" 
            : mainLocation 
              ? `Click on the map to add delivery locations (within ${deliveryRadius}km radius)`
              : "Please set your main location first"
          }
        </div>

        <MapContainer 
          center={mainLocation ? [mainLocation.lat, mainLocation.lng] : defaultCenter} 
          zoom={mainLocation ? 13 : 11} 
          scrollWheelZoom={true} 
          style={{ height: '400px', width: '100%', borderRadius: '8px' }}
          whenCreated={mapInstance => { mapRef.current = mapInstance; }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Render all location markers */}
          {locations.map((location) => (
            <Marker 
              key={location.id}
              position={[location.lat, location.lng]}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-medium">{location.name}</p>
                  <p className="text-xs text-gray-500">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        location.type === 'main' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                    ></div>
                    <span className="text-xs">
                      {location.type === 'main' ? 'Main' : 'Delivery'}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeLocation(location.id)}
                    className="mt-2 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}

          <MapEvents />
        </MapContainer>

        {/* Location Summary */}
        {locations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Selected Locations:</h4>
            <div className="space-y-1">
              {mainLocation && (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Main Selling Location</span>
                  </div>
                  <Badge variant="secondary">Primary</Badge>
                </div>
              )}
              {deliveryLocations.map((location, index) => (
                <div key={location.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Delivery Location {index + 1}</span>
                  </div>
                  <Badge variant="outline">
                    {mainLocation && calculateDistance(
                      mainLocation.lat, 
                      mainLocation.lng, 
                      location.lat, 
                      location.lng
                    ).toFixed(1)}km
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiLocationPickerMap;
