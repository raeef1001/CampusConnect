import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Link, useLocation, useParams } from "react-router-dom";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, Timestamp, FieldValue } from "firebase/firestore";
<<<<<<< HEAD
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
=======
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
=======
import { useToast } from "@/hooks/use-toast";
import { 
  encryptMessage, 
  decryptMessage, 
  encryptImage, 
  decryptImage, 
  getOtherParticipant, 
  isEncryptionSupported 
} from "@/utils/encryption";
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  listingId?: string; 
<<<<<<< HEAD
=======
  // Encryption field for last message
  encryptedLastMessage?: string;
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
=======
  // Encryption fields
  encrypted?: boolean;
  encryptedText?: string;
  encryptedImage?: string;
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
=======
  const [decryptedMessages, setDecryptedMessages] = useState<{ [key: string]: { text?: string; image?: string } }>({});
  const [decryptedLastMessages, setDecryptedLastMessages] = useState<{ [key: string]: string }>({});
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [fetchedListings, setFetchedListings] = useState<{ [key: string]: Listing }>({});
  const [isListingSelectorOpen, setIsListingSelectorOpen] = useState(false);
<<<<<<< HEAD
=======
  const [shouldSendMessage, setShouldSendMessage] = useState(false);

  const { toast } = useToast();
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

  const location = useLocation();
  const { chatId } = useParams<{ chatId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
<<<<<<< HEAD
=======
  const initialMessageRef = useRef<string | null>(null);
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setSelectedListing(null);
<<<<<<< HEAD
    }
  };

  const uploadImage = async (imageFile: File) => {
    if (!currentUser) return null;
    const storageRef = ref(storage, `chat_images/${currentUser.uid}/${imageFile.name}_${Date.now()}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
=======
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
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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

<<<<<<< HEAD
          const { sellerId, listingId: initialListingId } = location.state || {};
          let chatToSelect: Chat | null = null;
=======
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
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

          if (chatId) {
            chatToSelect = fetchedChats.find(c => c.id === chatId) || null;
          } else if (sellerId && initialListingId && user.uid !== sellerId) {
<<<<<<< HEAD
=======
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

>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
            window.history.replaceState({}, document.title);
=======
            // Set shouldSendMessage to true if initialMessage was present
            if (initialMessage) {
              setShouldSendMessage(true);
            }
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
  }, [location.state, chatId]); 

=======
  }, [location.state, chatId]);

  // Modified useEffect to trigger message sending
  useEffect(() => {
    if (selectedChat && currentUser && initialMessageRef.current) {
      // Ensure newMessage is still the initial message before sending
      if (newMessage === initialMessageRef.current) {
        handleSendMessage();
      }
      initialMessageRef.current = null; // Clear the ref after sending
    }
  }, [selectedChat, currentUser, newMessage]);
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

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

<<<<<<< HEAD
=======
        // Decrypt messages if current user is available
        if (currentUser) {
          await decryptMessagesAsync(newMessages, currentUser.uid, selectedChat.participants);
        }

>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
  }, [selectedChat, userProfiles]);
=======
  }, [selectedChat, userProfiles, currentUser]);
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && !selectedImage && !selectedListing) || !selectedChat || !currentUser) {
      return;
    }

    try {
<<<<<<< HEAD
      const messagePayload: Partial<Omit<Message, 'id' | 'createdAt'>> & { createdAt: FieldValue } = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      if (newMessage.trim() !== "") {
        messagePayload.text = newMessage;
      }

      if (selectedImage) {
        const uploadedImageUrl = await uploadImage(selectedImage);
        if (uploadedImageUrl) {
          messagePayload.image = uploadedImageUrl;
=======
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
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
        }
      }

      if (selectedListing) {
        messagePayload.listingId = selectedListing.id;
<<<<<<< HEAD
=======
        lastMessageText = `Shared: ${selectedListing.title}`;
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
      }

      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messagePayload);

<<<<<<< HEAD
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
=======
      // Update chat with encrypted last message if encryption is supported
      const chatUpdateData: any = {
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
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779

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
<<<<<<< HEAD
    } catch (error) {
      console.error("Error sending message:", error);
=======
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
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
    }
  };

  const handleShareListing = (listing: Listing) => {
    setSelectedListing(listing);
    setNewMessage(`Check out: ${listing.title}`);
    setSelectedImage(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsListingSelectorOpen(false);
  };

<<<<<<< HEAD
  // These handlers are kept for potential future use or if ListingCard itself has these actions.
  // For now, the buttons rendered by Messages.tsx for shared listings will be removed.
=======
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  const handleAddToCart = async (listingId: string) => {
    if (!currentUser || !listingId) return;
    console.log("Add to cart:", listingId);
    alert(`Item with ID ${listingId} added to cart (dummy action)!`);
<<<<<<< HEAD
    // Add actual cart logic if needed
=======
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  };

  const handlePlaceOrder = async (listingId: string) => {
    if (!currentUser || !listingId) return;
    console.log("Place order for:", listingId);
    alert(`Order placed for item ID ${listingId} (dummy action)!`);
<<<<<<< HEAD
    // Add actual order logic if needed
=======
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
  };

  const getChatPartner = (chat: Chat | null): UserProfile | null => {
    if (!chat || !currentUser) return null;
    const partnerUid = chat.participants.find(uid => uid !== currentUser.uid);
    return partnerUid ? userProfiles[partnerUid] : null;
  };

<<<<<<< HEAD
=======
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

>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
=======
                  {isEncryptionSupported() && (
                    <p className="text-xs text-muted-foreground mt-1">🔒 End-to-end encrypted</p>
                  )}
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
                              {chat.lastMessage || "No messages yet."}
=======
                              {decryptedLastMessages[chat.id] || chat.lastMessage || "No messages yet."}
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
                      <h2 className="text-lg md:text-xl font-semibold ml-3">
                        {getChatPartner(selectedChat)?.name || "Unknown User"}
                      </h2>
=======
                      <div className="ml-3 flex-1">
                        <h2 className="text-lg md:text-xl font-semibold">
                          {getChatPartner(selectedChat)?.name || "Unknown User"}
                        </h2>
                        {isEncryptionSupported() && (
                          <p className="text-xs text-muted-foreground">🔒 Messages are encrypted</p>
                        )}
                      </div>
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
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
=======
                        messages.map((message) => {
                          const displayText = getMessageText(message);
                          const displayImage = getMessageImage(message);
                          
                          return (
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
                                {displayText && <p className="whitespace-pre-wrap break-words text-sm md:text-base">{displayText}</p>}
                                {displayImage && (
                                  <img src={displayImage} alt="Shared content" className="max-w-full h-auto rounded-md mt-2 cursor-pointer object-contain max-h-64" onClick={() => window.open(displayImage, '_blank')} />
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
                                  </div>
                                )}
                                <span className="block text-xs text-right mt-1 opacity-70">
                                  {message.createdAt && (message.createdAt as Timestamp).seconds 
                                    ? new Date((message.createdAt as Timestamp).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                    : 'Sending...'}
                                </span>
                              </div>
                            </div>
                          );
                        })
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
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
<<<<<<< HEAD
}
=======
}
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
