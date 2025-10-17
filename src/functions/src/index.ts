
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({ maxInstances: 10 });

/**
 * Checks if a username already exists in the userProfiles collection.
 * @param {string} username The username to check.
 * @returns {Promise<boolean>} True if the username exists, false otherwise.
 */
const checkUsernameExists = async (username: string): Promise<boolean> => {
  const query = admin.firestore().collection('userProfiles').where('username', '==', username).limit(1);
  const snapshot = await query.get();
  return !snapshot.empty;
};

/**
 * Ensures a username is unique by appending a number if it already exists.
 * @param {string} baseUsername The desired username.
 * @returns {Promise<string>} A unique username.
 */
const ensureUniqueUsername = async (baseUsername: string): Promise<string> => {
  let username = baseUsername;
  let attempts = 0;
  while (await checkUsernameExists(username)) {
    attempts++;
    username = `${baseUsername}${attempts}`;
    if (attempts > 10) { // Failsafe to prevent infinite loops
        throw new HttpsError('internal', 'Could not generate a unique username.');
    }
  }
  return username;
};

// Function to generate a username from an email
const generateUsernameFromEmail = (email: string | undefined): string => {
    if (!email) {
        return `user${Date.now().toString().slice(-5)}`;
    }
    const emailPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const timestampPart = Date.now().toString().slice(-5);
    return `${emailPart}${timestampPart}`;
}


interface SetInitialUserRoleData {
    uid: string;
    role: 'student' | 'institute';
    email: string;
    username?: string;
}

/**
 * A callable function to set a user's role and create their Firestore profile.
 * This is the single source of truth for user initialization.
 */
export const setInitialUserRole = onCall(async (request: { data: SetInitialUserRoleData }) => {
  // 1. Authentication and Validation
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { uid, role, email, username: requestedUsername } = request.data;
  
  // Security: Ensure users can only initialize their own profile.
  if (request.auth.uid !== uid) {
      logger.error(`Attempt by user ${request.auth.uid} to initialize profile for ${uid}.`);
      throw new HttpsError('permission-denied', 'You can only initialize your own user profile.');
  }
  
  if (!uid || !role || !email) {
    logger.error("Missing required arguments", { uid, role, email });
    throw new HttpsError('invalid-argument', 'The function must be called with "uid", "role", and "email" arguments.');
  }

  if (!['student', 'institute'].includes(role)) {
    logger.error("Invalid role specified", { uid, role });
    throw new HttpsError('invalid-argument', 'Role must be either "student" or "institute".');
  }

  // 2. Core Logic
  const userProfileRef = admin.firestore().collection('userProfiles').doc(uid);
  let finalUsername = '';

  try {
    const profileDoc = await userProfileRef.get();
    
    // Idempotency: If profile already exists, just ensure claims are set and return.
    if (profileDoc.exists) {
        logger.warn(`Profile for user ${uid} already exists. Ensuring claim is set.`);
        await admin.auth().setCustomUserClaims(uid, { role: role });
        return { success: true, alreadyExists: true, message: 'Profile already exists.' };
    }
    
    // Determine unique username
    if (requestedUsername) {
        finalUsername = await ensureUniqueUsername(requestedUsername);
    } else {
        finalUsername = await ensureUniqueUsername(generateUsernameFromEmail(email));
    }

    const userProfile = {
        id: uid,
        email: email,
        username: finalUsername,
        firstName: "",
        lastName: "",
        photoURL: "",
        role: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use a batch write for atomicity (good practice)
    const batch = admin.firestore().batch();
    batch.set(userProfileRef, userProfile);
    await batch.commit();

    // Set custom claims AFTER the profile is successfully created.
    await admin.auth().setCustomUserClaims(uid, { role: role });
    
    logger.info(`Successfully initialized user ${uid} with role '${role}' and username '${finalUsername}'.`);
    return { success: true, alreadyExists: false, message: `User initialized with role '${role}'.` };

  } catch (error: any) {
    logger.error(`Error initializing user ${uid}:`, error);

    // Cleanup: If profile was created but setting claims failed, delete the user profile.
    const doc = await userProfileRef.get();
    if (doc.exists) {
        await userProfileRef.delete();
        logger.warn(`Cleaned up partially created profile for user ${uid}.`);
    }

    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError('internal', 'An internal error occurred while initializing the user account.');
  }
});
