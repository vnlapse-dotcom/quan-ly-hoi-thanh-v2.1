import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, UserProfile } from '../types';
import { getAvatarUrl } from '../lib/utils';
import { handleFirestoreError, OperationType, parseDate } from '../lib/firebaseUtils';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  MoreVertical,
  Trash2,
  X,
  User,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface TasksProps {
  user: UserProfile;
}

export default function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    status: 'todo',
    priority: 'medium'
  });

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setPersonnel(snap.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'tasks';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        status: 'todo',
        assignedBy: user.uid,
        createdAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: 'todo',
        priority: 'medium'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus: Task['status'] = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
    const path = `tasks/${task.id}`;
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa công việc này?')) return;
    const path = `tasks/${id}`;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filteredTasks = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);

  const priorityColors = {
    low: 'bg-neutral-100 text-neutral-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-red-100 text-red-600'
  };

  const statusIcons = {
    todo: Circle,
    'in-progress': Clock,
    done: CheckCircle2
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
           {(['all', 'todo', 'in-progress', 'done'] as const).map(s => (
             <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm",
                statusFilter === s 
                  ? "bg-church-navy text-white shadow-church-navy/20" 
                  : "bg-white text-neutral-400 border border-neutral-100 hover:border-church-navy hover:text-church-navy"
              )}
             >
               {s === 'all' ? 'Tất cả' : s === 'todo' ? 'Cần làm' : s === 'in-progress' ? 'Đang làm' : 'Hoàn thành'}
             </button>
           ))}
        </div>
        {['admin', 'pastor'].includes(user.role) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-church-navy text-white px-8 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-all shadow-xl shadow-church-navy/20 w-full sm:w-auto active:scale-95 group"
          >
            <Plus className="w-5 h-5 text-church-gold group-hover:rotate-90 transition-transform duration-500" />
            Giao việc mới
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {(['todo', 'in-progress', 'done'] as const).map((status) => (
          <div key={status} className="space-y-6">
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-2xl border border-neutral-100 shadow-sm glass">
               <h3 className="font-black text-neutral-400 uppercase tracking-[.2em] text-[10px] flex items-center gap-2">
                 <div className={cn(
                   "w-2 h-2 rounded-full",
                   status === 'todo' ? "bg-neutral-300" : status === 'in-progress' ? "bg-blue-500" : "bg-emerald-500"
                 )} />
                 {status === 'todo' ? 'Cần làm' : status === 'in-progress' ? 'Đang thực hiện' : 'Đã hoàn thành'}
               </h3>
               <span className="bg-neutral-100 text-neutral-500 text-[10px] font-black px-3 py-1 rounded-full">
                 {tasks.filter(t => t.status === status).length}
               </span>
            </div>
            
            <div className="space-y-6 min-h-[200px]">
              <AnimatePresence mode="popLayout">
                {tasks.filter(t => t.status === status).map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setViewingTask(task)}
                    className="bg-white p-8 rounded-4xl border border-neutral-100 shadow-sm card-hover group cursor-pointer active:scale-[0.98] glass ring-1 ring-black/5"
                  >
                    <div className="flex items-start justify-between mb-4">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(task);
                        }}
                        className={cn(
                          "p-2 rounded-2xl transition-all",
                          task.status === 'done' ? "bg-emerald-50 text-emerald-500" : "bg-neutral-50 text-neutral-300 hover:text-church-navy"
                        )}
                       >
                         {React.createElement(statusIcons[task.status], { className: "w-5 h-5" })}
                       </button>
                       <div className="flex items-center gap-2">
                          <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm", priorityColors[task.priority])}>
                            {task.priority}
                          </span>
                          {['admin', 'pastor'].includes(user.role) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }} 
                              className="p-2 text-neutral-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                    </div>

                    <h4 className={cn("text-lg font-display font-black text-church-navy mb-2 group-hover:text-church-gold transition-colors", task.status === 'done' && "line-through opacity-50")}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-neutral-500 mb-6 line-clamp-2 leading-relaxed italic">"{task.description}"</p>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-neutral-50 mt-4">
                       <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl border-2 border-white shadow-md overflow-hidden bg-white">
                              <img 
                                src={getAvatarUrl(
                                  personnel.find(p => p.uid === task.assignedTo)?.displayName || 'User',
                                  personnel.find(p => p.uid === task.assignedTo)?.photoURL
                                )} 
                                alt="Assigned" 
                                className="w-full h-full object-cover" 
                              />
                           </div>
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate max-w-[100px]">
                            {personnel.find(p => p.uid === task.assignedTo)?.displayName || 'Chưa rõ'}
                          </span>
                       </div>
                       {task.dueDate && (
                         <div className="flex items-center gap-1.5 text-[9px] font-black text-neutral-300 uppercase tracking-widest group-hover:text-church-navy transition-colors">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseDate(task.dueDate), 'dd/MM')}
                         </div>
                       )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* View Task Detail Modal */}
      <AnimatePresence>
        {viewingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center",
                     viewingTask.status === 'done' ? "bg-green-100 text-green-600" : "bg-neutral-200 text-neutral-500"
                   )}>
                      {React.createElement(statusIcons[viewingTask.status], { className: "w-5 h-5 sm:w-6 sm:h-6" })}
                   </div>
                   <h3 className="text-lg sm:text-xl font-bold text-neutral-900">Chi tiết công việc</h3>
                </div>
                <button onClick={() => setViewingTask(null)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider", priorityColors[viewingTask.priority])}>
                          Ưu tiên {viewingTask.priority}
                       </span>
                       <span className={cn(
                         "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                         viewingTask.status === 'todo' ? "bg-neutral-100 text-neutral-600" : 
                         viewingTask.status === 'in-progress' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                       )}>
                          {viewingTask.status === 'todo' ? 'Cần làm' : viewingTask.status === 'in-progress' ? 'Đang làm' : 'Hoàn thành'}
                       </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight">{viewingTask.title}</h2>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <User className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Người thực hiện</p>
                          <p className="text-sm font-bold text-neutral-900">
                             {personnel.find(p => p.uid === viewingTask.assignedTo)?.displayName || 'Chưa rõ'}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Calendar className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Hạn chót</p>
                          <p className="text-sm font-bold text-neutral-900">
                             {viewingTask.dueDate ? format(parseDate(viewingTask.dueDate), 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Không có'}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-xs sm:text-sm font-black text-neutral-900 uppercase tracking-wider">Mô tả công việc</h4>
                    <div className="p-4 sm:p-6 bg-neutral-50 rounded-2xl sm:rounded-3xl border border-neutral-100">
                       <p className="text-sm sm:text-base text-neutral-600 leading-relaxed whitespace-pre-wrap">
                          {viewingTask.description || 'Không có mô tả chi tiết cho công việc này.'}
                       </p>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        toggleStatus(viewingTask);
                        setViewingTask(null);
                      }}
                      className="flex-1 py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-800 transition-all"
                    >
                      {viewingTask.status === 'done' ? 'Mở lại' : 'Đánh dấu hoàn thành'}
                    </button>
                    <button 
                      onClick={() => setViewingTask(null)}
                      className="px-8 py-4 sm:py-5 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                    >
                      Đóng
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-900">Giao việc mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Tiêu đề công việc</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    placeholder="VD: Chuẩn bị hoa cho lễ Chúa Nhật"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Người thực hiện</label>
                    <select 
                      required
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    >
                      <option value="">Chọn nhân sự...</option>
                      {personnel.map(p => (
                        <option key={p.uid} value={p.uid}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Hạn chót</label>
                    <input 
                      type="datetime-local" 
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Ưu tiên</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Mô tả</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none text-sm sm:text-base"
                    placeholder="Chi tiết công việc..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-colors text-base sm:text-lg"
                >
                  Giao việc
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
