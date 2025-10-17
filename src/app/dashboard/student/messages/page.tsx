
'use client';

import React, { Suspense } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { GraduationCap, LayoutDashboard, NotebookText, Route, BrainCircuit, Users, Code, ArrowRight, Target, Calendar, Sparkles, FileText, Spline, Settings, BookCopy, Zap, SquarePen, Flame, CheckCircle, BookOpen, MessageSquare, Loader2 } from 'lucide-react';
import { UserProfile } from '@/components/ui/user-profile';
import { cn } from '@/lib/utils';
import { MessagesContent } from '@/components/dashboard/student/MessagesContent';


export default function StudentMessagesPage() {
  
  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, color: 'text-sky-400', href: '/dashboard/student' },
    { name: 'My Courses', icon: GraduationCap, color: 'text-green-400', href: '/dashboard/student' },
    { name: 'Browse Courses', icon: BookCopy, color: 'text-orange-400', href: '/dashboard/student' },
    { name: 'Messages', icon: MessageSquare, color: 'text-blue-400', href: '/dashboard/student/messages' },
    { name: 'Notes', icon: NotebookText, color: 'text-amber-400', href: '/dashboard/student' },
    { name: 'Daily Quiz', icon: Zap, color: 'text-yellow-400', href: '/dashboard/student' },
    { name: 'Quiz Generator', icon: SquarePen, color: 'text-lime-400', href: '/dashboard/student' },
    { name: 'AI Tutor', icon: BrainCircuit, color: 'text-violet-400', href: '/dashboard/student' },
    { name: 'Code Companion', icon: Code, color: 'text-green-400', href: '/dashboard/student' },
    { name: 'Learning Path', icon: Route, color: 'text-rose-400', href: '/dashboard/student' },
    { name: 'PDF Summarizer', icon: FileText, color: 'text-orange-400', href: '/dashboard/student' },
    { name: 'Whiteboard', icon: Spline, color: 'text-blue-400', href: '/dashboard/student' },
    { name: 'Settings', icon: Settings, color: 'text-slate-400', href: '/dashboard/student' },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold font-headline">Student Portal</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
                <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                        isActive={item.name === 'Messages'}
                        asChild
                    >
                        <a href={item.href}>
                            <item.icon className={cn("transition-colors", item.color, item.name === 'Messages' && 'text-primary-foreground')} />
                            {item.name}
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
         <SidebarFooter>
          <SidebarSeparator />
          <UserProfile onProfileClick={() => { /* Navigate to settings */ }} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="p-8 h-full overflow-y-auto" data-main-scroll>
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <MessagesContent />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
