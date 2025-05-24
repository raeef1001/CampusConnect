import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"; // Import doc and getDoc

interface NewNotification {
  userId: string;
  type: "listing" | "message" | "profile" | "system" | "bookmark";
  message: string;
  relatedId?: string; // e.g., listingId, chatId, userId
}

export const addNotification = async (notification: NewNotification) => {
  try {
    // Fetch recipient's notification preferences
    const userDocRef = doc(db, "users", notification.userId);
    const userDocSnap = await getDoc(userDocRef);
    let preferences: { [key: string]: boolean } = {};

    if (userDocSnap.exists()) {
      preferences = userDocSnap.data().preferences || {};
    }

    // Determine if notification should be sent based on preferences
    let shouldSend = true;
    switch (notification.type) {
      case "message":
        shouldSend = preferences.messageNotifications ?? true; // Default to true if not set
        break;
      case "bookmark":
        shouldSend = preferences.bookmarkNotifications ?? true; // Default to true if not set
        break;
      case "system":
        shouldSend = preferences.systemNotifications ?? true; // Default to true if not set
        break;
      // For other types, default to true or add specific preferences
      default:
        shouldSend = true;
        break;
    }

    if (shouldSend) {
      await addDoc(collection(db, "notifications"), {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
      console.log("Notification added successfully for user:", notification.userId);
    } else {
      console.log(`Notification for user ${notification.userId} of type ${notification.type} skipped due to user preferences.`);
    }
  } catch (error) {
    console.error("Error adding notification:", error);
    // In a real application, you might want to log this error to a monitoring service
  }
};
