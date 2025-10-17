
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User as UserIcon, Building, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Chat, UserProfile } from '@/lib/types';
import { saveMessage, getChatId } from '@/lib/firebase/chat';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function Chat() {
  const { user, profile } = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeInstitute, setActiveInstitute] = useState<UserProfile | null>(null);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // When component mounts or user changes, determine the active chat
  useEffect(() => {
    const preselectedInstituteId = searchParams.get('instituteId');

    if (user && firestore) {
      if (preselectedInstituteId) {
        // A specific chat was selected from another page
        const chatId = getChatId(user.uid, preselectedInstituteId);
        setActiveChatId(chatId);
      } else {
        // TODO: In a multi-chat system, you'd load the most recent chat here.
        // For now, we'll just wait for a selection.
      }
    }
  }, [user, firestore, searchParams]);

  // Fetch institute details when active chat changes
  useEffect(() => {
      const fetchInstituteProfile = async () => {
          if (activeChatId && firestore && user) {
              const instituteId = activeChatId.replace(user.uid, '').replace('--', '');
              const instituteRef = doc(firestore, 'userProfiles', instituteId);
              const docSnap = await getDoc(instituteRef);
              if (docSnap.exists()) {
                  setActiveInstitute(docSnap.data() as UserProfile);
              }
          }
      }
      fetchInstituteProfile();
  }, [activeChatId, firestore, user]);

  const messagesQuery = useMemoFirebase(() => {
    if (!activeChatId || !firestore) return null;
    return query(
      collection(firestore, `chats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
  }, [activeChatId, firestore]);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || !firestore || !activeChatId || !activeInstitute) return;
    
    saveMessage(firestore, activeChatId, { studentId: user.uid, instituteId: activeInstitute.id }, {
      senderId: user.uid,
      content: input.trim(),
      contentType: 'text',
    });
    
    setInput('');
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const instituteName = activeInstitute?.username || 'Institute';
  const institutePhoto = activeInstitute?.photoURL;
  const instituteInitials = getInitials(instituteName);

  return (
    <div className="flex flex-col h-full animate-fade-in">
         <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Messages</h1>
        </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {/* For now, only one conversation is shown if selected */}
            {activeInstitute ? (
                 <div className="p-3 rounded-lg bg-primary/20 border border-primary flex items-center gap-3">
                    <Avatar>
                         <AvatarImage src={institutePhoto ?? ''} />
                         <AvatarFallback>{instituteInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{instituteName}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground p-4">
                    <p>No active conversations.</p>
                </div>
            )}
          </CardContent>
        </Card>
        {/* Chat Window */}
        <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
          {activeChatId ? (
            <>
            <CardContent className="flex-1 flex flex-col p-6">
                <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
                <div className="space-y-6">
                    {isLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-3/4" />
                            <Skeleton className="h-16 w-3/4 ml-auto" />
                            <Skeleton className="h-10 w-1/2" />
                        </div>
                    )}
                    {!isLoading && messages?.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3", message.senderId === user?.uid ? 'justify-end' : '')}>
                        {message.senderId !== user?.uid && (
                        <Avatar className="w-8 h-8 border-2 border-primary">
                            <AvatarImage src={institutePhoto ?? ''} />
                           <AvatarFallback>{instituteInitials}</AvatarFallback>
                        </Avatar>
                        )}
                        <div className={cn("max-w-md p-3 rounded-lg", message.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'sending...'}</p>
                        </div>
                        {message.senderId === user?.uid && (
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={profile?.photoURL ?? ''} />
                            <AvatarFallback>{getInitials(profile?.firstName)}</AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                </div>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
                <div className="relative">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    className="pr-12"
                />
                <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={handleSend}
                    disabled={!input.trim()}
                >
                    <Send className="w-4 h-4" />
                </Button>
                </div>
            </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-semibold">Select a conversation</h3>
                <p>Choose a chat from the left to start messaging.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
