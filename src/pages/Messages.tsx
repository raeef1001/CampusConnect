import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Link, useLocation, useParams } from "react-router-dom";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, Timestamp, FieldValue } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { 
  encryptMessage, 
  decryptMessage, 
  encryptImage, 
  decryptImage, 
  getOtherParticipant, 
  isEncryptionSupported 
} from "@/utils/encryption";

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  listingId?: string; 
  // Encryption field for last message
  encryptedLastMessage?: string;
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
  // Encryption fields
  encrypted?: boolean;
  encryptedText?: string;
  encryptedImage?: string;
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
  const [decryptedMessages, setDecryptedMessages] = useState<{ [key: string]: { text?: string; image?: string } }>({});
  const [decryptedLastMessages, setDecryptedLastMessages] = useState<{ [key: string]: string }>({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [fetchedListings, setFetchedListings] = useState<{ [key: string]: Listing }>({});
  const [isListingSelectorOpen, setIsListingSelectorOpen] = useState(false);
  const [shouldSendMessage, setShouldSendMessage] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  const { toast } = useToast();

  const location = useLocation();
  const { chatId } = useParams<{ chatId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMessageRef = useRef<string | null>(null);

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

  const uploadImage = async (imageFile: File) => {
    if (!currentUser) return null;
    const storageRef = ref(storage, `chat_images/${currentUser.uid}/${imageFile.name}_${Date.now()}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Decrypt messages when they are loaded
  const decryptMessagesAsync = async (messages: Message[], currentUserUid: string, chatParticipants: string[]) => {
    if (!isEncryptionSupported()) return;

    const otherParticipant = getOtherParticipant(chatParticipants, currentUserUid);
    if (!otherParticipant) return;

    const newDecryptedMessages: { [key: string]: { text?: string; image?: string } } = {};

    for (const message of messages) {
      if (message.encrypted) {
        try {
          // For decryption, determine the correct recipient based on who is NOT the sender
          const recipientUid = message.senderId === currentUserUid ? otherParticipant : currentUserUid;
          
          if (message.encryptedText) {
            const decryptedText = await decryptMessage(message.encryptedText, message.senderId, recipientUid);
            newDecryptedMessages[message.id] = { 
              ...newDecryptedMessages[message.id], 
              text: decryptedText 
            };
          }
          if (message.encryptedImage) {
            const decryptedImage = await decryptImage(message.encryptedImage, message.senderId, recipientUid);
            newDecryptedMessages[message.id] = { 
              ...newDecryptedMessages[message.id], 
              image: decryptedImage 
            };
          }
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          // Set fallback text for failed decryption
          newDecryptedMessages[message.id] = { 
            ...newDecryptedMessages[message.id], 
            text: message.encryptedText ? '[Message could not be decrypted]' : undefined,
            image: message.encryptedImage ? '/placeholder.svg' : undefined
          };
        }
      }
    }

    setDecryptedMessages(prev => ({ ...prev, ...newDecryptedMessages }));
  };

  // Decrypt last messages for chat list
  const decryptLastMessagesAsync = async (chats: Chat[], currentUserUid: string) => {
    if (!isEncryptionSupported()) return;

    const newDecryptedLastMessages: { [key: string]: string } = {};

    for (const chat of chats) {
      if (chat.encryptedLastMessage) {
        try {
          const otherParticipant = getOtherParticipant(chat.participants, currentUserUid);
          if (!otherParticipant) continue;

          // For last messages, we need to determine who sent it
          // Since we don't have the sender info in the chat object, we'll try both possibilities
          let decryptedText: string | null = null;
          
          // Try decrypting assuming current user sent it (recipient is other participant)
          try {
            decryptedText = await decryptMessage(chat.encryptedLastMessage, currentUserUid, otherParticipant);
          } catch {
            // If that fails, try assuming other participant sent it (recipient is current user)
            try {
              decryptedText = await decryptMessage(chat.encryptedLastMessage, otherParticipant, currentUserUid);
            } catch {
              decryptedText = '[Message could not be decrypted]';
            }
          }

          if (decryptedText) {
            newDecryptedLastMessages[chat.id] = decryptedText;
          }
        } catch (error) {
          console.error('Failed to decrypt last message:', error);
          newDecryptedLastMessages[chat.id] = '[Message could not be decrypted]';
        }
      }
    }

    setDecryptedLastMessages(prev => ({ ...prev, ...newDecryptedLastMessages }));
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

          // Decrypt last messages for chat list
          if (user) {
            await decryptLastMessagesAsync(fetchedChats, user.uid);
          }

          const { sellerId, listingId: initialListingId, initialMessage } = location.state || {};
          let chatToSelect: Chat | null = null;
          
          // Store initial message in ref if present and not already set
          if (initialMessage && initialMessageRef.current === null) {
            initialMessageRef.current = initialMessage;
            setNewMessage(initialMessage); // Set newMessage immediately
          }
          window.history.replaceState({}, document.title); // Clear state immediately

          if (chatId) {
            chatToSelect = fetchedChats.find(c => c.id === chatId) || null;
          } else if (sellerId && initialListingId && user.uid !== sellerId) {
            // Fetch the listing details if initialListingId is present
            if (initialListingId) {
              try {
                const listingDocRef = doc(db, "listings", initialListingId);
                const listingDocSnap = await getDoc(listingDocRef);
                if (listingDocSnap.exists()) {
                  const listingData = listingDocSnap.data();
                  // Construct a minimal Listing object for selectedListing state
                  setSelectedListing({
                    id: listingDocSnap.id,
                    title: listingData.title,
                    description: listingData.description,
                    price: String(listingData.price),
                    imageUrl: listingData.imageUrl,
                    sellerId: listingData.sellerId || listingData.userId,
                    category: listingData.category,
                    condition: listingData.condition,
                    location: listingData.location,
                    createdAt: listingData.createdAt,
                    updatedAt: listingData.updatedAt,
                    seller: listingData.seller // Assuming seller object is directly available or can be fetched
                  } as Listing);
                }
              } catch (error) {
                console.error("Error fetching initial listing for chat:", error);
              }
            }

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
                ...(initialListingId && { listingId: initialListingId }),
              });
              const newChatData = {
                id: newChatRef.id,
                participants: [user.uid, sellerId],
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(), 
                ...(initialListingId && { listingId: initialListingId }),
              };
              chatToSelect = newChatData as Chat;
              setChats(prev => {
                const isExisting = prev.find(c => c.id === newChatRef.id);
                return isExisting ? prev : [chatToSelect!, ...prev];
              });
            }
            // Set shouldSendMessage to true if initialMessage was present
            if (initialMessage) {
              setShouldSendMessage(true);
            }
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

  // Modified useEffect to trigger message sending only once
  useEffect(() => {
    if (selectedChat && currentUser && initialMessageRef.current && shouldSendMessage && !initialMessageSent) {
      // Ensure newMessage is still the initial message before sending
      if (newMessage === initialMessageRef.current) {
        handleSendMessage();
        setInitialMessageSent(true); // Mark as sent
        setShouldSendMessage(false); // Prevent further automatic sending
      }
      initialMessageRef.current = null; // Clear the ref after sending
    }
  }, [selectedChat, currentUser, shouldSendMessage, initialMessageSent, newMessage]);

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

        // Decrypt messages if current user is available
        if (currentUser) {
          await decryptMessagesAsync(newMessages, currentUser.uid, selectedChat.participants);
        }

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
  }, [selectedChat, userProfiles, currentUser]);

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && !selectedImage && !selectedListing) || !selectedChat || !currentUser) {
      return;
    }

    try {
      const otherParticipant = getOtherParticipant(selectedChat.participants, currentUser.uid);
      if (!otherParticipant) {
        toast({
          title: "Error",
          description: "Could not find chat partner.",
          variant: "destructive",
        });
        return;
      }

      const messagePayload: Partial<Omit<Message, 'id' | 'createdAt'>> & { createdAt: FieldValue } = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        encrypted: isEncryptionSupported(),
      };

      let lastMessageText = "Message";

      // Handle text encryption
      if (newMessage.trim() !== "") {
        if (isEncryptionSupported()) {
          try {
            const encryptedText = await encryptMessage(newMessage.trim(), currentUser.uid, otherParticipant);
            messagePayload.encryptedText = encryptedText;
            lastMessageText = "Encrypted message";
          } catch (error) {
            console.error("Text encryption failed:", error);
            // Fallback to unencrypted
            messagePayload.text = newMessage.trim();
            messagePayload.encrypted = false;
            lastMessageText = newMessage.trim();
          }
        } else {
          messagePayload.text = newMessage.trim();
          messagePayload.encrypted = false;
          lastMessageText = newMessage.trim();
        }
      }

      // Handle image encryption
      if (selectedImage) {
        try {
          const base64Image = await fileToBase64(selectedImage);
          
          if (isEncryptionSupported()) {
            try {
              const encryptedImage = await encryptImage(base64Image, currentUser.uid, otherParticipant);
              messagePayload.encryptedImage = encryptedImage;
              lastMessageText = "Sent an encrypted image";
            } catch (error) {
              console.error("Image encryption failed:", error);
              // Fallback to unencrypted
              messagePayload.image = base64Image;
              messagePayload.encrypted = false;
              lastMessageText = "Sent an image";
            }
          } else {
            messagePayload.image = base64Image;
            messagePayload.encrypted = false;
            lastMessageText = "Sent an image";
          }
        } catch (error) {
          console.error("Error converting image to Base64:", error);
          toast({
            title: "Image conversion failed",
            description: "Could not convert image to Base64. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      if (selectedListing) {
        messagePayload.listingId = selectedListing.id;
        lastMessageText = `Shared: ${selectedListing.title}`;
      }

      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messagePayload);

      // Update chat with encrypted last message if encryption is supported
      interface ChatUpdateData {
        updatedAt: FieldValue;
        lastMessage?: string;
        encryptedLastMessage?: string;
        [key: string]: any; // Add index signature
      }
      const chatUpdateData: ChatUpdateData = {
        updatedAt: serverTimestamp(),
      };

      if (isEncryptionSupported() && lastMessageText !== `Shared: ${selectedListing?.title}`) {
        try {
          const encryptedLastMessage = await encryptMessage(lastMessageText, currentUser.uid, otherParticipant);
          chatUpdateData.encryptedLastMessage = encryptedLastMessage;
          chatUpdateData.lastMessage = "Encrypted message";
        } catch (error) {
          console.error("Failed to encrypt last message:", error);
          chatUpdateData.lastMessage = lastMessageText;
        }
      } else {
        chatUpdateData.lastMessage = lastMessageText;
      }

      await updateDoc(doc(db, "chats", selectedChat.id), chatUpdateData);

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
        description: isEncryptionSupported() ? "Your encrypted message has been sent." : "Your message has been sent.",
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
  };

  const handlePlaceOrder = async (listingId: string) => {
    if (!currentUser || !listingId) return;
    console.log("Place order for:", listingId);
    alert(`Order placed for item ID ${listingId} (dummy action)!`);
  };

  const getChatPartner = (chat: Chat | null): UserProfile | null => {
    if (!chat || !currentUser) return null;
    const partnerUid = chat.participants.find(uid => uid !== currentUser.uid);
    return partnerUid ? userProfiles[partnerUid] : null;
  };

  // Get display text for message (decrypted if available, fallback to original)
  const getMessageText = (message: Message): string | undefined => {
    if (message.encrypted && decryptedMessages[message.id]?.text) {
      return decryptedMessages[message.id].text;
    }
    return message.text;
  };

  // Get display image for message (decrypted if available, fallback to original)
  const getMessageImage = (message: Message): string | undefined => {
    if (message.encrypted && decryptedMessages[message.id]?.image) {
      return decryptedMessages[message.id].image;
    }
    return message.image;
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
                  {isEncryptionSupported() && (
                    <p className="text-xs text-muted-foreground mt-1">🔒 End-to-end encrypted</p>
                  )}
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
                              {decryptedLastMessages[chat.id] || chat.lastMessage || "No messages yet."}
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
                      <div className="ml-3 flex-1">
                        <h2 className="text-lg md:text-xl font-semibold">
                          {getChatPartner(selectedChat)?.name || "Unknown User"}
                        </h2>
                        {isEncryptionSupported() && (
                          <p className="text-xs text-muted-foreground">🔒 Messages are encrypted</p>
                        )}
                      </div>
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
                        messages.map((message) => {
                          const displayText = getMessageText(message);
                          const displayImage = getMessageImage(message);
                          
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex",
                                message.senderId === currentUser.uid ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-lg p-3 space-y-2",
                                  message.senderId === currentUser.uid
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                {displayText && (
                                  <p className="text-sm break-words">{displayText}</p>
                                )}
                                {displayImage && (
                                  <img
                                    src={displayImage}
                                    alt="Shared image"
                                    className="max-w-full h-auto rounded-md"
                                  />
                                )}
                                {message.listingId && fetchedListings[message.listingId] && (
                                  <div className="border rounded-lg p-3 bg-background/50">
                                    <ListingCard
                                      id={fetchedListings[message.listingId].id}
                                      title={fetchedListings[message.listingId].title}
                                      price={fetchedListings[message.listingId].price}
                                      condition={fetchedListings[message.listingId].condition}
                                      description={fetchedListings[message.listingId].description}
                                      image={fetchedListings[message.listingId].image}
                                      seller={fetchedListings[message.listingId].seller}
                                      category={fetchedListings[message.listingId].category}
                                      listingUserId={fetchedListings[message.listingId].sellerId}
                                    />
                                  </div>
                                )}
                                <p className="text-xs opacity-70">
                                  {message.createdAt && typeof message.createdAt === 'object' && 'toDate' in message.createdAt
                                    ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Sending...'}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-border" />
                            <p>No messages yet.</p>
                            <p className="text-sm">Start the conversation!</p>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Message Input Area */}
                    <div className="p-4 border-t bg-background">
                      {selectedImage && (
                        <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm flex-1">{selectedImage.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedImage(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {selectedListing && (
                        <div className="mb-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Sharing listing:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedListing(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedListing.title} - ${selectedListing.price}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="flex gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            ref={fileInputRef}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!!selectedListing}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsListingSelectorOpen(true)}
                            disabled={!!selectedImage}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          
                          <Button onClick={handleSendMessage} size="icon">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-border" />
                      <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                      <p className="text-sm">Choose a conversation from the sidebar to start messaging.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
      
      {/* Listing Selector Dialog */}
      {isListingSelectorOpen && currentUser && (
        <ListingSelector
          isOpen={isListingSelectorOpen}
          onSelectListing={handleShareListing}
          onClose={() => setIsListingSelectorOpen(false)}
          currentUserId={currentUser.uid}
        />
      )}
    </div>
  );
}
