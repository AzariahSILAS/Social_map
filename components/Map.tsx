import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { markersAPI, Marker as MarkerData } from '../utils/supabase/client';


mapboxgl.accessToken = 'pk.eyJ1IjoiYXphcmlhaDIwMCIsImEiOiJjbWhrMWVic2kxZXh6MmxweTQ0cWIwZm1iIn0.8VgSBbpgTJCXAcFqWUaoRg';

export interface MapRef {
  flyToLocation: (lng: number, lat: number) => void;
  requestUserLocation: () => void;
}

export const Map = forwardRef<MapRef>((props, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const savedMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [markers, setMarkers] = useState<MarkerData[]>([]);

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
    }
  }));

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
    />
  );
});