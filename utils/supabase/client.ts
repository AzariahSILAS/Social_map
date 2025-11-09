import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ac2b2b01`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface Marker {
  id: string;
  longitude: number;
  latitude: number;
  label: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  filePath: string;
  signedUrl: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export const markersAPI = {
  // Get all markers
  async getAll(): Promise<Marker[]> {
    const { data, error } = await supabase
      .from('markers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching markers:', error);
      throw error;
    }
    
    return data || [];
  },

  // Add a new marker
  async add(longitude: number, latitude: number, label?: string): Promise<Marker> {
    const { data, error } = await supabase
      .from('markers')
      .insert([{ longitude, latitude, label: label || null }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding marker:', error);
      throw error;
    }
    
    return data;
  },

  // Delete a marker
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('markers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting marker:', error);
      throw error;
    }
  }
};

export const photosAPI = {
  // Upload a photo with location
  async upload(base64Data: string, filename: string, latitude: number, longitude: number): Promise<Photo> {
    const response = await fetch(`${serverUrl}/photos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        base64Data,
        filename,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload photo');
    }

    const data = await response.json();
    return {
      id: data.photoId,
      filePath: '',
      signedUrl: data.signedUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      created_at: new Date().toISOString(),
    };
  },

  // Get all photos
  async getAll(): Promise<Photo[]> {
    const response = await fetch(`${serverUrl}/photos`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch photos');
    }

    const data = await response.json();
    return data.photos || [];
  },

  // Delete a photo
  async delete(id: string): Promise<void> {
    const response = await fetch(`${serverUrl}/photos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete photo');
    }
  }
};