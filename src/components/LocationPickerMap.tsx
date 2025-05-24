import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Leaflet and Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  initialLocation?: string; // Format: "latitude,longitude"
  onLocationSelect: (location: string) => void;
}

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ initialLocation, onLocationSelect }) => {
  const defaultCenter: [number, number] = [23.777176, 90.399452]; // Default to Dhaka, Bangladesh
  const [position, setPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (initialLocation) {
      const [lat, lng] = initialLocation.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], mapRef.current.getZoom());
        }
      }
    }
  }, [initialLocation]);

  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onLocationSelect(`${lat},${lng}`);
      },
    });
    return null;
  };

  return (
    <MapContainer 
      center={position || defaultCenter} 
      zoom={position ? 13 : 7} 
      scrollWheelZoom={true} 
      style={{ height: '400px', width: '100%', borderRadius: '8px' }}
      whenCreated={mapInstance => { mapRef.current = mapInstance; }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && <Marker position={position}></Marker>}
      <MapEvents />
    </MapContainer>
  );
};

export default LocationPickerMap;
