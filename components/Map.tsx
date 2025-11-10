"use client";
import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { markersAPI, Marker as MarkerData, photosAPI, Photo } from '../utils/supabase/client';
const cameraIcon = '/blueicon.png';
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;


export interface MapRef {
  flyToLocation: (lng: number, lat: number) => void;
  requestUserLocation: () => void;
  reloadPhotos: () => void;
}

interface MapProps {
  onPhotoClick?: (photoUrl: string) => void;
}

export const Map = forwardRef<MapRef, MapProps>(({ onPhotoClick }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const savedMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const photoMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Load markers from Supabase on mount
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const data = await markersAPI.getAll();
        setMarkers(data);
      } catch (error) {
        console.error('Failed to load markers:', error);
      }
    };
    
    loadMarkers();
  }, []);

  // Load photos from Supabase on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await photosAPI.getAll();
      setPhotos(data);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return; // initialize map only once

    // Default fallback location (New York)
    const defaultLocation: [number, number] = [-74.5, 40];

    // Initialize map with default location
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultLocation,
      zoom: 9
    });

    const mapInstance = map.current;

    // Add navigation controls (zoom in/out buttons)
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Initialize search marker (the red one that moves when you search)
    marker.current = new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat(defaultLocation)
      .addTo(mapInstance);

    // Try to get user's current location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];

          if (mapInstance) {
            mapInstance.flyTo({
              center: userLocation,
              zoom: 13,
              essential: true
            });

            if (marker.current) {
              marker.current.setLngLat(userLocation);
            }
          }
        },
        (error) => {
          console.log('Unable to get user location, using default:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    // Add click handler to create new markers
    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      // Prompt user for a label
      const label = prompt('Enter a label for this marker (optional):');
      
      try {
        // Save to Supabase
        const newMarker = await markersAPI.add(lng, lat, label || undefined);
        
        // Update state to trigger re-render
        setMarkers(prev => [newMarker, ...prev]);
        
        console.log('Marker added successfully:', newMarker);
      } catch (error) {
        console.error('Failed to add marker:', error);
        alert('Failed to add marker. Please try again.');
      }
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Display saved markers on the map
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(savedMarkers.current).forEach(m => m.remove());
    savedMarkers.current = {};

    // Add current markers
    markers.forEach(markerData => {
      if (map.current) {
        const mapboxMarker = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([markerData.longitude, markerData.latitude]);

        // Add popup with label only
        if (markerData.label) {
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="padding: 8px;">
                <p style="margin: 0; font-weight: 500;">${markerData.label}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Right-click to delete</p>
              </div>
            `);
          mapboxMarker.setPopup(popup);
        }

        mapboxMarker.addTo(map.current);

        // Add right-click handler to delete marker
        const markerElement = mapboxMarker.getElement();
        markerElement.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          
          try {
            await markersAPI.delete(markerData.id);
            setMarkers(prev => prev.filter(m => m.id !== markerData.id));
            console.log('Marker deleted successfully:', markerData.id);
          } catch (error) {
            console.error('Failed to delete marker:', error);
            alert('Failed to delete marker. Please try again.');
          }
        });

        savedMarkers.current[markerData.id] = mapboxMarker;
      }
    });
  }, [markers]);

  // Display photo markers on the map
  useEffect(() => {
    if (!map.current) return;

    // Remove old photo markers
    Object.values(photoMarkers.current).forEach(m => m.remove());
    photoMarkers.current = {};

    // Add current photo markers with camera icon
    photos.forEach(photo => {
      if (map.current) {
        // Create custom camera icon element
        const el = document.createElement('div');
        el.className = 'camera-marker';
        el.style.backgroundImage = `url(${cameraIcon})`;
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.cursor = 'pointer';
        // el.style.backgroundColor = '#10b981';
        el.style.borderRadius = '50%';
        el.style.padding = '8px';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

        const mapboxMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([photo.longitude, photo.latitude])
          .addTo(map.current);

        // Add click handler to view photo
        el.addEventListener('click', () => {
          if (onPhotoClick) {
            onPhotoClick(photo.signedUrl);
          }
        });

        // Add right-click handler to delete photo
        el.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          
          const confirmDelete = confirm('Delete this photo?');
          if (!confirmDelete) return;

          try {
            await photosAPI.delete(photo.id);
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            console.log('Photo deleted successfully:', photo.id);
          } catch (error) {
            console.error('Failed to delete photo:', error);
            alert('Failed to delete photo. Please try again.');
          }
        });

        photoMarkers.current[photo.id] = mapboxMarker;
      }
    });
  }, [photos, onPhotoClick]);

  useImperativeHandle(ref, () => ({
    flyToLocation: (lng: number, lat: number) => {
      if (map.current) {
        map.current.flyTo({
          center: [lng, lat],
          zoom: 14,
          essential: true
        });

        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        }
      }
    },
    requestUserLocation: () => {
      if ('geolocation' in navigator && map.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation: [number, number] = [
              position.coords.longitude,
              position.coords.latitude
            ];

            if (map.current) {
              map.current.flyTo({
                center: userLocation,
                zoom: 13,
                essential: true
              });

              if (marker.current) {
                marker.current.setLngLat(userLocation);
              }
            }
          },
          (error) => {
            alert(`Unable to get your location: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        alert('Geolocation is not supported by your browser');
      }
    },
    reloadPhotos: () => {
      loadPhotos();
    }
  }));

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
    />
  );
});