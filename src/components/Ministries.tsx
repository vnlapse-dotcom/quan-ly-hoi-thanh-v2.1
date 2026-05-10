import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ministry, UserProfile } from '../types';
import { 
  Plus, 
  UsersRound, 
  User, 
  MoreVertical,
  Trash2,
  X,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getAvatarUrl } from '../lib/utils';

interface MinistriesProps {
  user: UserProfile;
}

export default function Ministries({ user }: MinistriesProps) {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMinistry, setViewingMinistry] = useState<Ministry | null>(null);
  
  const [formData, setFormData] = useState<Partial<Ministry>>({
    name: '',
    description: '',
    leaderId: ''
  });

  useEffect(() => {
    const unsubMinistries = onSnapshot(collection(db, 'ministries'), (snap) => {
      setMinistries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ministry)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setPersonnel(snap.docs.map(doc => doc.data() as UserProfile));
    });
    return () => {
      unsubMinistries();
      unsubUsers();
    };
  }, []);

  const handleAddMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'ministries'), formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', leaderId: '' });
    } catch (error) {
      console.error('Add ministry failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa ban ngành này?')) return;
    try {
      await deleteDoc(doc(db, 'ministries', id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-display font-black text-church-navy">Ban Ngành & Mục Vụ</h3>
          <p className="text-neutral-500 font-medium">Quản lý các ban ngành và đội cộng tác trong Hội thánh.</p>
        </div>
        {['admin', 'pastor'].includes(user.role) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-church-navy text-white px-8 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-all shadow-xl shadow-church-navy/20 w-full sm:w-auto active:scale-95 group"
          >
            <Plus className="w-5 h-5 text-church-gold group-hover:rotate-90 transition-transform duration-500" />
            Thêm ban ngành
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {ministries.map((m, idx) => {
            const leader = personnel.find(p => p.uid === m.leaderId);
            const memberCount = personnel.filter(p => p.ministryId === m.id).length;

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setViewingMinistry(m)}
                className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm card-hover group cursor-pointer active:scale-[0.98] glass ring-1 ring-black/5"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 bg-church-navy rounded-3xl flex items-center justify-center shadow-2xl shadow-church-navy/30 group-hover:bg-church-gold transition-all duration-500">
                    <UsersRound className="w-8 h-8 text-white group-hover:text-church-navy transition-colors" />
                  </div>
                  {['admin', 'pastor'].includes(user.role) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(m.id);
                      }}
                      className="p-3 text-neutral-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <h4 className="text-2xl font-display font-black text-church-navy mb-3 group-hover:text-church-gold transition-colors">{m.name}</h4>
                <p className="text-neutral-500 text-sm mb-10 line-clamp-2 leading-relaxed">{m.description || 'Chưa có mô tả cho ban ngành này.'}</p>

                <div className="space-y-6">
                   <div className="flex items-center justify-between p-5 bg-neutral-50/50 rounded-3xl border border-neutral-100/50 group-hover:bg-church-navy/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border-2 border-white shadow-md group-hover:border-church-gold transition-all">
                            <img src={getAvatarUrl(leader?.displayName || 'Leader', leader?.photoURL)} alt="Leader" className="w-full h-full object-cover" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Trưởng ban</p>
                            <p className="text-sm font-bold text-church-navy truncate max-w-[120px]">{leader?.displayName || 'Chưa chỉ định'}</p>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-church-navy transition-all" />
                   </div>

                   <div className="flex items-center justify-between px-2">
                      <div className="flex -space-x-3">
                         {[1,2,3,4].map(i => (
                           <div key={i} className="w-10 h-10 rounded-2xl border-4 border-white bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-400 group-hover:border-neutral-50 transition-all">
                             {i === 4 ? `+${memberCount > 3 ? memberCount - 3 : 0}` : ''}
                           </div>
                         ))}
                      </div>
                      <span className="text-xs font-black text-neutral-400 uppercase tracking-widest group-hover:text-church-navy transition-colors">{memberCount} thành viên</span>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* View Ministry Detail Modal */}
      <AnimatePresence>
        {viewingMinistry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-32 sm:h-48 bg-neutral-900 flex items-center justify-center">
                 <UsersRound className="w-12 h-12 sm:w-20 sm:h-20 text-white/20" />
                 <button 
                  onClick={() => setViewingMinistry(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-8">
                    <h3 className="text-xl sm:text-3xl font-black text-white">{viewingMinistry.name}</h3>
                 </div>
              </div>
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-6 bg-neutral-50 rounded-2xl sm:rounded-3xl border border-neutral-100">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm overflow-hidden border border-neutral-100">
                        <img 
                          src={getAvatarUrl(
                            personnel.find(p => p.uid === viewingMinistry.leaderId)?.displayName || 'Leader',
                            personnel.find(p => p.uid === viewingMinistry.leaderId)?.photoURL
                          )} 
                          alt="Leader" 
                          className="w-full h-full object-cover" 
                        />
                    </div>
                    <div>
                       <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">Trưởng ban ngành</p>
                       <p className="text-lg sm:text-xl font-black text-neutral-900">
                          {personnel.find(p => p.uid === viewingMinistry.leaderId)?.displayName || 'Chưa chỉ định'}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Mô tả mục vụ</h4>
                    <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                       <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                          {viewingMinistry.description || 'Không có mô tả chi tiết cho ban ngành này.'}
                         </p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                            <UsersRound className="w-5 h-5 text-white" />
                         </div>
                         <span className="font-bold text-blue-900">Thành viên ban ngành</span>
                      </div>
                      <span className="text-xl font-black text-blue-600">
                         {personnel.filter(p => p.ministryId === viewingMinistry.id).length}
                      </span>
                   </div>

                   <button 
                    onClick={() => setViewingMinistry(null)}
                    className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all"
                   >
                     Đóng
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Ministry Modal */}
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
                <h3 className="text-2xl font-bold text-neutral-900">Thêm ban ngành mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddMinistry} className="p-6 sm:p-10 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Tên ban ngành</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="VD: Ban hát dẫn"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Trưởng ban</label>
                  <select 
                    value={formData.leaderId}
                    onChange={(e) => setFormData({...formData, leaderId: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                  >
                    <option value="">Chọn nhân sự...</option>
                    {personnel.map(p => (
                      <option key={p.uid} value={p.uid}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Mô tả mục vụ</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                    placeholder="Mô tả vai trò và hoạt động của ban ngành..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all"
                >
                  Tạo ban ngành
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
