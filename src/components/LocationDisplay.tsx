import React, { useState, useEffect } from 'react';
import { MapPin, Truck } from 'lucide-react';
import { reverseGeocode, getLocationName } from '@/utils/geocoding';
import { LocationData } from '@/types/listing.d';

interface LocationDisplayProps {
  locations: LocationData[];
  deliveryRadius?: number;
  showFullAddress?: boolean;
}

interface LocationWithAddress extends LocationData {
  address?: string;
  loading?: boolean;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({ 
  locations, 
  deliveryRadius, 
  showFullAddress = false 
}) => {
  const [locationsWithAddresses, setLocationsWithAddresses] = useState<LocationWithAddress[]>([]);

  useEffect(() => {
    const fetchAddresses = async () => {
      // Initialize with loading state
      const initialLocations = locations.map(loc => ({ ...loc, loading: true }));
      setLocationsWithAddresses(initialLocations);

      // Fetch addresses for each location
      const updatedLocations = await Promise.all(
        locations.map(async (location) => {
          try {
            const address = showFullAddress 
              ? await reverseGeocode(location.lat, location.lng)
              : await getLocationName(location.lat, location.lng);
            
            return {
              ...location,
              address,
              loading: false
            };
          } catch (error) {
            console.error('Failed to fetch address for location:', location.id, error);
            return {
              ...location,
              address: `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`,
              loading: false
            };
          }
        })
      );

      setLocationsWithAddresses(updatedLocations);
    };

    if (locations.length > 0) {
      fetchAddresses();
    }
  }, [locations, showFullAddress]);

  const mainLocation = locationsWithAddresses.find(loc => loc.type === 'main');
  const deliveryLocations = locationsWithAddresses.filter(loc => loc.type === 'delivery');
  const pickupLocations = locationsWithAddresses.filter(loc => loc.type === 'pickup');

  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Main Location */}
      {mainLocation && (
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="w-4 h-4 bg-red-500 rounded-full mt-0.5 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Main Selling Location</span>
            </div>
            {mainLocation.loading ? (
              <div className="h-4 bg-red-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-sm text-red-700 break-words">
                {mainLocation.address || `${mainLocation.lat.toFixed(4)}, ${mainLocation.lng.toFixed(4)}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delivery Information */}
      {deliveryLocations.length > 0 && deliveryRadius && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <Truck className="h-4 w-4" />
            <span>Delivery available within {deliveryRadius}km radius</span>
          </div>
          
          <div className="space-y-2">
            {deliveryLocations.map((location, index) => (
              <div key={location.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-4 h-4 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-blue-800">Delivery Location {index + 1}</span>
                  </div>
                  {location.loading ? (
                    <div className="h-4 bg-blue-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-sm text-blue-700 break-words">
                      {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pickup Locations */}
      {pickupLocations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
            <MapPin className="h-4 w-4" />
            <span>Other Pickup Locations</span>
          </div>
          
          <div className="space-y-2">
            {pickupLocations.map((location, index) => (
              <div key={location.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-4 h-4 bg-purple-500 rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-purple-800">Pickup Location {index + 1}</span>
                  </div>
                  {location.loading ? (
                    <div className="h-4 bg-purple-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-sm text-purple-700 break-words">
                      {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback for no specific delivery/pickup info */}
      {(!deliveryLocations.length || !deliveryRadius) && !pickupLocations.length && mainLocation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg border border-gray-200">
          <MapPin className="h-4 w-4" />
          <span>Pickup only - contact seller for exact location details</span>
        </div>
      )}
    </div>
  );
};

export default LocationDisplay;
