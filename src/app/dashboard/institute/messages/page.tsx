
'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Building, LayoutDashboard, BarChart3, Users, BookCopy, Settings, BotMessageSquare, MessageSquare } from 'lucide-react';
import { UserProfile } from '@/components/ui/user-profile';
import { cn } from '@/lib/utils';
import { Chat } from '@/components/dashboard/institute/Chat';


export default function InstituteMessagesPage() {
  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, color: 'text-sky-400', href: '/dashboard/institute' },
    { name: 'Course Management', icon: BookCopy, color: 'text-amber-400', href: '/dashboard/institute' },
    { name: 'Student Management', icon: Users, color: 'text-blue-400', href: '/dashboard/institute' },
    { name: 'Messages', icon: MessageSquare, color: 'text-blue-400', href: '/dashboard/institute/messages' },
    { name: 'AI Tools', icon: BotMessageSquare, color: 'text-violet-400', href: '/dashboard/institute' },
    { name: 'Analytics', icon: BarChart3, color: 'text-rose-400', href: '/dashboard/institute' },
    { name: 'Settings', icon: Settings, color: 'text-slate-400', href: '/dashboard/institute' },
  ];

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
          <main className="p-8 animate-fade-in h-full overflow-y-auto" data-main-scroll>
            <Chat />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
