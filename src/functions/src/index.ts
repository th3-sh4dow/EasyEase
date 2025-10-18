
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Triggered when a new user is created in Firebase Authentication.
 * Creates a corresponding user profile in Firestore using v1 trigger syntax for stability.
 */
export const createProfile = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  // Default role is 'student'. In a real app, this could be
  // determined by email domain, a custom claim, etc.
  const role = "student";

  const userProfile = {
    id: uid,
    email,
    // Use the displayName set during signup to populate first/last names.
    firstName: displayName?.split(" ")[0] || "",
    lastName: displayName?.split(" ").slice(1).join(" ") || "",
    username: displayName || email?.split('@')[0] || `user_${uid.substring(0, 5)}`,
    photoURL: photoURL || "",
    role: role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await admin.firestore().collection("userProfiles").doc(uid).set(userProfile);
    logger.info(`✅ Successfully created profile for user: ${uid}`);
    return null;
  } catch (error) {
    logger.error(`🔥 Error creating profile for user: ${uid}`, error);
    return null;
  }
});

