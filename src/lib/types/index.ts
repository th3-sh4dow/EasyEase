
'use client';

import { z } from 'zod';
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoURL?: string;
  role: 'student' | 'institute' | 'admin';
  createdAt: Timestamp;
  instituteId?: string; // ID of the institute the user belongs to
  enrolledCourseIds?: string[];
}

export interface Institute {
  id:string;
  name: string;
  ownerId: string; // The UID of the user who created the institute
  admins: string[]; // List of UIDs of institute admins
  settings: {
    theme?: 'light' | 'dark';
    customDomain?: string;
  };
  billing: {
    plan: 'free' | 'pro' | 'enterprise';
    stripeCustomerId?: string;
    status: 'active' | 'trialing' | 'canceled';
  };
  featureFlags: {
    [key: string]: boolean;
  };
  createdAt: Timestamp;
}

export interface Course {
  id: string;
  instituteId: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  studentIds: string[];
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  lessons: string[]; // Array of lesson IDs
  resources: Resource[];
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string; // Could be Markdown, HTML, etc.
  attachments: Attachment[];
  duration: number; // in minutes
}

interface Resource {
  name: string;
  url: string;
}

interface Attachment {
  name:string;
  url: string; // URL to Firebase Storage
  type: 'file' | 'video' | 'link';
}

export interface Note {
  id: string;
  ownerId: string; // UID of the student who owns the note
  courseId?: string; // Optional: to associate note with a course
  title: string;
  content: string; // The body of the note
  privacy: 'private' | 'public'; // 'public' could mean visible to institute instructors
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Enrollment {
    enrollmentId: string;
    courseId: string;
    studentId: string;
    status: 'active' | 'completed' | 'dropped';
    enrolledAt: Timestamp;
    progress?: number; // e.g., percentage completion
}

export const MessageDataSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});
export type MessageData = z.infer<typeof MessageDataSchema>;

export const ChatRequestSchema = z.object({
  history: z.array(MessageDataSchema),
  currentMessage: MessageDataSchema,
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatMessage extends MessageData {
  id: string;
  createdAt: Timestamp;
}

export interface QuizResult {
    id: string;
    score: number;
    totalQuestions: number;
    topic: string;
    createdAt: Timestamp;
}

export interface Chat {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt: Timestamp;
    unreadCount: Record<string, number>;
}

export interface Message {
    id: string;
    senderId: string;
    content: string;
    contentType: 'text' | 'image' | 'file';
    createdAt: Timestamp;
    read?: boolean;
}

export interface Notification {
    id: string;
    userId: string; // The user who should receive the notification
    type: 'new_enrollment' | 'new_message';
    title: string;
    message: string;
    link?: string; // e.g., a link to the course or chat
    read: boolean;
    createdAt: Timestamp;
}
