import { auth } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, // Add this import
  signOut,
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
