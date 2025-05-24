import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const useUnreadNotificationsCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("read", "==", false)
        );

        const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.size);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching unread notifications count: ", error);
          setUnreadCount(0);
          setLoading(false);
        });

        return () => unsubscribeNotifications();
      } else {
        setUnreadCount(0);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { unreadCount, loading };
};
