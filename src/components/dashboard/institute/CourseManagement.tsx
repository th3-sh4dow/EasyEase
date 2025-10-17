'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, BookCopy, Users, Edit, MoreVertical, Trash2, Loader2, Upload, DollarSign, Star, BookOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { createCourse, updateCourse } from '@/lib/firebase/courses';
import type { Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadCourseImage } from '@/lib/firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DifficultyIndicator = ({ difficulty }: { difficulty: Course['difficulty'] }) => {
    const baseClasses = "h-2.5 w-2.5 rounded-full mr-2";
    switch (difficulty) {
        case 'Beginner': return <div className={cn(baseClasses, "bg-green-500")} />;
        case 'Intermediate': return <div className={cn(baseClasses, "bg-yellow-500")} />;
        case 'Advanced': return <div className={cn(baseClasses, "bg-red-500")} />;
        default: return null;
    }
};

export function CourseManagement() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNewCourseDialogOpen, setIsNewCourseDialogOpen] = useState(false);
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  const [formState, setFormState] = useState({
    title: '',
    description: '',
    price: '' as number | '',
    category: 'Programming',
    difficulty: 'Beginner' as Course['difficulty'],
  });

  const coursesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'courses'), where('instituteId', '==', user.uid));
  }, [user, firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const resetForm = () => {
    setFormState({ 
        title: '', 
        description: '', 
        price: '',
        category: 'Programming',
        difficulty: 'Beginner',
    });
  }

  const handleOpenNewDialog = () => {
    resetForm();
    setCourseToEdit(null);
    setIsNewCourseDialogOpen(true);
  }

  const handleOpenEditDialog = (course: Course) => {
    setCourseToEdit(course);
    setFormState({
        title: course.title,
        description: course.description,
        price: course.price || '',
        category: course.category || 'Programming',
        difficulty: course.difficulty || 'Beginner',
    });
    setIsEditCourseDialogOpen(true);
  }

  const handleSaveCourse = async () => {
    if (!formState.title || !formState.description || !user || !firestore) return;
    setIsSaving(true);
    
    try {
        const courseData = {
            title: formState.title,
            description: formState.description,
            price: Number(formState.price) || 0,
            category: formState.category,
            difficulty: formState.difficulty,
        };

        if (courseToEdit) {
            await updateCourse(firestore, courseToEdit.id, courseData);
            toast({ title: "Course Updated", description: `"${formState.title}" has been successfully updated.` });
            setIsEditCourseDialogOpen(false);
        } else {
            await createCourse(firestore, user.uid, courseData);
            toast({ title: "Course Created", description: `"${formState.title}" has been successfully created.` });
            setIsNewCourseDialogOpen(false);
        }
        resetForm();
    } catch (error) {
        console.error("Failed to save course:", error);
        toast({ variant: 'destructive', title: "Save Failed", description: "There was an error saving the course." });
    } finally {
        setIsSaving(false);
    }
  };


  const handleTogglePublish = (course: Course) => {
    if (!user || !firestore) return;
    updateCourse(firestore, course.id, { published: !course.published });
  };
  
  const handleUploadClick = (courseId: string) => {
    setCourseToEdit({ id: courseId } as Course); // Temporarily set course to edit for ID
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && courseToEdit?.id && firestore) {
      const courseId = courseToEdit.id;
      setIsUploading(courseId);
      try {
        const imageUrl = await uploadCourseImage(courseId, file);
        updateCourse(firestore, courseId, { imageUrl });
        toast({
          title: "Image Uploaded",
          description: "The course image has been updated successfully.",
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Could not upload the course image.",
        });
      } finally {
        setIsUploading(null);
        setCourseToEdit(null);
      }
    }
  };

  const renderDialogContent = () => (
    <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input id="title" value={formState.title} onChange={(e) => setFormState({...formState, title: e.target.value})} className="col-span-3" placeholder="e.g., Advanced React" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={formState.description} onChange={(e) => setFormState({...formState, description: e.target.value})} className="col-span-3" placeholder="A brief summary of the course..." />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Price (USD)</Label>
            <Input id="price" type="number" value={formState.price} onChange={(e) => setFormState({...formState, price: e.target.value === '' ? '' : Number(e.target.value)})} className="col-span-3" placeholder="Leave blank for Free" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Input id="category" value={formState.category} onChange={(e) => setFormState({...formState, category: e.target.value})} className="col-span-3" placeholder="e.g., Programming" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="difficulty" className="text-right">Difficulty</Label>
            <Select value={formState.difficulty} onValueChange={(value: Course['difficulty']) => setFormState({...formState, difficulty: value })}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-8">
       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Course Management</h1>
        </div>
        <Dialog open={isNewCourseDialogOpen} onOpenChange={setIsNewCourseDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenNewDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Course
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Course</DialogTitle>
                    <DialogDescription>Fill in the details for your new course.</DialogDescription>
                </DialogHeader>
                {renderDialogContent()}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewCourseDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSaveCourse} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Course
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEditCourseDialogOpen} onOpenChange={setIsEditCourseDialogOpen}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Edit Course</DialogTitle>
                    <DialogDescription>Update the details for your course.</DialogDescription>
                </DialogHeader>
                {renderDialogContent()}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditCourseDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSaveCourse} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
             <Card key={i} className="flex flex-col">
              <Skeleton className="h-40 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
               <CardContent className="flex-1">
                 <Skeleton className="h-4 w-2/4" />
               </CardContent>
              <CardFooter>
                  <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses?.map((course) => (
              <Card key={course.id} className="group/card flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="relative aspect-video">
                    {course.imageUrl ? (
                        <Image src={course.imageUrl} alt={course.title} layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover/card:scale-105" />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted"><BookCopy className="w-12 h-12 text-muted-foreground/30" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute top-2 left-2 flex gap-2">
                        {course.category && <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm">{course.category}</Badge>}
                    </div>
                     <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        {course.difficulty && (
                            <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm flex items-center">
                                <DifficultyIndicator difficulty={course.difficulty} />
                                {course.difficulty}
                            </Badge>
                        )}
                    </div>
                     <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleUploadClick(course.id)} disabled={isUploading === course.id}>
                        {isUploading === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                </div>
                <CardHeader className="p-4 flex-1">
                    <CardTitle className="line-clamp-2 leading-tight h-12">{course.title}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground pt-2">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{course.studentIds?.length || 0} Students</span>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                        {course.price && course.price > 0 ? (
                            <div className="flex items-center gap-1 text-xl font-bold text-green-400">
                                <DollarSign className="h-5 w-5" />
                                <span>{course.price.toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-green-400">Free</div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(course)}><Edit className="mr-2 h-4 w-4"/> Edit Details</DropdownMenuItem>
                                <DropdownMenuItem><Users className="mr-2 h-4 w-4"/> View Students</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Delete Course</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
                <CardFooter className="p-4 border-t flex justify-between items-center gap-2">
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <Switch
                            checked={course.published}
                            onCheckedChange={() => handleTogglePublish(course)}
                            id={`publish-switch-${course.id}`}
                        />
                        <Label htmlFor={`publish-switch-${course.id}`} className="text-sm font-medium">{course.published ? 'Published' : 'Draft'}</Label>
                    </div>
                    <Button variant="outline" size="sm" className='flex-shrink-0'>View Content</Button>
                </CardFooter>
              </Card>
          ))}
        </div>
      )}
    </div>
  );
}
