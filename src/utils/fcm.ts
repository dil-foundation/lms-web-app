import { messaging } from '@/firebase';
import { getToken } from 'firebase/messaging';
import fcmService from '@/services/fcmService';

const VAPID_KEY = "BNG3CQ5jrYMWplp4jO9wCPKBHL5-chTTAMBm95RRyEf2ydM1QmlNqzRtryhsAxEHSUpizgnMfVZyEw3l6E6O9L0";

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        await fcmService.saveToken(currentToken);
      } else {
        console.error('No registration token available. Request permission to generate one.');
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }
};
