
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookCopy, FileX, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


const DifficultyIndicator = ({ difficulty }: { difficulty: Course['difficulty'] }) => {
    const baseClasses = "h-2 w-2 rounded-full mr-1.5";
    switch (difficulty) {
        case 'Beginner': return <div className={cn(baseClasses, "bg-green-500")} />;
        case 'Intermediate': return <div className={cn(baseClasses, "bg-yellow-500")} />;
        case 'Advanced': return <div className={cn(baseClasses, "bg-red-500")} />;
        default: return null;
    }
};

export function MyCourses() {
  const firestore = useFirestore();
  const { user, profile } = useAuth();
  
  // NOTE: A where-in query is limited to 30 elements.
  // For a production app with more enrollments, this would need pagination
  // or a different data model (e.g., denormalizing course data into a user subcollection).
  const myCoursesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.enrolledCourseIds || profile.enrolledCourseIds.length === 0) {
      return null;
    }
    return query(
      collection(firestore, 'courses'),
      where(documentId(), 'in', profile.enrolledCourseIds.slice(0, 30))
    );
  }, [firestore, profile?.enrolledCourseIds]);
  
  const { data: courses, isLoading } = useCollection<Course>(myCoursesQuery);

  return (
    <div className="flex flex-col h-full gap-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">My Courses</h1>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
             <Card key={i} className="flex flex-col">
              <Skeleton className="h-40 w-full" />
              <CardHeader className="p-4">
                <Skeleton className="h-4 w-2/4 mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
               <CardContent className="p-4 flex-1">
                 <Skeleton className="h-8 w-full" />
               </CardContent>
              <CardFooter className="p-4">
                  <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && courses && courses.length > 0 && (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="group/card flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in">
               <div className="relative aspect-video">
                    <Link href={`/dashboard/student/learn/${course.id}`} className="absolute inset-0">
                        {course.imageUrl ? (
                            <Image src={course.imageUrl} alt={course.title} layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover/card:scale-105" />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-muted"><BookCopy className="w-12 h-12 text-muted-foreground/30" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </Link>
                    <div className="absolute top-2 left-2">
                        {course.category && <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm">{course.category}</Badge>}
                    </div>
                </div>
              <CardHeader className="p-4">
                <CardTitle className="line-clamp-2 leading-tight h-12">{course.title}</CardTitle>
                {course.difficulty && (
                    <div className="flex items-center text-sm text-muted-foreground pt-1">
                        <DifficultyIndicator difficulty={course.difficulty} />
                        <span>{course.difficulty}</span>
                    </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1 space-y-3">
                <Progress value={33} />
                <p className="text-sm text-muted-foreground">33% complete</p>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button asChild className="w-full">
                    <Link href={`/dashboard/student/learn/${course.id}`}>Continue Learning</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {(!isLoading && !courses) || (courses && courses.length === 0) && (
        <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <FileX className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold">No Courses Yet</h3>
            <p className="mb-4">You haven't enrolled in any courses.</p>
            <Button>Browse Courses</Button>
        </div>
      )}
    </div>
  );
}
