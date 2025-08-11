import { messaging } from '@/firebase';
import { getToken } from 'firebase/messaging';
import fcmService from '@/services/fcmService';

const VAPID_KEY = "BNG3CQ5jrYMWplp4jO9wCPKBHL5-chTTAMBm95RRyEf2ydM1QmlNqzRtryhsAxEHSUpizgnMfVZyEw3l6E6O9L0";

export const requestNotificationPermission = async () => {
  console.log('Requesting notification permission...');
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        await fcmService.saveToken(currentToken);
        console.log('FCM token saved to database.');
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }
};
