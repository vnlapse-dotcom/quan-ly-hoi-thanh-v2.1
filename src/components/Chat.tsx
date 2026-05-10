import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp,
  setDoc,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, ChatRoom, ChatMessage, Task } from '../types';
import { 
  Send, 
  User, 
  Search, 
  Plus, 
  X, 
  CheckSquare, 
  Clock,
  MessageCircle,
  ChevronLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn, getAvatarUrl } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole component, but we log it
}

interface ChatProps {
  user: UserProfile;
}

export default function Chat({ user }: ChatProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task form state
  const [taskData, setTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    priority: 'medium'
  });

  useEffect(() => {
    // Fetch rooms where current user is a participant
    // Removed orderBy to avoid composite index requirement
    const q = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubRooms = onSnapshot(q, (snap) => {
      const fetchedRooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      // Sort in memory instead
      fetchedRooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRooms(fetchedRooms);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat_rooms');
      setError('Không thể tải danh sách cuộc trò chuyện.');
      setLoading(false);
    });

    // Fetch all users for starting new chats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== user.uid));
      setUsersLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setUsersLoading(false);
    });

    return () => {
      unsubRooms();
      unsubUsers();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chat_rooms/${activeRoom.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chat_rooms/${activeRoom.id}/messages`);
    });

    return () => unsubMessages();
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeRoom) return;

    const text = messageInput.trim();
    setMessageInput('');

    try {
      const messageData = {
        roomId: activeRoom.id,
        senderId: user.uid,
        text,
        createdAt: new Date().toISOString(),
        type: 'text'
      };

      await addDoc(collection(db, `chat_rooms/${activeRoom.id}/messages`), messageData);
      
      await updateDoc(doc(db, 'chat_rooms', activeRoom.id), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Send message failed:', error);
    }
  };

  const handleCreateRoom = async (otherUser: UserProfile) => {
    // Check if room already exists
    const existingRoom = rooms.find(r => r.participants.includes(otherUser.uid));
    if (existingRoom) {
      setActiveRoom(existingRoom);
      setIsNewChatModalOpen(false);
      return;
    }

    try {
      const roomData = {
        participants: [user.uid, otherUser.uid],
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'chat_rooms'), roomData);
      const newRoom = { id: docRef.id, ...roomData } as ChatRoom;
      setRooms(prev => [newRoom, ...prev]);
      setActiveRoom(newRoom);
      setIsNewChatModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chat_rooms');
      alert('Không thể tạo cuộc trò chuyện mới. Vui lòng thử lại.');
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !taskData.title) return;

    const otherUserId = activeRoom.participants.find(id => id !== user.uid);
    if (!otherUserId) return;

    try {
      // 1. Create the task
      const taskRef = await addDoc(collection(db, 'tasks'), {
        ...taskData,
        assignedTo: otherUserId,
        assignedBy: user.uid,
        status: 'todo',
        createdAt: new Date().toISOString()
      });

      // 2. Send a message about the task
      const messageData = {
        roomId: activeRoom.id,
        senderId: user.uid,
        text: `Đã giao công việc: ${taskData.title}`,
        createdAt: new Date().toISOString(),
        type: 'task',
        taskId: taskRef.id
      };

      await addDoc(collection(db, `chat_rooms/${activeRoom.id}/messages`), messageData);

      // 3. Update room
      await updateDoc(doc(db, 'chat_rooms', activeRoom.id), {
        lastMessage: `Đã giao công việc: ${taskData.title}`,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setIsTaskModalOpen(false);
      setTaskData({
        title: '',
        description: '',
        dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Assign task failed:', error);
    }
  };

  const getOtherParticipant = (room: ChatRoom) => {
    const otherId = room.participants.find(id => id !== user.uid);
    return users.find(u => u.uid === otherId);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[2.5rem] border border-neutral-200 overflow-hidden shadow-sm">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "w-full sm:w-80 border-r border-neutral-100 flex flex-col bg-neutral-50/50",
        activeRoom ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-6 border-b border-neutral-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-neutral-900">Tin nhắn</h3>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full"
              />
              <p className="text-xs text-neutral-400 font-medium">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">{error}</p>
            </div>
          ) : rooms.filter(room => {
            const otherUser = getOtherParticipant(room);
            return otherUser?.displayName.toLowerCase().includes(roomSearchQuery.toLowerCase());
          }).length > 0 ? rooms.filter(room => {
            const otherUser = getOtherParticipant(room);
            return otherUser?.displayName.toLowerCase().includes(roomSearchQuery.toLowerCase());
          }).map((room) => {
            const otherUser = getOtherParticipant(room);
            if (!otherUser) return null;

            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                  activeRoom?.id === room.id ? "bg-white shadow-md border-neutral-100" : "hover:bg-white/50"
                )}
              >
                <div className="relative">
                  <img 
                    src={getAvatarUrl(otherUser.displayName, otherUser.photoURL)} 
                    alt={otherUser.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-neutral-100"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-neutral-900 truncate">{otherUser.displayName}</h4>
                    {room.lastMessageAt && (
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {format(new Date(room.lastMessageAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">
                    {room.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>
              </button>
            );
          }) : (
            <div className="text-center py-10 px-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-sm text-neutral-500">Chưa có cuộc trò chuyện nào. Hãy bắt đầu nhắn tin!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-white",
        !activeRoom ? "hidden sm:flex items-center justify-center bg-neutral-50/30" : "flex"
      )}>
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveRoom(null)}
                  className="sm:hidden p-2 hover:bg-neutral-100 rounded-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                  <img 
                    src={getAvatarUrl(getOtherParticipant(activeRoom)?.displayName || 'User', getOtherParticipant(activeRoom)?.photoURL)} 
                    alt="User"
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-100"
                  />
                  <div>
                    <h3 className="font-bold text-neutral-900">{getOtherParticipant(activeRoom)?.displayName}</h3>
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Đang hoạt động</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['admin', 'pastor', 'staff'].includes(user.role) && (
                  <button 
                    onClick={() => setIsTaskModalOpen(true)}
                    className="p-2.5 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-900 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Giao việc</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user.uid;
                const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;

                return (
                  <div key={msg.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                    {!isMe && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar && (
                          <img 
                            src={getAvatarUrl(getOtherParticipant(activeRoom)?.displayName || 'User', getOtherParticipant(activeRoom)?.photoURL)} 
                            alt="User"
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div className={cn("max-w-[80%] sm:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                        isMe 
                          ? "bg-neutral-900 text-white rounded-tr-none" 
                          : "bg-neutral-100 text-neutral-900 rounded-tl-none",
                        msg.type === 'task' && "border-2 border-blue-500 bg-blue-50 text-blue-900"
                      )}>
                        {msg.type === 'task' && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200">
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                            <span className="font-black uppercase text-[10px] tracking-widest">Công việc mới</span>
                          </div>
                        )}
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block px-1">
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 sm:p-6 bg-white border-t border-neutral-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input 
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-6 py-4 bg-neutral-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-4 bg-neutral-900 text-white rounded-2xl hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neutral-200"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="w-24 h-24 bg-neutral-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-12 h-12 text-neutral-300" />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 mb-2">Chọn một cuộc trò chuyện</h3>
            <p className="text-neutral-500 max-w-xs mx-auto">Kết nối với các thành viên khác trong Hội thánh để trao đổi công việc và thông tin.</p>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-8 px-8 py-4 bg-neutral-900 text-white rounded-2xl font-black hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200"
            >
              Bắt đầu trò chuyện mới
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-2xl font-black text-neutral-900">Trò chuyện mới</h3>
                <button onClick={() => setIsNewChatModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm nhân sự..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  {usersLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full"
                      />
                      <p className="text-xs text-neutral-400 font-medium">Đang tải danh sách...</p>
                    </div>
                  ) : users.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                    users.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                      <button
                        key={u.uid}
                        onClick={() => handleCreateRoom(u)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-neutral-50 transition-all text-left border border-transparent hover:border-neutral-100"
                      >
                        <img 
                          src={getAvatarUrl(u.displayName, u.photoURL)} 
                          alt={u.displayName}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-neutral-900">{u.displayName}</h4>
                          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">{u.role}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-neutral-500">Không tìm thấy nhân sự nào.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-neutral-900">Giao việc cho {getOtherParticipant(activeRoom!)?.displayName}</h3>
                </div>
                <button onClick={() => setIsTaskModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAssignTask} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Tiêu đề công việc</label>
                  <input 
                    required
                    type="text" 
                    value={taskData.title}
                    onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="VD: Soạn bài hát cho Chúa Nhật tới"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Hạn chót</label>
                    <input 
                      required
                      type="datetime-local" 
                      value={taskData.dueDate}
                      onChange={(e) => setTaskData({...taskData, dueDate: e.target.value})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Ưu tiên</label>
                    <select 
                      value={taskData.priority}
                      onChange={(e) => setTaskData({...taskData, priority: e.target.value as any})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Mô tả chi tiết</label>
                  <textarea 
                    rows={3}
                    value={taskData.description}
                    onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                    placeholder="Ghi chú thêm về công việc..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200"
                >
                  Giao việc & Gửi tin nhắn
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
