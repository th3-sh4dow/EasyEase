
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({ maxInstances: 10 });

// Function to generate a username from an email
const generateUsername = (email: string | undefined): string => {
    if (!email) {
        // fallback for users without email, e.g. anonymous auth
        return `user_${Math.random().toString(36).substring(2, 10)}`;
    }
    return email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 100);
}

/**
 * A callable function to set a user's role and create their Firestore profile.
 * This is the single source of truth for user initialization.
 */
export const setInitialUserRole = onCall(async (request) => {
  const { uid, role, email } = request.data;
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!uid || !role || !email) {
    throw new HttpsError('invalid-argument', 'The function must be called with "uid", "role", and "email" arguments.');
  }

  // Ensure the role is one of the allowed values
  if (!['student', 'institute'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Role must be either "student" or "institute".');
  }

  try {
    // 1. Set custom user claims on the user account.
    await admin.auth().setCustomUserClaims(uid, { role: role });

    // 2. Create the user profile document in Firestore.
    const userProfile = {
        id: uid,
        email: email,
        username: generateUsername(email),
        firstName: "",
        lastName: "",
        photoURL: "",
        role: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await admin.firestore().collection('userProfiles').doc(uid).set(userProfile);

    logger.info(`Successfully initialized user ${uid} with role '${role}' and created their profile.`);
    return { success: true, message: `User initialized with role '${role}'.` };
  } catch (error) {
    logger.error(`Error initializing user ${uid}:`, error);
    // If something goes wrong, we may want to clean up the created user
    // await admin.auth().deleteUser(uid);
    throw new HttpsError('internal', 'Unable to initialize user.');
  }
});
