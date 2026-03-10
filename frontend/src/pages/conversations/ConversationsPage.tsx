import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Archive,
  CheckCheck,
  Wifi,
  WifiOff,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { conversationsApi } from '../../api/conversations.api';
import { messagesApi } from '../../api/messages.api';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/auth.store';
import { useSocket } from '../../hooks/useSocket';
import type { Conversation, Message, User, ConversationParticipant } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOtherParticipant(conv: Conversation, myId: string): ConversationParticipant | undefined {
  return conv.participants.find((p) => {
    const id = typeof p.userId === 'string' ? p.userId : (p.userId as User)._id;
    return id !== myId;
  });
}

function participantName(p: ConversationParticipant | undefined): string {
  if (!p) return 'Unknown';
  return typeof p.userId === 'object' ? (p.userId as User).name : 'User';
}

function participantInitial(p: ConversationParticipant | undefined): string {
  return participantName(p).charAt(0).toUpperCase();
}

function participantPhoto(p: ConversationParticipant | undefined): string | undefined {
  if (!p || typeof p.userId === 'string') return undefined;
  const u = p.userId as User & { profile?: { photoUrl?: string } };
  return u.profile?.photoUrl;
}

function formatMsgTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a');
}

function formatListTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function groupMessagesByDate(messages: Message[]): Array<{ date: Date; messages: Message[] }> {
  const groups: Array<{ date: Date; messages: Message[] }> = [];
  messages.forEach((msg) => {
    const d = new Date(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, d)) {
      last.messages.push(msg);
    } else {
      groups.push({ date: d, messages: [msg] });
    }
  });
  return groups;
}

function dateSeparatorLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  participant,
  size = 'md',
}: {
  participant: ConversationParticipant | undefined;
  size?: 'sm' | 'md';
}) {
  const photo = participantPhoto(participant);
  const initial = participantInitial(participant);
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  return photo ? (
    <img src={photo} alt={initial} className={clsx(cls, 'rounded-full object-cover shrink-0')} />
  ) : (
    <div
      className={clsx(
        cls,
        'rounded-full bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center text-white font-bold shrink-0',
      )}
    >
      {initial}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ConversationsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { isConnected, joinConversation, leaveConversation, on } = useSocket();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localConvs, setLocalConvs] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevSelectedId = useRef<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.listConversations,
  });

  const { data: chatRoom, isLoading: roomLoading } = useQuery({
    queryKey: ['chatRoom', selectedId],
    queryFn: () => conversationsApi.getAChatRoom(selectedId!),
    enabled: !!selectedId,
  });

  // Sync local state from queries
  useEffect(() => { setLocalConvs(conversations); }, [conversations]);
  useEffect(() => { if (chatRoom) setLocalMessages(chatRoom.messages); }, [chatRoom]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // ─── Socket: join / leave rooms ──────────────────────────────────────────

  useEffect(() => {
    if (prevSelectedId.current) leaveConversation(prevSelectedId.current);
    if (selectedId) joinConversation(selectedId);
    prevSelectedId.current = selectedId;
  }, [selectedId, joinConversation, leaveConversation]);

  // ─── Socket: new message ─────────────────────────────────────────────────

  useEffect(() => {
    return on<{
      conversationId: string;
      message: Message;
      conversationPreview: { text: string; sentAt: string };
    }>('message:new', ({ conversationId, message, conversationPreview }) => {
      if (conversationId === selectedId) {
        setLocalMessages((prev) =>
          prev.find((m) => m._id === message._id) ? prev : [...prev, message],
        );
      }
      setLocalConvs((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: {
                  messageId: message._id,
                  text: conversationPreview.text,
                  sentAt: conversationPreview.sentAt,
                },
                unread: c._id === selectedId ? 0 : (c.unread ?? 0) + 1,
              }
            : c,
        ),
      );
    });
  }, [on, selectedId]);

  // ─── Socket: read receipt ────────────────────────────────────────────────

  useEffect(() => {
    return on<{ messageId: string; readerId: string }>('message:read', ({ messageId, readerId }) => {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m._id === messageId && !m.readBy.includes(readerId)
            ? { ...m, readBy: [...m.readBy, readerId] }
            : m,
        ),
      );
    });
  }, [on]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: messagesApi.sendMessage,
    onSuccess: ({ message }) => {
      setLocalMessages((prev) =>
        prev.find((m) => m._id === message._id) ? prev : [...prev, message],
      );
      setLocalConvs((prev) =>
        prev.map((c) =>
          c._id === selectedId
            ? {
                ...c,
                lastMessage: { messageId: message._id, text: message.content, sentAt: message.createdAt },
              }
            : c,
        ),
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      conversationsApi.archiveConversation(id, archive),
    onSuccess: (_, { id }) => {
      setLocalConvs((prev) => prev.filter((c) => c._id !== id));
      if (selectedId === id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: conversationsApi.markAllAsRead,
    onSuccess: (_, id) => {
      setLocalConvs((prev) => prev.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (conv: Conversation) => {
      setSelectedId(conv._id);
      setInput('');
      setLocalConvs((prev) => prev.map((c) => (c._id === conv._id ? { ...c, unread: 0 } : c)));
      if ((conv.unread ?? 0) > 0) markReadMutation.mutate(conv._id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSend = () => {
    const content = input.trim();
    if (!content || !selectedId) return;
    setInput('');
    sendMutation.mutate({ conversationId: selectedId, content });
  };

  // ─── Derived values ───────────────────────────────────────────────────────

  const selectedConv = localConvs.find((c) => c._id === selectedId) ?? null;
  const otherParticipant = selectedConv ? getOtherParticipant(selectedConv, user?.sub ?? '') : undefined;
  const messageGroups = groupMessagesByDate(localMessages);
  const totalUnread = localConvs.reduce((sum, c) => sum + (c.unread ?? 0), 0);

  if (convsLoading) return <Spinner fullPage />;

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {localConvs.length} conversation{localConvs.length !== 1 ? 's' : ''}
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 font-medium">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Offline</span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex h-[640px]">

        {/* ── Conversation list ──────────────────────────────────────── */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chats</p>
          </div>

          {localConvs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <MessageSquare className="w-9 h-9 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No conversations yet</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {localConvs.map((conv) => {
                const other = getOtherParticipant(conv, user?.sub ?? '');
                const isActive = selectedId === conv._id;
                const hasUnread = (conv.unread ?? 0) > 0;

                return (
                  <div
                    key={conv._id}
                    className={clsx(
                      'group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 transition-colors',
                      isActive ? 'bg-violet-50 border-l-2 border-l-violet-500' : 'hover:bg-gray-50',
                    )}
                    onClick={() => handleSelect(conv)}
                  >
                    <Avatar participant={other} size="md" />

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={clsx(
                            'text-sm truncate',
                            hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
                          )}
                        >
                          {participantName(other)}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {conv.lastMessage && (
                            <span className="text-[10px] text-gray-400">
                              {formatListTime(conv.lastMessage.sentAt)}
                            </span>
                          )}
                          {hasUnread && (
                            <span className="min-w-[16px] h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                              {conv.unread > 9 ? '9+' : conv.unread}
                            </span>
                          )}
                        </div>
                      </div>

                      {conv.lastMessage ? (
                        <p className={clsx('text-xs truncate mt-0.5', hasUnread ? 'text-gray-600' : 'text-gray-400')}>
                          {conv.lastMessage.text}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5 italic">No messages yet</p>
                      )}

                      {conv.jobId && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-violet-500">
                          <Briefcase className="w-2.5 h-2.5" />
                          {typeof conv.jobId === 'object'
                            ? (conv.jobId as { title: string }).title
                            : 'Job context'}
                        </span>
                      )}
                    </div>

                    {/* Archive on hover */}
                    <button
                      className="absolute right-2 top-3 hidden group-hover:flex p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveMutation.mutate({ id: conv._id, archive: true });
                      }}
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Chat panel ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-14 h-14 text-gray-100 mb-4" />
              <p className="font-medium text-gray-400">Select a conversation</p>
              <p className="text-sm text-gray-300 mt-1">Choose one from the list to start chatting</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar participant={otherParticipant} size="md" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">
                      {participantName(otherParticipant)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{otherParticipant?.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {(selectedConv?.unread ?? 0) > 0 && (
                    <button
                      onClick={() => markReadMutation.mutate(selectedId)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 px-2 py-1 rounded-md hover:bg-violet-50 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => archiveMutation.mutate({ id: selectedId, archive: true })}
                    className="p-1.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Archive conversation"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {roomLoading ? (
                  <div className="flex justify-center pt-8"><Spinner /></div>
                ) : messageGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-gray-100 mb-3" />
                    <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messageGroups.map(({ date, messages: group }) => (
                      <div key={date.toISOString()}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-5">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[11px] font-medium text-gray-400 shrink-0">
                            {dateSeparatorLabel(date)}
                          </span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        {group.map((msg) => {
                          const senderId =
                            typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId as User)._id;
                          const isMine = senderId === user?.sub;
                          const isReadByOther = msg.readBy?.some((id) => id !== user?.sub);

                          return (
                            <div
                              key={msg._id}
                              className={clsx('flex mb-2.5', isMine ? 'justify-end' : 'justify-start')}
                            >
                              {!isMine && (
                                <div className="mr-2 self-end">
                                  <Avatar participant={otherParticipant} size="sm" />
                                </div>
                              )}
                              <div
                                className={clsx(
                                  'flex flex-col max-w-[65%]',
                                  isMine ? 'items-end' : 'items-start',
                                )}
                              >
                                <div
                                  className={clsx(
                                    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                                    isMine
                                      ? 'bg-violet-600 text-white rounded-tr-sm'
                                      : 'bg-gray-100 text-gray-900 rounded-tl-sm',
                                  )}
                                >
                                  {msg.content}
                                </div>
                                <div
                                  className={clsx(
                                    'flex items-center gap-1 mt-0.5',
                                    isMine ? 'flex-row-reverse' : 'flex-row',
                                  )}
                                >
                                  <span className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</span>
                                  {isMine && (
                                    <CheckCheck
                                      className={clsx(
                                        'w-3 h-3',
                                        isReadByOther ? 'text-violet-500' : 'text-gray-300',
                                      )}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-5 py-3.5 border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message… (Shift+Enter for new line)"
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-colors min-h-[42px] max-h-32 overflow-y-auto"
                  />
                  <button
                    disabled={!input.trim() || sendMutation.isPending}
                    onClick={handleSend}
                    className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {sendMutation.isPending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
