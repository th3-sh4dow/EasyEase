
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User as UserIcon, MessageSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Chat, UserProfile } from '@/lib/types';
import { saveMessage, getChatId } from '@/lib/firebase/chat';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const ChatListItem = ({ chat, currentUserId, isActive, onClick }: { chat: Chat, currentUserId: string, isActive: boolean, onClick: () => void }) => {
    const firestore = useFirestore();
    const [otherUser, setOtherUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const otherParticipantId = chat.participants.find(p => p !== currentUserId);
        if (otherParticipantId && firestore) {
            const userRef = doc(firestore, 'userProfiles', otherParticipantId);
            getDoc(userRef).then(docSnap => {
                if (docSnap.exists()) {
                    setOtherUser(docSnap.data() as UserProfile);
                }
            });
        }
    }, [chat, currentUserId, firestore]);

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1 && names[names.length - 1]) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name[0]?.toUpperCase() || 'U';
    };

    if (!otherUser) {
        return (
             <div className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        );
    }

    return (
        <div 
            className={cn("p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors", isActive ? 'bg-primary/20 border border-primary' : 'hover:bg-muted')}
            onClick={onClick}
        >
            <Avatar>
                <AvatarImage src={otherUser.photoURL ?? ''} />
                <AvatarFallback>{getInitials(otherUser.firstName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <p className="font-semibold truncate">{otherUser.firstName} {otherUser.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
            </div>
            {chat.lastMessageAt && (
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}</p>
                    {/* Unread count badge would go here */}
                </div>
            )}
        </div>
    )
}

export function Chat() {
  const { user, profile } = useAuth();
  const firestore = useFirestore();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<UserProfile | null>(null);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
  }, [user, firestore]);

  const { data: chats, isLoading: chatsLoading } = useCollection<Chat>(chatsQuery);

  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);


  useEffect(() => {
      const fetchStudentProfile = async () => {
          if (activeChatId && firestore && user) {
              const activeChat = chats?.find(c => c.id === activeChatId);
              const studentId = activeChat?.participants.find(p => p !== user.uid);
              if (studentId) {
                const studentRef = doc(firestore, 'userProfiles', studentId);
                const docSnap = await getDoc(studentRef);
                if (docSnap.exists()) {
                    setActiveStudent(docSnap.data() as UserProfile);
                }
              }
          } else {
            setActiveStudent(null);
          }
      }
      fetchStudentProfile();
  }, [activeChatId, firestore, user, chats]);

  const messagesQuery = useMemoFirebase(() => {
    if (!activeChatId || !firestore) return null;
    return query(
      collection(firestore, `chats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
  }, [activeChatId, firestore]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
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
    if (!input.trim() || !user || !firestore || !activeChatId || !activeStudent) return;
    
    saveMessage(firestore, activeChatId, { studentId: activeStudent.id, instituteId: user.uid }, {
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

  const studentName = activeStudent ? `${activeStudent.firstName} ${activeStudent.lastName}` : 'Student';
  const studentPhoto = activeStudent?.photoURL;
  const studentInitials = getInitials(studentName);


  return (
    <div className="flex flex-col h-full animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Student Messages</h1>
        </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>
                {chats?.length || 0} active conversations
            </CardDescription>
          </CardHeader>
          <div className="px-4 pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-10" />
            </div>
          </div>
          <CardContent className="flex-1 flex flex-col p-2">
             <ScrollArea className="flex-1">
                <div className="space-y-2">
                    {chatsLoading && (
                        <div className="p-2 space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    )}
                    {chats?.map(chat => (
                        <ChatListItem 
                            key={chat.id} 
                            chat={chat}
                            currentUserId={user!.uid}
                            isActive={chat.id === activeChatId}
                            onClick={() => setActiveChatId(chat.id)}
                        />
                    ))}
                    {!chatsLoading && chats?.length === 0 && (
                        <div className="text-center text-muted-foreground p-8">
                            <p>No conversations yet.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
          {activeChatId && activeStudent ? (
            <>
            <CardHeader className="border-b flex-row items-center gap-3 space-y-0 p-4">
                <Avatar>
                    <AvatarImage src={studentPhoto ?? ''} />
                    <AvatarFallback>{studentInitials}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{studentName}</CardTitle>
                    <CardDescription>Online</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-6">
                <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
                <div className="space-y-6">
                    {messagesLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-3/4" />
                            <Skeleton className="h-16 w-3/4 ml-auto" />
                            <Skeleton className="h-10 w-1/2" />
                        </div>
                    )}
                    {!messagesLoading && messages?.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3", message.senderId === user?.uid ? 'justify-end' : '')}>
                        {message.senderId !== user?.uid && (
                        <Avatar className="w-8 h-8 border-2 border-primary">
                            <AvatarImage src={studentPhoto ?? ''} />
                           <AvatarFallback>{studentInitials}</AvatarFallback>
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

    