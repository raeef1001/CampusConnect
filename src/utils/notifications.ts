import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"; // Import doc and getDoc

interface NewNotification {
  userId: string;
  type: "listing" | "message" | "profile" | "system" | "bookmark" | "bid";
  message: string;
  relatedId?: string; // e.g., listingId, chatId, userId
  bidId?: string; // For bid-related notifications
}

export const addNotification = async (notification: NewNotification) => {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Notification timeout')), 5000); // 5 second timeout
    });

    // Fetch recipient's notification preferences with timeout
    let preferences: { [key: string]: boolean } = {};
    try {
      const userDocRef = doc(db, "users", notification.userId);
      const userDocSnap = await Promise.race([getDoc(userDocRef), timeoutPromise]) as any;
      
      if (userDocSnap && userDocSnap.exists && userDocSnap.exists()) {
        preferences = userDocSnap.data()?.preferences || {};
      }
    } catch (prefError) {
      console.warn("Could not fetch user preferences, using defaults:", prefError);
      // Continue with default preferences
    }

    // Determine if notification should be sent based on preferences
    let shouldSend = true;
    switch (notification.type) {
      case "message":
        shouldSend = preferences.messageNotifications ?? true;
        break;
      case "bookmark":
        shouldSend = preferences.bookmarkNotifications ?? true;
        break;
      case "system":
        shouldSend = preferences.systemNotifications ?? true;
        break;
      case "bid":
        shouldSend = preferences.bidNotifications ?? true;
        break;
      default:
        shouldSend = true;
        break;
    }

    if (shouldSend) {
      // Add notification with timeout
      await Promise.race([
        addDoc(collection(db, "notifications"), {
          ...notification,
          read: false,
          createdAt: serverTimestamp(),
        }),
        timeoutPromise
      ]);
      console.log("Notification added successfully for user:", notification.userId);
    } else {
      console.log(`Notification for user ${notification.userId} of type ${notification.type} skipped due to user preferences.`);
    }
  } catch (error) {
    console.error("Error adding notification:", error);
    // Don't throw the error to prevent it from breaking the calling function
  }
};
