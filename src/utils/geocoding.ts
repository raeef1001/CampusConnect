// Utility functions for geocoding and reverse geocoding

export interface AddressInfo {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  district?: string;
  state?: string;
  country?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
}

export interface GeocodeResult {
  display_name: string;
  address: AddressInfo;
}

/**
 * Convert latitude/longitude to human-readable address using OpenStreetMap Nominatim API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CampusConnect-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: GeocodeResult = await response.json();
    
    if (data && data.address) {
      // Build a readable address from the components
      const address = data.address;
      const parts: string[] = [];

      // Add road and house number if available
      if (address.house_number && address.road) {
        parts.push(`${address.house_number} ${address.road}`);
      } else if (address.road) {
        parts.push(address.road);
      }

      // Add locality (suburb, village, or town)
      if (address.suburb) {
        parts.push(address.suburb);
      } else if (address.village) {
        parts.push(address.village);
      } else if (address.town) {
        parts.push(address.town);
      }

      // Add city if different from town/village
      if (address.city && address.city !== address.town && address.city !== address.village) {
        parts.push(address.city);
      }

      // Add state/district
      if (address.state) {
        parts.push(address.state);
      } else if (address.district) {
        parts.push(address.district);
      }

      // Add country if not local
      if (address.country && address.country !== 'Bangladesh') {
        parts.push(address.country);
      }

      // Return the formatted address or fall back to display_name
      return parts.length > 0 ? parts.join(', ') : data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    // Fallback to coordinates
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Get a short location name (city/town) from coordinates
 */
export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CampusConnect-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: GeocodeResult = await response.json();
    
    if (data && data.address) {
      const address = data.address;
      
      // Return the most appropriate locality name
      return address.city || 
             address.town || 
             address.village || 
             address.district || 
             address.suburb || 
             `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }

    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch (error) {
    console.error('Location name lookup failed:', error);
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}
