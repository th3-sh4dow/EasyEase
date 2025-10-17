'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookCopy, Search, FileX, DollarSign, Users, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export function Courses() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'courses'),
      where('published', '==', true)
    );
  }, [firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(course => 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  return (
    <div className="flex flex-col h-full gap-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <BookCopy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Browse Courses</h1>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for courses..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
             <Card key={i} className="flex flex-col">
              <Skeleton className="h-40 w-full" />
              <CardHeader className="p-4">
                <Skeleton className="h-4 w-2/4 mb-2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
               <CardContent className="p-4 flex-1">
                 <Skeleton className="h-4 w-2/4" />
               </CardContent>
              <CardFooter className="p-4">
                  <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCourses.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="group/card flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in">
                <div className="relative aspect-video">
                    <Link href={`/dashboard/student/enroll/${course.id}`} className="absolute inset-0">
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
                    <div className="flex items-center text-xs text-muted-foreground pt-2">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 mr-1" /> 4.8 (1,234)
                        <span className="mx-2">·</span>
                        <Users className="w-3.5 h-3.5 mr-1" /> {course.studentIds?.length || 0}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1">
                     {course.difficulty && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <DifficultyIndicator difficulty={course.difficulty} />
                            <span>{course.difficulty}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 border-t flex justify-between items-center">
                    {course.price && course.price > 0 ? (
                        <div className="flex items-center gap-1 text-2xl font-bold text-green-400">
                            <DollarSign className="h-6 w-6" />
                            <span>{course.price.toFixed(2)}</span>
                        </div>
                    ) : (
                        <div className="text-2xl font-bold text-green-400">Free</div>
                    )}
                    <Button asChild size="sm">
                        <Link href={`/dashboard/student/enroll/${course.id}`}>Enroll</Link>
                    </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
            <FileX className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold">No Courses Found</h3>
            <p>
                {searchTerm 
                    ? `No courses match "${searchTerm}". Try a different search.`
                    : "There are no published courses available right now."
                }
            </p>
        </div>
      )}
    </div>
  );
}
