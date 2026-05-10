import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  MoreVertical,
  Trash2,
  Edit2,
  X,
  Filter,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ActivitiesProps {
  user: UserProfile;
}

export default function Activities({ user }: ActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [filter, setFilter] = useState<Activity['type'] | 'all'>('all');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Activity>>({
    title: '',
    description: '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    type: 'service'
  });

  useEffect(() => {
    const path = 'activities';
    const q = query(collection(db, path), orderBy('startTime', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to string for local Activity type if needed
        return { 
          id: doc.id, 
          ...data,
          startTime: data.startTime instanceof Timestamp ? data.startTime.toDate().toISOString() : data.startTime,
          endTime: data.endTime instanceof Timestamp ? data.endTime.toDate().toISOString() : data.endTime,
        } as Activity;
      }));
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
    return () => unsub();
  }, []);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'activities';
    try {
      const activityData = {
        ...formData,
        startTime: Timestamp.fromDate(new Date(formData.startTime!))
      };
      await addDoc(collection(db, path), activityData);
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        location: '',
        type: 'service'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa hoạt động này?')) return;
    const path = `activities/${id}`;
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filteredActivities = activities.filter(a => filter === 'all' || a.type === filter);

  const typeColors: Record<Activity['type'], string> = {
    service: 'bg-blue-100 text-blue-700',
    meeting: 'bg-purple-100 text-purple-700',
    event: 'bg-amber-100 text-amber-700',
    prayer: 'bg-green-100 text-green-700'
  };

  const typeLabels: Record<Activity['type'], string> = {
    service: 'Thờ phượng',
    meeting: 'Họp ban ngành',
    event: 'Sự kiện',
    prayer: 'Cầu nguyện'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'service', 'meeting', 'event', 'prayer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm",
                filter === t 
                  ? "bg-church-navy text-white shadow-church-navy/20" 
                  : "bg-white text-neutral-400 border border-neutral-100 hover:border-church-navy hover:text-church-navy"
              )}
            >
              {t === 'all' ? 'Tất cả' : typeLabels[t as Activity['type']]}
            </button>
          ))}
        </div>
        {['admin', 'pastor', 'staff'].includes(user.role) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-church-navy text-white px-8 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-all shadow-xl shadow-church-navy/20 w-full sm:w-auto active:scale-95"
          >
            <Plus className="w-5 h-5 text-church-gold" />
            Tạo hoạt động
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredActivities.map((activity, idx) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 sm:p-8 rounded-4xl border border-neutral-100 shadow-sm card-hover flex flex-row items-center gap-8 group glass"
            >
              <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex flex-col items-center justify-center border border-neutral-100 flex-shrink-0 group-hover:bg-church-navy transition-all duration-500">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-church-gold/60">{format(new Date(activity.startTime), 'MMM', { locale: vi })}</span>
                <span className="text-3xl font-display font-black text-church-navy leading-none group-hover:text-white">{format(new Date(activity.startTime), 'dd')}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                  <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit shadow-sm", typeColors[activity.type])}>
                    {typeLabels[activity.type]}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-display font-black text-church-navy truncate group-hover:text-church-gold transition-colors">{activity.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-neutral-500 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-300" />
                    <span className="text-neutral-900 font-bold">{format(new Date(activity.startTime), 'HH:mm', { locale: vi })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neutral-300" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{activity.location || 'Hội thánh'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 {['admin', 'pastor', 'staff'].includes(user.role) && (
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(activity.id);
                    }}
                    className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button 
                  onClick={() => setViewingActivity(activity)}
                  className="p-4 bg-neutral-50 group-hover:bg-church-navy rounded-2xl sm:rounded-3xl transition-all active:scale-90"
                 >
                    <ChevronRight className="w-6 h-6 text-neutral-300 group-hover:text-white transition-colors" />
                 </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredActivities.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-300">
             <CalendarIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
             <p className="text-neutral-500 font-medium">Không có hoạt động nào được tìm thấy</p>
          </div>
        )}
      </div>

      {/* View Activity Detail Modal */}
      <AnimatePresence>
        {viewingActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-32 sm:h-48 bg-neutral-900 flex items-center justify-center">
                 <CalendarIcon className="w-12 h-12 sm:w-20 sm:h-20 text-white/20" />
                 <button 
                  onClick={() => setViewingActivity(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-8">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 inline-block", typeColors[viewingActivity.type])}>
                      {typeLabels[viewingActivity.type]}
                    </span>
                    <h3 className="text-xl sm:text-3xl font-black text-white">{viewingActivity.title}</h3>
                 </div>
              </div>
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Clock className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Thời gian</p>
                          <p className="text-sm font-bold text-neutral-900">{format(new Date(viewingActivity.startTime), 'HH:mm, dd/MM/yyyy', { locale: vi })}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <MapPin className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Địa điểm</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingActivity.location || 'Hội thánh'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Mô tả chi tiết</h4>
                    <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                       <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                          {viewingActivity.description || 'Không có mô tả chi tiết cho hoạt động này.'}
                       </p>
                    </div>
                 </div>

                 <button 
                  onClick={() => setViewingActivity(null)}
                  className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all"
                 >
                   Đóng
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Activity Modal */}
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
                <h3 className="text-xl font-bold text-neutral-900">Tạo hoạt động mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddActivity} className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Tên hoạt động</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    placeholder="VD: Lễ thờ phượng sáng Chúa Nhật"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Loại</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    >
                      <option value="service">Thờ phượng</option>
                      <option value="meeting">Họp ban ngành</option>
                      <option value="event">Sự kiện</option>
                      <option value="prayer">Cầu nguyện</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Thời gian</label>
                    <input 
                      required
                      type="datetime-local" 
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Địa điểm</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    placeholder="VD: Nhà thờ chính"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Mô tả</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none text-sm sm:text-base"
                    placeholder="Nội dung chi tiết..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-colors text-base sm:text-lg"
                >
                  Lưu hoạt động
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
