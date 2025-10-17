
'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Building, LayoutDashboard, BarChart3, Users, BookCopy, Settings, BotMessageSquare, MessageSquare, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/ui/user-profile';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

const ProfileSettings = dynamic(() => import('@/components/dashboard/ProfileSettings').then(mod => mod.ProfileSettings), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
const CourseManagement = dynamic(() => import('@/components/dashboard/institute/CourseManagement').then(mod => mod.CourseManagement), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
const Chat = dynamic(() => import('@/components/dashboard/institute/Chat').then(mod => mod.Chat), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

const Notifications = () => {
    const { user } = useAuth();
    const firestore = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `userProfiles/${user.uid}/notifications`),
            where('read', '==', false)
        );
    }, [user, firestore]);

    const { data: notifications } = useCollection<Notification>(notificationsQuery);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {notifications && notifications.length > 0 && (
                        <span className="absolute top-0 right-0 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            You have {notifications?.length || 0} unread messages.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {notifications?.map(notification => (
                             <div key={notification.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium">{notification.title}</p>
                                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}</p>
                                </div>
                            </div>
                        ))}
                         {(!notifications || notifications.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center">No new notifications.</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};


export default function InstituteDashboardPage() {
  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, color: 'text-sky-400' },
    { name: 'Course Management', icon: BookCopy, color: 'text-amber-400' },
    { name: 'Student Management', icon: Users, color: 'text-blue-400' },
    { name: 'Messages', icon: MessageSquare, color: 'text-blue-400', href: '/dashboard/institute/messages' },
    { name: 'AI Tools', icon: BotMessageSquare, color: 'text-violet-400' },
    { name: 'Analytics', icon: BarChart3, color: 'text-rose-400' },
    { name: 'Settings', icon: Settings, color: 'text-slate-400' },
  ];
  const [activeComponent, setActiveComponent] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActiveComponent('Overview');
  }, []);

  const handleMenuClick = (componentName: string, href?: string) => {
    if (href) {
        window.location.href = href;
    } else {
        setActiveComponent(componentName);
    }
  }
  
  const renderContent = () => {
    switch (activeComponent) {
      case 'Settings':
        return <ProfileSettings />;
      case 'Course Management':
        return <CourseManagement />;
      case 'Overview':
        return (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold font-headline bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 py-1">
                    Institute Dashboard
                </h1>
                <Notifications />
            </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="transition-all duration-300 hover:shadow-sky-500/20 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <CardHeader>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-500/20 rounded-lg border border-sky-500/30">
                            <BookCopy className="w-5 h-5 text-sky-400" />
                        </div>
                        <CardTitle>Total Courses</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">Active Courses</p>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-300 hover:shadow-blue-500/20 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <CardTitle>Total Students</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold">452</p>
                    <p className="text-sm text-muted-foreground">Enrolled</p>
                  </CardContent>
                </Card>
                 <Card className="transition-all duration-300 hover:shadow-rose-500/20 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <CardHeader>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/20 rounded-lg border border-rose-500/30">
                            <BarChart3 className="w-5 h-5 text-rose-400" />
                        </div>
                        <CardTitle>Analytics</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Generate and view key reports.</p>
                    <Button>Generate Report</Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell>Advanced React</TableCell>
                        <TableCell>Completed Lesson 3</TableCell>
                        <TableCell className="text-right">
                          Just now
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell>Intro to AI</TableCell>
                        <TableCell>Enrolled</TableCell>
                        <TableCell className="text-right">
                          5m ago
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sam Wilson</TableCell>
                        <TableCell>UX Design Fundamentals</TableCell>
                        <TableCell>Submitted Assignment</TableCell>
                        <TableCell className="text-right">
                          1h ago
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </div>
        );
      default:
        // Render skeletons or a loading indicator while the component is mounting
        return (
          <div className="space-y-8">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        );
    }
  };

  return (
    <div className="h-full relative">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, hsl(var(--primary) / 0.1), transparent 30%),
            radial-gradient(circle at 85% 75%, hsl(var(--primary) / 0.08), transparent 40%)
          `,
          backgroundAttachment: 'fixed',
        }}
      ></div>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <Building className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold font-headline">Institute Panel</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    isActive={!item.href && activeComponent === item.name}
                    onClick={() => handleMenuClick(item.name, item.href)}
                    asChild={!!item.href}
                  >
                    {item.href ? (
                        <a href={item.href}>
                            <item.icon className={cn("transition-colors", item.color, activeComponent === item.name && 'text-primary-foreground')} />
                            {item.name}
                        </a>
                    ) : (
                        <>
                            <item.icon className={cn("transition-colors", item.color, activeComponent === item.name && 'text-primary-foreground')} />
                            {item.name}
                        </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <UserProfile onProfileClick={() => setActiveComponent('Settings')} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <main className="p-8 animate-fade-in h-full overflow-y-auto" data-main-scroll>
            {renderContent()}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
