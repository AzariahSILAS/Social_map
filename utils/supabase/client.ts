import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface Marker {
  id: string;
  longitude: number;
  latitude: number;
  label: string | null;
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