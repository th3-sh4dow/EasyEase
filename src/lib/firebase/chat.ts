
'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { MessageData } from '@/lib/types';

export const chatPath = (chatId: string) => `chats/${chatId}/messages`;

export const getChatId = (studentId: string, instituteId: string) => {
    return [studentId, instituteId].sort().join('--');
}

type NewMessageData = {
    senderId: string;
    content: string;
    contentType: 'text' | 'image' | 'file';
}

/**
 * Saves a chat message to a specific chat conversation.
 * Creates the chat document if it doesn't exist.
 * This is a non-blocking operation.
 */
export async function saveMessage(firestore: Firestore, chatId: string, participants: { studentId: string, instituteId: string }, data: NewMessageData): Promise<void> {
  const chatDocRef = doc(firestore, 'chats', chatId);
  const messagesCollectionRef = collection(firestore, chatPath(chatId));
  
  const newMessageData = {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  };

  try {
    const chatDoc = await getDoc(chatDocRef);
    if (!chatDoc.exists()) {
      // Create chat document if it's the first message
      await setDoc(chatDocRef, {
        participants: [participants.studentId, participants.instituteId],
        createdAt: serverTimestamp(),
        lastMessage: data.content,
        lastMessageAt: serverTimestamp(),
      });
    } else {
      // Update last message on existing chat
      await updateDoc(chatDocRef, {
        lastMessage: data.content,
        lastMessageAt: serverTimestamp(),
      });
    }

    addDoc(messagesCollectionRef, newMessageData)
      .catch(error => {
        console.error("Error saving chat message:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: messagesCollectionRef.path,
          operation: 'create',
          requestResourceData: newMessageData,
        }));
      });
  } catch (error) {
    console.error("Error ensuring chat exists:", error);
  }
}
