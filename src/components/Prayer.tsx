import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PrayerTopic, UserProfile } from '../types';
import { getAvatarUrl } from '../lib/utils';
import { handleFirestoreError, OperationType, parseDate } from '../lib/firebaseUtils';
import { 
  Plus, 
  Heart, 
  User, 
  Calendar, 
  Trash2,
  X,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface PrayerProps {
  user: UserProfile;
}

export default function Prayer({ user }: PrayerProps) {
  const [topics, setTopics] = useState<PrayerTopic[]>([]);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTopic, setViewingTopic] = useState<PrayerTopic | null>(null);
  
  const [formData, setFormData] = useState<Partial<PrayerTopic>>({
    topic: '',
    description: '',
    date: format(new Date(), "yyyy-MM-dd"),
    assignedTo: ''
  });

  useEffect(() => {
    const unsubTopics = onSnapshot(query(collection(db, 'prayer_topics'), orderBy('date', 'desc')), (snap) => {
      setTopics(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerTopic)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setPersonnel(snap.docs.map(doc => doc.data() as UserProfile));
    });
    return () => {
      unsubTopics();
      unsubUsers();
    };
  }, []);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'prayer_topics'), formData);
      setIsModalOpen(false);
      setFormData({ topic: '', description: '', date: format(new Date(), "yyyy-MM-dd"), assignedTo: '' });
    } catch (error) {
      console.error('Add topic failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa vấn đề cầu nguyện này?')) return;
    try {
      await deleteDoc(doc(db, 'prayer_topics', id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm glass">
        <div>
          <h3 className="text-3xl sm:text-4xl font-display font-black text-church-navy mb-2">Lịch Cầu Nguyện</h3>
          <p className="text-neutral-500 font-medium max-w-md italic">"Vì nơi nào có hai ba người nhân danh Ta nhóm nhau lại, thì Ta ở giữa họ." (Ma-thi-ơ 18:20)</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-church-navy text-white px-10 py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-neutral-900 transition-all shadow-xl shadow-church-navy/20 w-full lg:w-auto active:scale-95 group"
        >
          <Plus className="w-6 h-6 text-church-gold group-hover:rotate-90 transition-transform duration-500" />
          Thêm vấn đề cầu nguyện
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence>
          {topics.map((t, idx) => {
            const assigned = personnel.find(p => p.uid === t.assignedTo);
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setViewingTopic(t)}
                className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm card-hover group relative overflow-hidden cursor-pointer active:scale-[0.98] glass ring-1 ring-black/5"
              >
                <div className="absolute top-0 right-0 p-8">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(t.id);
                    }}
                    className="p-3 text-neutral-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-6 h-6" />
                   </button>
                </div>

                <div className="flex items-center gap-6 mb-8">
                   <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-rose-500 group-hover:scale-110 transition-all duration-500">
                      <Heart className="w-8 h-8 text-rose-500 fill-rose-500 group-hover:text-white group-hover:fill-white transition-all" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[.3em] mb-1">{format(parseDate(t.date), 'EEEE, dd/MM/yyyy', { locale: vi })}</p>
                      <h4 className="text-2xl font-display font-black text-church-navy group-hover:text-church-gold transition-colors">{t.topic}</h4>
                   </div>
                </div>

                <div className="bg-neutral-50/50 p-6 sm:p-8 rounded-[2rem] mb-8 border border-neutral-100/50 relative">
                   <MessageSquare className="absolute -top-3 -right-3 w-8 h-8 text-neutral-100 group-hover:text-church-gold/10" />
                   <p className="text-base text-neutral-600 leading-relaxed italic line-clamp-3">
                     "{t.description || 'Không có mô tả chi tiết cho vấn đề này.'}"
                   </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md group-hover:border-church-gold transition-all">
                         <img 
                           src={getAvatarUrl(assigned?.displayName || 'User', assigned?.photoURL)} 
                           alt="Assigned" 
                           className="w-full h-full object-cover" 
                         />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Cầu thay bởi</p>
                         <p className="text-sm font-bold text-church-navy group-hover:text-church-gold transition-colors">{assigned?.displayName || 'Tất cả Hội thánh'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-neutral-300 group-hover:text-church-gold transition-colors">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Amen</span>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* View Prayer Detail Modal */}
      <AnimatePresence>
        {viewingTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-32 sm:h-40 bg-red-500 flex items-center justify-center">
                 <Heart className="w-16 h-16 sm:w-20 sm:h-20 text-white/20 fill-white/20" />
                 <button 
                  onClick={() => setViewingTopic(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-8">
                    <p className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Vấn đề cầu nguyện</p>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{viewingTopic.topic}</h3>
                 </div>
              </div>
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div className="flex items-center gap-4 p-4 sm:p-6 bg-neutral-50 rounded-2xl sm:rounded-3xl border border-neutral-100">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm overflow-hidden border border-neutral-100">
                       <img 
                         src={getAvatarUrl(
                           personnel.find(p => p.uid === viewingTopic.assignedTo)?.displayName || 'User',
                           personnel.find(p => p.uid === viewingTopic.assignedTo)?.photoURL
                         )} 
                         alt="Assigned" 
                         className="w-full h-full object-cover" 
                       />
                    </div>
                    <div>
                       <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">Người phụ trách</p>
                       <p className="text-base sm:text-lg font-black text-neutral-900">
                          {personnel.find(p => p.uid === viewingTopic.assignedTo)?.displayName || 'Tất cả mọi người'}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-xs sm:text-sm font-black text-neutral-900 uppercase tracking-wider">Chi tiết vấn đề</h4>
                    <div className="p-4 sm:p-6 bg-neutral-50 rounded-2xl sm:rounded-3xl border border-neutral-100">
                       <p className="text-sm sm:text-base text-neutral-600 leading-relaxed italic whitespace-pre-wrap">
                          "{viewingTopic.description || 'Không có mô tả chi tiết cho vấn đề này.'}"
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <Calendar className="w-5 h-5 text-red-500" />
                    <span className="text-sm sm:text-base font-bold text-red-900">Ngày đăng: {format(parseDate(viewingTopic.date), 'dd/MM/yyyy', { locale: vi })}</span>
                 </div>

                 <button 
                  onClick={() => setViewingTopic(null)}
                  className="w-full py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-800 transition-all"
                 >
                   Đóng
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Prayer Topic Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-neutral-900">Thêm vấn đề cầu nguyện</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddTopic} className="p-6 sm:p-10 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Vấn đề cầu nguyện</label>
                  <input 
                    required
                    type="text" 
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm sm:text-base"
                    placeholder="VD: Cầu nguyện cho buổi truyền giảng"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Ngày</label>
                    <input 
                      required
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Người phụ trách</label>
                    <select 
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    >
                      <option value="">Tất cả mọi người</option>
                      {personnel.map(p => (
                        <option key={p.uid} value={p.uid}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Chi tiết vấn đề</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none text-sm sm:text-base"
                    placeholder="Nội dung cầu nguyện cụ thể..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-800 transition-all"
                >
                  Lưu vấn đề
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
