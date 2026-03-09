

import admin from "./firebase.js";

export const sendNotification = async (token, title, body, data = {}) => {
  try {
    const response = await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: "APPLICATION_NOTIFICATION_CLICK",
      },
    });

    console.log("Notification Sent:", response);
    return { success: true, response };
  } catch (error) {
    console.error("FCM Error:", error);
    return { success: false, error };
  }
};
