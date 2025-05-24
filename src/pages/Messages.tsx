import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { useLocation } from "react-router-dom"; // Import useLocation
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from "firebase/firestore"; // Import doc, getDoc, updateDoc
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User as FirebaseUser } from "firebase/auth"; // Import Firebase User type

interface Chat {
  id: string;
  participants: string[]; // Array of user UIDs
  lastMessage?: string;
  createdAt: { // Add createdAt to Chat interface
    seconds: number;
    nanoseconds: number;
  };
  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  listingId?: string; // Add listingId to Chat interface
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
}

export default function Messages() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // Type as FirebaseUser
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({}); // Store fetched user profiles

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoadingChats(true);

        // Fetch user profiles for participants
        const fetchUserProfiles = async (uids: string[]) => {
          const profiles: { [key: string]: UserProfile } = { ...userProfiles };
          for (const uid of uids) {
            if (!profiles[uid]) {
              const userDocRef = doc(db, "users", uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                profiles[uid] = { uid, ...userDocSnap.data() } as UserProfile;
              } else {
                profiles[uid] = { uid, name: "Unknown User", avatar: "/placeholder.svg" };
              }
            }
          }
          setUserProfiles(profiles);
        };

        // Fetch chats for the current user
        const q = query(
          collection(db, "chats"),
          where("participants", "array-contains", user.uid),
          orderBy("updatedAt", "desc")
        );

        const unsubscribeChats = onSnapshot(q, async (snapshot) => {
          const fetchedChats: Chat[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Chat));
          setChats(fetchedChats);
          setLoadingChats(false);

          // Extract all participant UIDs from fetched chats
          const allParticipantUids = new Set<string>();
          fetchedChats.forEach(chat => {
            chat.participants.forEach(uid => allParticipantUids.add(uid));
          });
          await fetchUserProfiles(Array.from(allParticipantUids));

          // Handle direct message initiation from ListingCard/Details
          const { sellerId, listingId } = location.state || {};
          if (sellerId && listingId && user.uid !== sellerId) {
            const existingChat = fetchedChats.find(chat =>
              chat.participants.includes(sellerId) && chat.participants.includes(user.uid)
            );

            if (existingChat) {
              setSelectedChat(existingChat);
            } else {
              // Create new chat
              const newChatRef = await addDoc(collection(db, "chats"), {
                participants: [user.uid, sellerId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                listingId: listingId, // Associate chat with a listing
              });
              const newChat: Chat = {
                id: newChatRef.id,
                participants: [user.uid, sellerId],
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
              };
              setChats(prev => [newChat, ...prev]);
              setSelectedChat(newChat);
            }
            // Clear state to prevent re-creation on subsequent visits
            window.history.replaceState({}, document.title); 
          } else if (!selectedChat && fetchedChats.length > 0) {
            // If no specific chat requested, select the most recent one
            setSelectedChat(fetchedChats[0]);
          }
        }, (error) => {
          console.error("Error fetching chats: ", error);
          setLoadingChats(false);
        });

        return () => unsubscribeChats();
      } else {
        setCurrentUser(null);
        setLoadingChats(false);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
      }
    });

    return () => unsubscribeAuth();
  }, [location.state, selectedChat]); // Added selectedChat to dependencies

  useEffect(() => {
    if (selectedChat) {
      setLoadingMessages(true);
      const q = query(
        collection(db, "chats", selectedChat.id, "messages"),
        orderBy("createdAt", "asc")
      );

      const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(fetchedMessages);
        setLoadingMessages(false);
        scrollToBottom();
      }, (error) => {
        console.error("Error fetching messages: ", error);
        setLoadingMessages(false);
      });

      return () => unsubscribeMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !selectedChat || !currentUser) return;

    try {
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        senderId: currentUser.uid,
        text: newMessage,
        createdAt: serverTimestamp(),
      });
      // Update lastMessage and updatedAt in chat document
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
      });

      // Create notification for the recipient
      const chatPartner = getChatPartner(selectedChat);
      if (chatPartner && currentUser) {
        await addDoc(collection(db, "notifications"), {
          userId: chatPartner.uid,
          type: "message",
          message: `New message from ${currentUser.displayName || currentUser.email?.split('@')[0]}`,
          read: false,
          createdAt: serverTimestamp(),
          relatedId: selectedChat.id, // Link to the chat
        });
      }
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getChatPartner = (chat: Chat) => {
    const partnerUid = chat.participants.find(uid => uid !== currentUser?.uid);
    return partnerUid ? userProfiles[partnerUid] : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto flex h-[calc(100vh-120px)] bg-white rounded-lg shadow-md overflow-hidden">
              {/* Chat List Sidebar */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold">Conversations</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingChats ? (
                    <div className="p-4 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : chats.length > 0 ? (
                    chats.map((chat) => {
                      const partner = getChatPartner(chat);
                      return (
                        <div 
                          key={chat.id} 
                          className={cn(
                            "flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50",
                            selectedChat?.id === chat.id ? "bg-gray-100" : ""
                          )}
                          onClick={() => setSelectedChat(chat)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={partner?.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{partner?.name.split(' ').map(n => n[0]).join('') || <User className="h-5 w-5 text-gray-500" />}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3 flex-1">
                            <p className="font-medium">{partner?.name || "Unknown User"}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {chat.lastMessage || "No messages yet."}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p>No conversations yet.</p>
                      <p className="text-sm">Contact a seller to start one!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b border-gray-200 flex items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getChatPartner(selectedChat)?.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{getChatPartner(selectedChat)?.name.split(' ').map(n => n[0]).join('') || <User className="h-5 w-5 text-gray-500" />}</AvatarFallback>
                      </Avatar>
                      <h2 className="text-xl font-semibold ml-3">
                        {getChatPartner(selectedChat)?.name || "Unknown User"}
                      </h2>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                      {loadingMessages ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={cn(
                              "flex",
                              i % 2 === 0 ? "justify-start" : "justify-end"
                            )}>
                              <Skeleton className="h-10 w-1/2 rounded-lg" />
                            </div>
                          ))}
                        </div>
                      ) : messages.length > 0 ? (
                        messages.map((message) => (
                          <div 
                            key={message.id} 
                            className={cn(
                              "flex",
                              message.senderId === currentUser?.uid ? "justify-end" : "justify-start"
                            )}
                          >
                            <div className={cn(
                              "max-w-[70%] p-3 rounded-lg",
                              message.senderId === currentUser?.uid 
                                ? "bg-primary-warm text-white rounded-br-none" 
                                : "bg-gray-200 text-gray-800 rounded-bl-none"
                            )}>
                              <p>{message.text}</p>
                              <span className="block text-xs text-right mt-1 opacity-80">
                                {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 mt-10">
                          <p>No messages in this conversation yet.</p>
                          <p className="text-sm">Say hello!</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-white flex items-center space-x-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleSendMessage();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Select a conversation or contact a seller to start a new one.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
