'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

/**
 * Uploads a profile picture for a given user to Firebase Storage.
 * 
 * @param userId - The ID of the user.
 * @param file - The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
    const { app } = initializeFirebase();
    const storage = getStorage(app);

    // Create a storage reference
    const storageRef = ref(storage, `profile-pictures/${userId}/${file.name}`);

    try {
        // Upload the file to the specified path
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the public URL of the file
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
    } catch (error) {
        console.error("Upload failed:", error);
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Uploads a course image to Firebase Storage.
 *
 * @param courseId - The ID of the course.
 * @param file - The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadCourseImage(courseId: string, file: File): Promise<string> {
    const { app } = initializeFirebase();
    const storage = getStorage(app);
    const storageRef = ref(storage, `course-images/${courseId}/${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Course image upload failed:", error);
        throw error;
    }
}
