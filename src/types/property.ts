/**
 * Unified Property type definitions for the application
 */

export interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  market: string;
  region: string;
  roof_type: string;
  roof_area: number;
  last_inspection_date: string | null;
  site_contact_name: string;
  site_contact_phone: string;
  roof_access: string;
  latitude: number | null;
  longitude: number | null;
  manufacturer_warranty_expiration: string | null;
  installer_warranty_expiration: string | null;
  client_id: string;
  status: string;
  property_manager_name: string;
  property_manager_email: string;
  property_manager_phone: string;
  client_name: string;
  property_contacts: PropertyContact[];
}

export interface PropertyContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  office_phone: string | null;
  mobile_phone: string | null;
  role: string;
  title: string | null;
  assignment_type: string;
}

export interface PropertyFilters {
  clientId?: string;
  region?: string;
  market?: string;
  zipcodes?: string[];
  searchTerm?: string;
  inspectionType?: string;
}

export interface PropertyStats {
  totalProperties: number;
  activeProperties: number;
  propertiesByRegion: Record<string, number>;
  propertiesByMarket: Record<string, number>;
  propertiesWithManagers: number;
}

export interface PropertyGroup {
  id: string;
  name: string;
  type: 'region' | 'market' | 'manager' | 'custom';
  properties: Property[];
  metadata?: Record<string, any>;
}