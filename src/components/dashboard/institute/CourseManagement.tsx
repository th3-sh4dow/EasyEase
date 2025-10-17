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
import { PlusCircle, BookCopy, Users, Edit, MoreVertical, Trash2, Loader2, Upload, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { createCourse, updateCourse } from '@/lib/firebase/courses';
import type { Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadCourseImage } from '@/lib/firebase/storage';
import { useToast } from '@/hooks/use-toast';

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
  });

  const coursesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'courses'), where('instituteId', '==', user.uid));
  }, [user, firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const resetForm = () => {
    setFormState({ title: '', description: '', price: '' });
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
    });
    setIsEditCourseDialogOpen(true);
  }

  const handleSaveCourse = async () => {
    if (!formState.title || !formState.description || !user || !firestore) return;
    setIsSaving(true);
    
    try {
        if (courseToEdit) {
            // Update existing course
            await updateCourse(firestore, courseToEdit.id, {
                title: formState.title,
                description: formState.description,
                price: Number(formState.price) || 0,
            });
            toast({ title: "Course Updated", description: `"${formState.title}" has been successfully updated.` });
            setIsEditCourseDialogOpen(false);
        } else {
            // Create new course
            await createCourse(firestore, user.uid, {
                title: formState.title,
                description: formState.description,
                price: Number(formState.price) || 0,
            });
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
  
  const courseColors = [
    { color: 'text-sky-400', borderColor: 'hover:border-sky-400/50' },
    { color: 'text-violet-400', borderColor: 'hover:border-violet-400/50' },
    { color: 'text-amber-400', borderColor: 'hover:border-amber-400/50' },
    { color: 'text-rose-400', borderColor: 'hover:border-rose-400/50' },
    { color: 'text-emerald-400', borderColor: 'hover:border-emerald-400/50' },
    { color: 'text-blue-400', borderColor: 'hover:border-blue-400/50' },
  ];

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
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-8">
       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BookCopy className="w-8 h-8 text-primary" />
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
          {courses?.map((course, index) => {
            const style = courseColors[index % courseColors.length];
            return (
              <Card key={course.id} className={cn("flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden", style.borderColor)}>
                 <div className="relative aspect-video bg-muted">
                  {course.imageUrl ? (
                      <Image src={course.imageUrl} alt={course.title} layout="fill" objectFit="cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                        <BookCopy className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                   <div className="absolute inset-0 bg-black/20" />
                   <Button size="sm" className="absolute top-2 right-2" onClick={() => handleUploadClick(course.id)} disabled={isUploading === course.id}>
                    {isUploading === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                      <CardTitle className="leading-tight flex-1">{course.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(course)}><Edit className="mr-2 h-4 w-4"/> Edit Course</DropdownMenuItem>
                            <DropdownMenuItem><Users className="mr-2 h-4 w-4"/> View Students</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Delete Course</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2 pt-1">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                    {course.price && course.price > 0 ? (
                        <div className="flex items-center gap-1 text-lg font-semibold text-green-400">
                        <DollarSign className="h-5 w-5" />
                        <span>{course.price.toFixed(2)}</span>
                        </div>
                    ) : (
                        <div className="text-lg font-semibold text-green-400">Free</div>
                    )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{course.studentIds?.length || 0} Students</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={course.published}
                            onCheckedChange={() => handleTogglePublish(course)}
                            id={`publish-switch-${course.id}`}
                        />
                        <Label htmlFor={`publish-switch-${course.id}`} className="text-sm font-medium">{course.published ? 'Published' : 'Draft'}</Label>
                    </div>
                    <Button variant="outline" size="sm">View Content</Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
