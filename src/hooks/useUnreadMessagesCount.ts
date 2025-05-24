import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const useUnreadMessagesCount = () => {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "chats"),
          where(`participants.${user.uid}.hasUnreadMessages`, "==", true)
        );

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
          setUnreadMessagesCount(snapshot.size);
          setLoadingMessages(false);
        }, (error) => {
          console.error("Error fetching unread messages count: ", error);
          setUnreadMessagesCount(0);
          setLoadingMessages(false);
        });

        return () => unsubscribeMessages();
      } else {
        setUnreadMessagesCount(0);
        setLoadingMessages(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { unreadMessagesCount, loadingMessages };
};
