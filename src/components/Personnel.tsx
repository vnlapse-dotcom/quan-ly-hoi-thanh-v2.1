import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin,
  Shield,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getAvatarUrl } from '../lib/utils';

interface PersonnelProps {
  user: UserProfile;
}

export default function Personnel({ user }: PersonnelProps) {
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const path = 'users';
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setPersonnel(snap.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
    return () => unsub();
  }, []);

  const filteredPersonnel = personnel.filter(p => 
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    if (user.role !== 'admin') return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleApproveUser = async (uid: string) => {
    if (user.role !== 'admin') return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (user.role !== 'admin') return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này?')) return;
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700',
    pastor: 'bg-purple-100 text-purple-700',
    accountant: 'bg-blue-100 text-blue-700',
    staff: 'bg-green-100 text-green-700',
    member: 'bg-neutral-100 text-neutral-700'
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    pastor: 'Mục sư',
    accountant: 'Kế toán',
    staff: 'Nhân sự',
    member: 'Tín hữu'
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhân sự..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-church-navy/10 focus:border-church-navy outline-none transition-all text-sm font-medium"
          />
        </div>
        {user.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-church-navy text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-all shadow-lg shadow-church-navy/20 active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Thêm nhân sự
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
        <AnimatePresence>
          {filteredPersonnel.map((p) => (
            <motion.div
              key={p.uid}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setViewingUser(p)}
              className="bg-white p-6 rounded-4xl border border-neutral-200 shadow-sm card-hover group cursor-pointer active:scale-95 glass"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={getAvatarUrl(p.displayName, p.photoURL)} alt={p.displayName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform" />
                    <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white", p.isApproved ? "bg-emerald-500" : "bg-church-gold")} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-church-navy group-hover:text-church-gold transition-colors">{p.displayName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest", roleColors[p.role])}>
                        {roleLabels[p.role]}
                      </span>
                      {!p.isApproved && (
                        <span className="bg-church-gold/10 text-church-gold px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          待 phê duyệt
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {user.role === 'admin' && p.uid !== user.uid && (
                  <div className="relative group/menu">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 hover:bg-neutral-50 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-neutral-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-100 rounded-3xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 p-3 ring-1 ring-black/5">
                       <p className="px-3 py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Cấp bậc</p>
                       {(['admin', 'pastor', 'accountant', 'staff', 'member'] as UserRole[]).map(r => (
                         <button 
                           key={r}
                           onClick={(e) => {
                             e.stopPropagation();
                             handleUpdateRole(p.uid, r);
                           }}
                           className={cn(
                             "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all mb-1",
                             p.role === r ? "bg-church-navy text-white" : "hover:bg-neutral-50 text-neutral-500"
                           )}
                         >
                           {roleLabels[r]}
                         </button>
                       ))}
                       <div className="h-px bg-neutral-100 my-2 mx-2" />
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDeleteUser(p.uid);
                         }}
                         className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2"
                       >
                         <Trash2 className="w-4 h-4" />
                         Vô hiệu hóa
                       </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
                <div className="flex items-center gap-3 text-neutral-600 text-[13px] font-medium">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span className="truncate">{p.email}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-600 text-[13px] font-medium">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span>{p.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-neutral-300" />
                    <span className="text-[10px] text-neutral-400 font-bold tracking-tight">ID: {p.uid.slice(0, 12)}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   {!p.isApproved && user.role === 'admin' && (
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveUser(p.uid);
                      }}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 active:scale-90"
                     >
                       <CheckCircle className="w-3.5 h-3.5" />
                       Duyệt
                     </button>
                   )}
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingUser(p);
                    }}
                    className="text-church-navy font-bold text-xs hover:text-church-gold transition-colors underline decoration-2 underline-offset-4"
                   >
                    Xem Hồ Sơ
                   </button>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View Personnel Detail Modal */}
      <AnimatePresence>
        {viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-24 sm:h-32 bg-neutral-900">
                 <button 
                  onClick={() => setViewingUser(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="px-6 sm:px-8 pb-8 -mt-10 sm:-mt-12 text-center">
                 <img 
                  src={getAvatarUrl(viewingUser.displayName, viewingUser.photoURL)} 
                  alt={viewingUser.displayName} 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl border-4 border-white mx-auto shadow-lg object-cover mb-4" 
                 />
                 <h3 className="text-xl sm:text-2xl font-black text-neutral-900">{viewingUser.displayName}</h3>
                 <div className="flex items-center justify-center gap-2 mb-6">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider", roleColors[viewingUser.role])}>
                      {roleLabels[viewingUser.role]}
                    </span>
                    {!viewingUser.isApproved && (
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Chờ duyệt
                      </span>
                    )}
                 </div>
                 
                 <div className="space-y-4 text-left">
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Mail className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Email</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingUser.email || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Phone className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Số điện thoại</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingUser.phone || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <MapPin className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Địa chỉ</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingUser.address || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Personnel Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-900">Thêm nhân sự mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-neutral-500 mb-6 text-sm sm:text-base">Nhân sự mới cần đăng nhập bằng Google lần đầu để hệ thống ghi nhận. Bạn có thể tìm thấy họ ở đây sau đó để phân quyền.</p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
