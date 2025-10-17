'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { MessageData } from '@/lib/types';

export const chatPath = (chatId: string) => `chats/${chatId}/messages`;
export const INSTITUTE_SUPPORT_ID = 'institute_support'; // A static ID for institute support

type NewMessageData = {
    senderId: string;
    content: string;
    contentType: 'text' | 'image' | 'file';
}

/**
 * Saves a chat message to a specific chat conversation.
 * This is a non-blocking operation.
 */
export function saveMessage(firestore: Firestore, chatId: string, data: NewMessageData): void {
  const messagesCollectionRef = collection(firestore, chatPath(chatId));
  
  const newMessageData = {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  };

  addDoc(messagesCollectionRef, newMessageData)
    .catch(error => {
      console.error("Error saving chat message:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: messagesCollectionRef.path,
        operation: 'create',
        requestResourceData: newMessageData,
      }));
    });
}
