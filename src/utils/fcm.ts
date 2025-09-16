import { messaging } from '@/firebase';
import { getToken } from 'firebase/messaging';
import fcmService from '@/services/fcmService';

const VAPID_KEY = "BNG3CQ5jrYMWplp4jO9wCPKBHL5-chTTAMBm95RRyEf2ydM1QmlNqzRtryhsAxEHSUpizgnMfVZyEw3l6E6O9L0";

export const requestNotificationPermission = async () => {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.warn('Firebase messaging is not available in this browser');
      return;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        await fcmService.saveToken(currentToken);
        console.log('FCM token saved successfully');
      } else {
        console.error('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Notification permission denied - notifications will not be available');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
};
