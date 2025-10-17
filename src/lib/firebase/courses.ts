'use client';

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Course } from '@/lib/types';

/**
 * Creates a new course for an institute.
 * This is a non-blocking operation.
 */
export function createCourse(firestore: Firestore, instituteId: string, data: Pick<Course, 'title' | 'description'>): void {
  const coursesCollectionRef = collection(firestore, 'courses');
  const newCourseData = {
    ...data,
    instituteId,
    studentIds: [],
    published: false,
    imageUrl: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDoc(coursesCollectionRef, newCourseData)
    .catch(error => {
      console.error("Error creating course:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: coursesCollectionRef.path,
        operation: 'create',
        requestResourceData: newCourseData,
      }));
    });
}

/**
 * Updates an existing course.
 * This is a non-blocking operation.
 */
export function updateCourse(firestore: Firestore, courseId: string, data: Partial<Pick<Course, 'title' | 'description' | 'published' | 'imageUrl'>>): void {
  const courseRef = doc(firestore, 'courses', courseId);
  const updateData = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  updateDoc(courseRef, updateData)
    .catch(error => {
      console.error("Error updating course:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: courseRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    });
}
