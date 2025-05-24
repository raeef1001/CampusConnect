import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Link, useLocation, useParams } from "react-router-dom";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, Timestamp, FieldValue } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, MessageSquare, Image as ImageIcon, ShoppingCart, DollarSign, X } from "lucide-react"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User as FirebaseUser } from "firebase/auth";
import { addNotification } from "@/utils/notifications"; 
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Listing } from "@/types/listing"; 
import { ListingSelector } from "@/components/marketplace/ListingSelector";
import { useToast } from "@/hooks/use-toast";

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
  university?: string;
  rating?: number;
}

export default function Messages() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [fetchedListings, setFetchedListings] = useState<{ [key: string]: Listing }>({});
  const [isListingSelectorOpen, setIsListingSelectorOpen] = useState(false);

  const { toast } = useToast();

  const location = useLocation();
  const { chatId } = useParams<{ chatId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setSelectedListing(null);
    } else {
      console.log("No image selected.");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoadingChats(true);

        const fetchUserProfiles = async (uids: string[]) => {
          const profilesToFetch = uids.filter(uid => !userProfiles[uid]);
          if (profilesToFetch.length === 0) return;

          const newProfiles: { [key: string]: UserProfile } = {};
          for (const uid of profilesToFetch) {
            const userDocRef = doc(db, "users", uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              newProfiles[uid] = { uid, ...userDocSnap.data() } as UserProfile;
            } else {
              newProfiles[uid] = { uid, name: "Unknown User", avatar: "/placeholder.svg" };
            }
          }
          setUserProfiles(prev => ({ ...prev, ...newProfiles }));
        };

        const q = query(
          collection(db, "chats"),
          where("participants", "array-contains", user.uid),
          orderBy("updatedAt", "desc")
        );

        const unsubscribeChats = onSnapshot(q, async (snapshot) => {
          const fetchedChats: Chat[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as Chat));
          setChats(fetchedChats);
          setLoadingChats(false);

          const allParticipantUids = new Set<string>();
          fetchedChats.forEach(chat => chat.participants.forEach(uid => allParticipantUids.add(uid)));
          await fetchUserProfiles(Array.from(allParticipantUids));

          const { sellerId, listingId: initialListingId } = location.state || {};
          let chatToSelect: Chat | null = null;

          if (chatId) {
            chatToSelect = fetchedChats.find(c => c.id === chatId) || null;
          } else if (sellerId && initialListingId && user.uid !== sellerId) {
            const existingChat = fetchedChats.find(c =>
              c.participants.includes(sellerId) && c.participants.includes(user.uid)
            );

            if (existingChat) {
              chatToSelect = existingChat;
            } else {
              const newChatRef = await addDoc(collection(db, "chats"), {
                participants: [user.uid, sellerId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                listingId: initialListingId,
              });
              const newChatData = {
                id: newChatRef.id,
                participants: [user.uid, sellerId],
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(), 
                listingId: initialListingId,
              };
              chatToSelect = newChatData as Chat;
              setChats(prev => {
                const isExisting = prev.find(c => c.id === newChatRef.id);
                return isExisting ? prev : [chatToSelect!, ...prev];
              });
            }
            window.history.replaceState({}, document.title);
          }

          if (chatToSelect) {
            if (selectedChat?.id !== chatToSelect.id) {
                setSelectedChat(chatToSelect);
            }
          } else if (!selectedChat && fetchedChats.length > 0) {
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
        setUserProfiles({});
      }
    });
    return () => unsubscribeAuth();
  }, [location.state, chatId]); 


  useEffect(() => {
    if (selectedChat) {
      setLoadingMessages(true);
      const q = query(
        collection(db, "chats", selectedChat.id, "messages"),
        orderBy("createdAt", "asc")
      );

      const unsubscribeMessages = onSnapshot(q, async (snapshot) => {
        const newMessages: Message[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Message));
        setMessages(newMessages);
        setLoadingMessages(false);
        scrollToBottom();

        const listingIdsInMessagesToFetch = new Set<string>();
        newMessages.forEach(message => {
          if (message.listingId && !fetchedListings[message.listingId]) {
            listingIdsInMessagesToFetch.add(message.listingId);
          }
        });

        if (listingIdsInMessagesToFetch.size > 0) {
          const newlyFetchedListingsMap: { [key: string]: Listing } = {};
          for (const listingId of Array.from(listingIdsInMessagesToFetch)) {
            if (fetchedListings[listingId]) continue;

            const listingDocRef = doc(db, "listings", listingId);
            const listingDocSnap = await getDoc(listingDocRef);
            if (listingDocSnap.exists()) {
              const listingData = listingDocSnap.data();
              const sellerUidForProfile = listingData.sellerId || listingData.userId; 
              
              let sellerProfileData: UserProfile;
              if (userProfiles[sellerUidForProfile]) {
                sellerProfileData = userProfiles[sellerUidForProfile];
              } else {
                const sellerDocRef = doc(db, "users", sellerUidForProfile);
                const sellerDocSnap = await getDoc(sellerDocRef);
                if (sellerDocSnap.exists()) {
                  sellerProfileData = { uid: sellerDocSnap.id, ...sellerDocSnap.data() } as UserProfile;
                  setUserProfiles(prev => ({...prev, [sellerUidForProfile]: sellerProfileData}));
                } else {
                  sellerProfileData = { uid: sellerUidForProfile, name: "Unknown Seller", avatar: "/placeholder.svg", university: "N/A", rating: 0 };
                }
              }

              newlyFetchedListingsMap[listingId] = {
                id: listingDocSnap.id,
                title: listingData.title,
                description: listingData.description,
                price: String(listingData.price),
                image: listingData.imageUrl, 
                sellerId: sellerUidForProfile, 
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
          if (Object.keys(newlyFetchedListingsMap).length > 0) {
            setFetchedListings(prev => ({ ...prev, ...newlyFetchedListingsMap }));
          }
        }
      }, (error) => {
        console.error("Error fetching messages: ", error);
        setLoadingMessages(false);
      });
      return () => unsubscribeMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChat, userProfiles]);

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && !selectedImage && !selectedListing) || !selectedChat || !currentUser) {
      return;
    }

    try {
      const messagePayload: Partial<Omit<Message, 'id' | 'createdAt'>> & { createdAt: FieldValue } = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      if (newMessage.trim() !== "") {
        messagePayload.text = newMessage;
      }

      if (selectedImage) {
        try {
          const base64Image = await fileToBase64(selectedImage);
          messagePayload.image = base64Image;
        } catch (error) {
          console.error("Error converting image to Base64:", error);
          toast({
            title: "Image conversion failed",
            description: "Could not convert image to Base64. Please try again.",
            variant: "destructive",
          });
          return; // Stop sending message if image conversion fails
        }
      }

      if (selectedListing) {
        messagePayload.listingId = selectedListing.id;
      }

      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messagePayload);

      let lastMessageText = "Message";
        if (selectedListing) {
            lastMessageText = `Shared: ${selectedListing.title}`;
        } else if (selectedImage) {
            lastMessageText = "Sent an image";
        } else if (newMessage.trim()) {
            lastMessageText = newMessage.trim();
        }
      
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: lastMessageText,
        updatedAt: serverTimestamp(),
      });

      const chatPartner = getChatPartner(selectedChat);
      if (chatPartner && currentUser) {
        await addNotification({
          userId: chatPartner.uid,
          type: "message",
          message: `New message from ${currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}`,
          relatedId: selectedChat.id,
        });
      }

      setNewMessage("");
      setSelectedImage(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      setSelectedListing(null);
      toast({
        title: "Message sent!",
        description: "Your message has been successfully sent.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareListing = (listing: Listing) => {
    setSelectedListing(listing);
    setNewMessage(`Check out: ${listing.title}`);
    setSelectedImage(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsListingSelectorOpen(false);
  };

  // These handlers are kept for potential future use or if ListingCard itself has these actions.
  // For now, the buttons rendered by Messages.tsx for shared listings will be removed.
  const handleAddToCart = async (listingId: string) => {
    if (!currentUser || !listingId) return;
    console.log("Add to cart:", listingId);
    alert(`Item with ID ${listingId} added to cart (dummy action)!`);
    // Add actual cart logic if needed
  };

  const handlePlaceOrder = async (listingId: string) => {
    if (!currentUser || !listingId) return;
    console.log("Place order for:", listingId);
    alert(`Order placed for item ID ${listingId} (dummy action)!`);
    // Add actual order logic if needed
  };

  const getChatPartner = (chat: Chat | null): UserProfile | null => {
    if (!chat || !currentUser) return null;
    const partnerUid = chat.participants.find(uid => uid !== currentUser.uid);
    return partnerUid ? userProfiles[partnerUid] : null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isAuthenticated={!!currentUser} />
      
      <div className="flex h-[calc(100vh-var(--navbar-height,64px))]">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-7xl mx-auto flex h-full bg-card rounded-lg shadow-lg overflow-hidden border">
              <div className={cn(
                "w-full md:w-[300px] lg:w-[350px] border-r flex flex-col transition-all duration-300 ease-in-out",
                selectedChat && "hidden md:flex" 
              )}>
                <div className="p-4 border-b">
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
                            "flex items-center p-3 md:p-4 border-b border-border cursor-pointer hover:bg-muted/50",
                            selectedChat?.id === chat.id ? "bg-muted" : ""
                          )}
                          onClick={() => setSelectedChat(chat)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={partner?.avatar || "/placeholder.svg"} alt={partner?.name || "User"} />
                            <AvatarFallback>{partner?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || <User className="h-5 w-5" />}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="font-medium truncate">{partner?.name || "Unknown User"}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {chat.lastMessage || "No messages yet."}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                      <MessageSquare className="h-12 w-12 text-border mb-3" />
                      <p>No conversations yet.</p>
                      <p className="text-sm">Contact a seller to start one!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn(
                "flex-1 flex-col",
                !selectedChat && "hidden md:flex",
                selectedChat && "flex" 
              )}>
                {selectedChat && currentUser ? (
                  <>
                    <div className="p-3 md:p-4 border-b flex items-center">
                       <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSelectedChat(null)}>
                          <Send className="h-5 w-5 rotate-180" /> 
                       </Button>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getChatPartner(selectedChat)?.avatar || "/placeholder.svg"} alt={getChatPartner(selectedChat)?.name || "User"}/>
                        <AvatarFallback>{getChatPartner(selectedChat)?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || <User className="h-5 w-5" />}</AvatarFallback>
                      </Avatar>
                      <h2 className="text-lg md:text-xl font-semibold ml-3">
                        {getChatPartner(selectedChat)?.name || "Unknown User"}
                      </h2>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/30">
                      {loadingMessages ? (
                         <div className="space-y-4">
                         {[...Array(8)].map((_, i) => (
                           <div key={`message-skeleton-${i}`} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                             <Skeleton className={cn("h-10 rounded-lg", i % 3 === 0 ? "w-1/3" : i % 3 === 1 ? "w-1/2" : "w-2/5" )} />
                           </div>
                         ))}
                       </div>
                      ) : messages.length > 0 ? (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn("flex", message.senderId === currentUser.uid ? "justify-end" : "justify-start")}
                          >
                            <div className={cn(
                              "max-w-[80%] md:max-w-[70%] p-3 rounded-lg shadow-sm",
                              message.senderId === currentUser.uid
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-card border rounded-bl-none"
                            )}>
                              {message.text && <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.text}</p>}
                              {message.image && (
                                <img src={message.image} alt="Shared content" className="max-w-full h-auto rounded-md mt-2 cursor-pointer object-contain max-h-64" onClick={() => window.open(message.image, '_blank')} />
                              )}
                              {message.listingId && fetchedListings[message.listingId] && (
                                <div className="mt-2 p-2 bg-background rounded-md border">
                                  <p className="font-semibold mb-1 text-xs md:text-sm">Shared Product:</p>
                                  <Link 
                                    to={`/product/${message.listingId}`}
                                    className="block hover:bg-muted/30 p-1 rounded-md transition-colors -m-1"
                                    aria-label={`View details for ${fetchedListings[message.listingId].title}`}
                                  >
                                    <ListingCard {...fetchedListings[message.listingId]} />
                                  </Link>
                                  {/* ***** MODIFICATION: Removed Add to Cart and Place Order buttons from here ***** */}
                                </div>
                              )}
                              <span className="block text-xs text-right mt-1 opacity-70">
                                {message.createdAt && (message.createdAt as Timestamp).seconds 
                                  ? new Date((message.createdAt as Timestamp).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                  : 'Sending...'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                          <MessageSquare className="h-12 w-12 text-border mb-3"/>
                          <p>No messages in this conversation yet.</p>
                          <p className="text-sm">Say hello!</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-2 md:p-4 border-t bg-card flex items-center space-x-2">
                      <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
                      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0" title="Send Image">
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setIsListingSelectorOpen(true)} className="shrink-0" title="Share Listing">
                        <ShoppingCart className="h-5 w-5" />
                      </Button>
                      
                      {selectedImage && (
                        <div className="flex items-center space-x-1 p-1.5 border rounded-md text-xs bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[80px] md:max-w-[100px]">{selectedImage.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => {setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = "";}}
                            aria-label="Remove selected image"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {selectedListing && (
                        <div className="flex items-center space-x-1 p-1.5 border rounded-md text-xs bg-muted">
                           <ShoppingCart className="h-4 w-4 text-muted-foreground"/>
                          <span className="truncate max-w-[80px] md:max-w-[120px]">Sharing: {selectedListing.title}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedListing(null)}
                            aria-label="Remove selected listing"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        className="flex-1 text-sm md:text-base"
                        disabled={!selectedChat || !currentUser}
                      />
                      <Button onClick={handleSendMessage} disabled={!selectedChat || !currentUser || (newMessage.trim() === "" && !selectedImage && !selectedListing)}>
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <MessageSquare className="h-16 w-16 text-border mb-4" />
                    <p className="text-lg">Select a conversation to start chatting.</p>
                    <p className="text-sm">Or, find a product and contact the seller!</p>
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