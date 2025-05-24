const admin = require('firebase-admin');

// IMPORTANT: Replace with your service account key path
// You can generate a new private key for your service account from:
// Firebase Console > Project settings > Service accounts > Generate new private key
const serviceAccount = require('../path/to/your/serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function addUserIdToUsersCollection() {
  console.log('Starting migration: Adding userId to users collection...');

  try {
    // Fetch all users from Firebase Authentication
    const listUsersResult = await auth.listUsers();
    const authUsers = listUsersResult.users;
    console.log(`Found ${authUsers.length} users in Firebase Authentication.`);

    // Fetch all documents from the 'users' collection in Firestore
    const usersCollectionRef = db.collection('users');
    const usersSnapshot = await usersCollectionRef.get();
    console.log(`Found ${usersSnapshot.size} documents in Firestore 'users' collection.`);

    const batch = db.batch();
    let updatedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const firestoreUserId = doc.id; // The document ID is the user's UID
      const userData = doc.data();

      // Check if the 'id' field already exists or if the document ID matches an Auth UID
      if (!userData.id || userData.id !== firestoreUserId) {
        // Verify that this Firestore document ID corresponds to an actual Auth user UID
        const authUser = authUsers.find(user => user.uid === firestoreUserId);

        if (authUser) {
          const userRef = usersCollectionRef.doc(firestoreUserId);
          batch.update(userRef, { id: firestoreUserId });
          updatedCount++;
          console.log(`Adding/Updating 'id' field for user: ${firestoreUserId}`);
        } else {
          console.warn(`Firestore document ID ${firestoreUserId} does not match any Firebase Auth UID. Skipping.`);
        }
      } else {
        console.log(`User ${firestoreUserId} already has 'id' field correctly set. Skipping.`);
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Migration complete! Successfully updated ${updatedCount} user documents.`);
    } else {
      console.log('No user documents needed updating.');
    }

  } catch (error) {
    console.error('Error during migration:', error);
  }
}

addUserIdToUsersCollection();
