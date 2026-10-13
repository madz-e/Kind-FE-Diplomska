import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;

  if (!granted && current.canAskAgain) {
    const next = await Notifications.requestPermissionsAsync();
    granted = next.granted;
  }

  if (!granted) {
    return null; // user said no — nothing we can do
  }

  // Step B: actually fetch the token
  // Hint: the function is called getExpoPushTokenAsync(), and needs a
  // "projectId" — found at Constants.expoConfig.extra.eas.projectId
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  });

  return tokenResponse.data; // this is the actual token string
}