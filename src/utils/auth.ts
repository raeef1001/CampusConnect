import { auth } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User,
} from 'firebase/auth';

let currentUser: User | null = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

export const isAuthenticated = (): boolean => {
  return !!currentUser;
};

export const getUser = () => {
  return currentUser;
};

export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    return currentUser;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error logging in:", error.message);
    } else {
      console.error("An unknown error occurred during login.");
    }
    throw error;
  }
};

export const signup = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    return currentUser;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error signing up:", error.message);
    } else {
      console.error("An unknown error occurred during signup.");
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    currentUser = null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error logging out:", error.message);
    } else {
      console.error("An unknown error occurred during logout.");
    }
    throw error;
  }
};

// Google OAuth login
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    
    // Check if the user's email is from a university domain
    if (result.user.email && !result.user.email.endsWith('.edu')) {
      // Sign out the user if not from university domain
      await signOut(auth);
      currentUser = null;
      throw new Error('Only university emails (.edu) are allowed for signup.');
    }
    
    return result.user;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error signing in with Google:", error.message);
    } else {
      console.error("An unknown error occurred during Google sign in.");
    }
    throw error;
  }
};

// GitHub OAuth login
export const signInWithGitHub = async () => {
  try {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    
    // Check if the user's email is from a university domain
    if (result.user.email && !result.user.email.endsWith('.edu')) {
      // Sign out the user if not from university domain
      await signOut(auth);
      currentUser = null;
      throw new Error('Only university emails (.edu) are allowed for signup.');
    }
    
    return result.user;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error signing in with GitHub:", error.message);
    } else {
      console.error("An unknown error occurred during GitHub sign in.");
    }
    throw error;
  }
};
