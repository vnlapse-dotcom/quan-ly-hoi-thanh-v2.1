export type UserRole = 'admin' | 'pastor' | 'accountant' | 'staff' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isApproved: boolean;
  isEmailVerified: boolean;
  ministryId?: string;
  phone?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  position?: string;
}

export interface Ministry {
  id: string;
  name: string;
  leaderId?: string;
  description?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'service' | 'meeting' | 'event' | 'prayer';
}

export interface PrayerTopic {
  id: string;
  topic: string;
  description?: string;
  date: string;
  assignedTo?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  recordedBy: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  dueDate?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  chatMessageId?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
  type: 'text' | 'task';
  taskId?: string;
}
