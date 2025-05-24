// Script to set admin role for a user in Firebase
// Run this script using Node.js after installing firebase-admin

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Replace with your Firebase project ID
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function setAdminRole(userEmail) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    const userId = userRecord.uid;
    
    console.log(`Found user: ${userEmail} with UID: ${userId}`);
    
    // Update user document in Firestore to add admin role
    await db.collection('users').doc(userId).update({
      role: 'admin',
      isAdmin: true,
      adminSince: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully set admin role for user: ${userEmail}`);
    
    // Optional: Set custom claims for additional security
    await admin.auth().setCustomUserClaims(userId, { admin: true });
    console.log(`Set custom admin claims for user: ${userEmail}`);
    
  } catch (error) {
    console.error('Error setting admin role:', error);
  }
}

// Replace with your email address
const adminEmail = 'your-email@example.com';
setAdminRole(adminEmail);
