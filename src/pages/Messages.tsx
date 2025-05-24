import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { useLocation } from "react-router-dom";
import { auth, db, storage } from "@/lib/firebase"; // Import storage
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, Timestamp, FieldValue } from "firebase/firestore"; // Import Timestamp, FieldValue
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, MessageSquare, Image as ImageIcon, ShoppingCart, DollarSign } from "lucide-react"; // Import new icons
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User as FirebaseUser } from "firebase/auth";
import { addNotification } from "@/utils/notifications";
import { ListingCard } from "@/components/marketplace/ListingCard"; // Import ListingCard
import { Listing } from "@/types/listing"; // Assuming you have a Listing type
import { ListingSelector } from "@/components/marketplace/ListingSelector"; // Import ListingSelector

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  listingId?: string;
}

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  listingId?: string;
  orderId?: string;
  cartId?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp | FieldValue;
}

interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  university?: string; // Add university
  rating?: number; // Add rating
}

export default function Messages() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // Type as FirebaseUser
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [fetchedListings, setFetchedListings] = useState<{ [key: string]: Listing }>({}); // Store fetched listings
  const [isListingSelectorOpen, setIsListingSelectorOpen] = useState(false); // State for listing selector modal

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (imageFile: File) => {
    if (!currentUser) return null;
    const storageRef = ref(storage, `chat_images/${currentUser.uid}/${imageFile.name}_${Date.now()}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef); // This returns the URL, which will be stored as 'image'
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
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
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

      const unsubscribeMessages = onSnapshot(q, async (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(fetchedMessages);
        setLoadingMessages(false);
        scrollToBottom();

        // Fetch listing details for shared product cards
        const listingIdsToFetch = new Set<string>();
        fetchedMessages.forEach(message => {
          if (message.listingId && !fetchedListings[message.listingId]) {
            listingIdsToFetch.add(message.listingId);
          }
        });

        if (listingIdsToFetch.size > 0) {
          const newFetchedListings: { [key: string]: Listing } = { ...fetchedListings };
          for (const listingId of Array.from(listingIdsToFetch)) {
            const listingDocRef = doc(db, "listings", listingId);
            const listingDocSnap = await getDoc(listingDocRef);
            if (listingDocSnap.exists()) {
              const listingData = listingDocSnap.data();
              const sellerDocRef = doc(db, "users", listingData.sellerId);
              const sellerDocSnap = await getDoc(sellerDocRef);
              let sellerProfileData: UserProfile | null = null;
              if (sellerDocSnap.exists()) {
                sellerProfileData = { uid: sellerDocSnap.id, ...sellerDocSnap.data() } as UserProfile;
              } else {
                sellerProfileData = { uid: listingData.sellerId, name: "Unknown Seller", avatar: "/placeholder.svg", university: "N/A", rating: 0 };
              }

              newFetchedListings[listingId] = {
                id: listingDocSnap.id,
                title: listingData.title,
                description: listingData.description,
                price: String(listingData.price), // Convert price to string
                image: listingData.imageUrl, // Map imageUrl from Firestore to image
                sellerId: listingData.sellerId,
                category: listingData.category,
                condition: listingData.condition,
                location: listingData.location,
                createdAt: listingData.createdAt,
                updatedAt: listingData.updatedAt,
                seller: {
                  userId: sellerProfileData.uid,
                  name: sellerProfileData.name,
                  avatar: sellerProfileData.avatar,
                  university: sellerProfileData.university || "N/A",
                  rating: sellerProfileData.rating || 0,
                }
              } as Listing;
            }
          }
          setFetchedListings(newFetchedListings);
        }
      }, (error) => {
        console.error("Error fetching messages: ", error);
        setLoadingMessages(false);
      });

      return () => unsubscribeMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChat, fetchedListings]); // Added fetchedListings to dependencies

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && !selectedImage && !selectedListing) || !selectedChat || !currentUser) {
      return;
    }

    try {
      const messageData: Partial<Message> = { // Changed to const
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      if (newMessage.trim() !== "") {
        messageData.text = newMessage;
      }

      if (selectedImage) {
        const uploadedImageUrl = await uploadImage(selectedImage);
        if (uploadedImageUrl) {
          messageData.image = uploadedImageUrl; // Store as 'image'
        }
      }

      if (selectedListing) {
        messageData.listingId = selectedListing.id;
      }

      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messageData);

      // Update lastMessage and updatedAt in chat document
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: newMessage || (selectedImage ? "Image" : selectedListing ? "Product Card" : "Message"),
        updatedAt: serverTimestamp(),
      });

      // Create notification for the recipient
      const chatPartner = getChatPartner(selectedChat);
      if (chatPartner && currentUser) {
        await addNotification({
          userId: chatPartner.uid,
          type: "message",
          message: `New message from ${currentUser.displayName || currentUser.email?.split('@')[0]}`,
          relatedId: selectedChat.id,
        });
      }

      setNewMessage("");
      setSelectedImage(null);
      setSelectedListing(null);
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleShareListing = async (listing: Listing) => {
    setSelectedListing(listing);
    setNewMessage(`Check out this listing: ${listing.title}`);
    setIsListingSelectorOpen(false); // Close the selector after selecting
  };

  const handleAddToCart = async (listingId: string) => {
    if (!currentUser || !selectedChat) return;

    try {
      // Dummy add to cart logic
      await addDoc(collection(db, "users", currentUser.uid, "cart"), {
        listingId: listingId,
        addedAt: serverTimestamp(),
        quantity: 1, // Default quantity
      });

      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        senderId: currentUser.uid,
        text: `Added listing to cart: ${listingId}`,
        cartId: listingId, // Use listingId as a dummy cartId for now
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: "Added item to cart",
        updatedAt: serverTimestamp(),
      });

      alert("Item added to cart (dummy action)!");
      scrollToBottom();
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const handlePlaceOrder = async (listingId: string) => {
    if (!currentUser || !selectedChat) return;

    try {
      // Dummy payment processing
      const paymentSuccess = await handleDummyPayment();

      if (paymentSuccess) {
        // Dummy order creation
        const orderRef = await addDoc(collection(db, "orders"), {
          buyerId: currentUser.uid,
          listingId: listingId,
          orderDate: serverTimestamp(),
          status: "completed",
          totalAmount: 100, // Dummy amount
        });

        await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
          senderId: currentUser.uid,
          text: `Placed order for listing: ${listingId}`,
          orderId: orderRef.id,
          paymentStatus: "completed",
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "chats", selectedChat.id), {
          lastMessage: "Placed an order",
          updatedAt: serverTimestamp(),
        });

        alert("Order placed successfully (dummy action)!");
      } else {
        await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
          senderId: currentUser.uid,
          text: `Failed to place order for listing: ${listingId}`,
          paymentStatus: "failed",
          createdAt: serverTimestamp(),
        });
        alert("Payment failed (dummy action).");
      }
      scrollToBottom();
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  const handleDummyPayment = async (): Promise<boolean> => {
    // Simulate a payment process
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% chance of success
        resolve(success);
      }, 1500);
    });
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
                        <div key={`chat-skeleton-${i}`} className="flex items-center space-x-3">
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
                            <div key={`message-skeleton-${i}`} className={cn(
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
                              {message.text && <p>{message.text}</p>}
                              {message.image && (
                                <img src={message.image} alt="Shared" className="max-w-full h-auto rounded-md mt-2" />
                              )}
                              {message.listingId && fetchedListings[message.listingId] && (
                                <div className="mt-2 p-2 bg-white rounded-md shadow-sm">
                                  <p className="font-semibold">Shared Product:</p>
                                  <ListingCard {...fetchedListings[message.listingId]} /> {/* Destructure props */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 mr-2"
                                    onClick={() => handleAddToCart(message.listingId!)}
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => handlePlaceOrder(message.listingId!)}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" /> Place Order
                                  </Button>
                                </div>
                              )}
                              {message.orderId && (
                                <div className="mt-2 p-2 bg-white rounded-md shadow-sm">
                                  <p className="font-semibold">Order Placed:</p>
                                  <p className="text-sm text-gray-600">Order ID: {message.orderId}</p>
                                  <p className="text-sm text-gray-600">Status: {message.paymentStatus}</p>
                                </div>
                              )}
                              {message.cartId && (
                                <div className="mt-2 p-2 bg-white rounded-md shadow-sm">
                                  <p className="font-semibold">Item Added to Cart:</p>
                                  <p className="text-sm text-gray-600">Cart ID: {message.cartId}</p>
                                </div>
                              )}
                              <span className="block text-xs text-right mt-1 opacity-80">
                                {message.createdAt && (message.createdAt as Timestamp).seconds ? new Date((message.createdAt as Timestamp).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid Date'}
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
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        className="hidden"
                        accept="image/*"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      {selectedImage && (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <img src={URL.createObjectURL(selectedImage)} alt="Selected" className="h-8 w-8 object-cover rounded" />
                          <span className="text-sm">{selectedImage.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)}>x</Button>
                        </div>
                      )}
                      {selectedListing && (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <span className="text-sm">Sharing: {selectedListing.title}</span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedListing(null)}>x</Button>
                        </div>
                      )}
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
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsListingSelectorOpen(true)} // Open the listing selector
                        className="shrink-0"
                      >
                        <ShoppingCart className="h-5 w-5" />
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

      {currentUser && (
        <ListingSelector
          isOpen={isListingSelectorOpen}
          onClose={() => setIsListingSelectorOpen(false)}
          onSelectListing={handleShareListing}
          currentUserId={currentUser.uid}
        />
      )}
    </div>
  );
}
