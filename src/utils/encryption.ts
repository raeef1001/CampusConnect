import { auth } from '@/lib/firebase';

// Generate a key from user's UID and a salt
async function deriveKey(uid: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(uid + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a shared key for two users
async function generateSharedKey(uid1: string, uid2: string): Promise<CryptoKey> {
  // Create a deterministic salt from both UIDs
  const sortedUids = [uid1, uid2].sort();
  const salt = sortedUids.join('|');
  
  // Use the first UID as the base for key derivation
  return deriveKey(sortedUids[0], salt);
}

// Encrypt text message
export async function encryptMessage(text: string, senderUid: string, recipientUid: string): Promise<string> {
  try {
    const key = await generateSharedKey(senderUid, recipientUid);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a random IV for each message
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt text message
export async function decryptMessage(encryptedText: string, senderUid: string, recipientUid: string): Promise<string> {
  try {
    const key = await generateSharedKey(senderUid, recipientUid);
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedText)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return a fallback message instead of throwing to prevent app crashes
    return '[Message could not be decrypted]';
  }
}

// Encrypt image data (base64)
export async function encryptImage(base64Image: string, senderUid: string, recipientUid: string): Promise<string> {
  try {
    const key = await generateSharedKey(senderUid, recipientUid);
    const encoder = new TextEncoder();
    const data = encoder.encode(base64Image);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Image encryption failed:', error);
    throw new Error('Failed to encrypt image');
  }
}

// Decrypt image data
export async function decryptImage(encryptedImage: string, senderUid: string, recipientUid: string): Promise<string> {
  try {
    const key = await generateSharedKey(senderUid, recipientUid);
    
    const combined = new Uint8Array(
      atob(encryptedImage)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Image decryption failed:', error);
    return '/placeholder.svg'; // Return placeholder on decryption failure
  }
}

// Get the other participant's UID from a chat
export function getOtherParticipant(participants: string[], currentUserUid: string): string | null {
  return participants.find(uid => uid !== currentUserUid) || null;
}

// Check if encryption is supported
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' && 
         typeof crypto.subtle.encrypt === 'function';
}
