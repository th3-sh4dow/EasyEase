
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
        return `user_${Date.now()}`;
    }
    // Combine part of the email with a timestamp for uniqueness
    const emailPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const timestampPart = Date.now().toString().slice(-5);
    return `${emailPart}${timestampPart}`;
}

/**
 * A callable function to set a user's role and create their Firestore profile.
 * This is the single source of truth for user initialization.
 */
export const setInitialUserRole = onCall(async (request) => {
  // 1. Authentication and Validation
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { uid, role, email } = request.data;
  
  if (!uid || !role || !email) {
    logger.error("Missing required arguments", { uid, role, email });
    throw new HttpsError('invalid-argument', 'The function must be called with "uid", "role", and "email" arguments.');
  }

  if (!['student', 'institute'].includes(role)) {
    logger.error("Invalid role specified", { uid, role });
    throw new HttpsError('invalid-argument', 'Role must be either "student" or "institute".');
  }

  // 2. Core Logic (Transaction for Atomicity)
  const userProfileRef = admin.firestore().collection('userProfiles').doc(uid);

  try {
    // Use a transaction to ensure both operations succeed or fail together.
    await admin.firestore().runTransaction(async (transaction) => {
      // Check if profile already exists to prevent overwriting
      const profileDoc = await transaction.get(userProfileRef);
      if (profileDoc.exists) {
        logger.warn(`Profile for user ${uid} already exists. Skipping creation.`);
        // If it exists, we might still want to ensure the claim is set.
        // This is a good place for idempotency logic.
      } else {
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
        transaction.set(userProfileRef, userProfile);
      }
    });

    // Set custom claims AFTER the transaction succeeds.
    await admin.auth().setCustomUserClaims(uid, { role: role });
    
    // Forcing a token refresh on the client is often needed here,
    // but the client-side AuthProvider handles this with onIdTokenChanged.

    logger.info(`Successfully initialized user ${uid} with role '${role}' and created profile.`);
    return { success: true, message: `User initialized with role '${role}'.` };

  } catch (error) {
    logger.error(`Error initializing user ${uid}:`, error);
    // In a production app, consider adding cleanup logic,
    // e.g., if setting claims fails after profile creation.
    throw new HttpsError('internal', 'An internal error occurred while initializing the user account.');
  }
});
