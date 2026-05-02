import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    if (location) {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          // We use the direct IP here as this runs in a separate context
          // In a real app, this would be your production URL
          const API_URL = 'https://backend-three-sepia-51.vercel.app/api/locations/ping'; 
          
          await axios.post(API_URL, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
            clientRecordedAt: new Date(location.timestamp).toISOString(),
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Background location ping sent successfully');
        }
      } catch (err) {
        console.error('Failed to send background location ping:', err);
      }
    }
  }
});
