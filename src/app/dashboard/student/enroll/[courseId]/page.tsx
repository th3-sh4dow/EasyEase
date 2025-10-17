
'use client';

import React from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookCopy, Check, DollarSign, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';


export default function EnrollPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user, profile } = useAuth();
    const { toast } = useToast();

    const courseRef = useMemoFirebase(() => {
        if (!firestore || !courseId) return null;
        return doc(firestore, 'courses', courseId as string);
    }, [firestore, courseId]);

    const { data: course, isLoading } = useDoc<Course>(courseRef);

    const handleEnroll = async () => {
        if (!user || !profile || !course || !firestore) return;

        // In a real app, this would trigger a payment flow if course.price > 0
        
        const courseDocRef = doc(firestore, 'courses', course.id);
        const userProfileRef = doc(firestore, 'userProfiles', user.uid);
        
        try {
            // Add student to course
            await updateDoc(courseDocRef, {
                studentIds: arrayUnion(user.uid)
            });

            // Add course to student's profile
            await updateDoc(userProfileRef, {
                enrolledCourseIds: arrayUnion(course.id)
            });

            toast({
                title: 'Enrollment Successful!',
                description: `You are now enrolled in "${course.title}".`,
            });
            
            router.push('/dashboard/student');

        } catch (error) {
            console.error("Error enrolling in course:", error);
            toast({
                variant: 'destructive',
                title: 'Enrollment Failed',
                description: 'There was an error enrolling you in the course. Please try again.',
            });
        }
    };
    
    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!course) {
        return <div className="text-center p-8">Course not found.</div>;
    }

    const priceText = course.price && course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 animate-fade-in">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="md:col-span-2">
                <Card className="overflow-hidden mb-8">
                    <div className="relative aspect-video bg-muted">
                        {course.imageUrl ? (
                            <Image src={course.imageUrl} alt={course.title} layout="fill" objectFit="cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-muted">
                                <BookCopy className="w-24 h-24 text-muted-foreground/30" />
                            </div>
                        )}
                    </div>
                </Card>
                <h1 className="text-4xl font-bold font-headline mb-4">{course.title}</h1>
                <p className="text-muted-foreground text-lg">{course.description}</p>
            </div>

            {/* Right Column */}
            <div>
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle className="text-3xl">{priceText}</CardTitle>
                        <CardDescription>One-time payment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h4 className="font-semibold">This course includes:</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Full lifetime access</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Access on mobile and web</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Certificate of completion</li>
                        </ul>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button size="lg" className="w-full" onClick={handleEnroll} disabled={profile?.enrolledCourseIds?.includes(course.id)}>
                            {profile?.enrolledCourseIds?.includes(course.id) ? 'Already Enrolled' : <><DollarSign className="mr-2 h-5 w-5" /> Enroll Now</>}
                        </Button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <p>Secure transaction</p>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </div>
  );
}
