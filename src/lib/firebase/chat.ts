
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
export async function saveChatMessage(firestore: Firestore, userId: string, sessionId: string, data: MessageData): Promise<void> {
  const messagesCollectionRef = collection(firestore, `userProfiles/${userId}/chatSessions/${sessionId}/messages`);
  const newMessageData = {
    ...data,
    createdAt: serverTimestamp(),
  };

  addDoc(messagesCollectionRef, newMessageData)
    .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: messagesCollectionRef.path,
            operation: 'create',
            requestResourceData: newMessageData,
        }));
    });
}


/**
 * Saves a chat message to a specific chat conversation.
 * Creates the chat document if it doesn't exist.
 * This is a non-blocking operation.
 */
export function saveMessage(firestore: Firestore, chatId: string, participants: { studentId: string, instituteId: string }, data: NewMessageData): void {
  const chatDocRef = doc(firestore, 'chats', chatId);
  const messagesCollectionRef = collection(firestore, chatPath(chatId));
  
  const newMessageData = {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  };

  // Use an async IIFE to handle the async logic of checking the doc
  (async () => {
    try {
      const chatDoc = await getDoc(chatDocRef);
      if (!chatDoc.exists()) {
        const chatData = {
          participants: [participants.studentId, participants.instituteId],
          createdAt: serverTimestamp(),
          lastMessage: data.content,
          lastMessageAt: serverTimestamp(),
        };
        // This is a "write" operation on the chat document
        setDoc(chatDocRef, chatData)
          .catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: chatDocRef.path,
              operation: 'create',
              requestResourceData: chatData,
            }));
          });
      } else {
        const updateData = {
          lastMessage: data.content,
          lastMessageAt: serverTimestamp(),
        };
        // This is an "update" operation on the chat document
        updateDoc(chatDocRef, updateData)
          .catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: chatDocRef.path,
              operation: 'update',
              requestResourceData: updateData,
            }));
          });
      }

      // This is a "create" operation for the new message
      addDoc(messagesCollectionRef, newMessageData)
        .catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: messagesCollectionRef.path,
            operation: 'create',
            requestResourceData: newMessageData,
          }));
        });

    } catch (error) {
       // This error is for getDoc, which is a 'get' operation.
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chatDocRef.path,
            operation: 'get',
        }));
    }
  })();
}
