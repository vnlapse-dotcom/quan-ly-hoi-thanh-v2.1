import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin,
  Trash2,
  Edit2,
  X,
  User as UserIcon,
  Filter,
  UserCheck,
  UserPlus,
  Eye,
  Database,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getAvatarUrl } from '../lib/utils';
import { setDoc, addDoc } from 'firebase/firestore';

interface MembersProps {
  user: UserProfile;
}

export default function Members({ user }: MembersProps) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [viewingMember, setViewingMember] = useState<UserProfile | null>(null);

  const [newMemberData, setNewMemberData] = useState<Partial<UserProfile>>({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    gender: 'male',
    position: 'Tín hữu',
    role: 'member'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as UserProfile));
    });
    return () => unsub();
  }, []);

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.phone && m.phone.includes(searchTerm))
  );

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !['admin', 'pastor'].includes(user.role)) return;

    try {
      await updateDoc(doc(db, 'users', editingMember.uid), {
        displayName: editingMember.displayName,
        phone: editingMember.phone || '',
        address: editingMember.address || '',
        gender: editingMember.gender || 'other',
        position: editingMember.position || '',
        role: editingMember.role
      });
      setIsModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error('Update member failed:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!['admin', 'pastor'].includes(user.role)) return;

    try {
      // For manual addition, we generate a random ID since they might not have a Google account yet
      const tempId = 'manual_' + Math.random().toString(36).substr(2, 9);
      const memberToSave = {
        ...newMemberData,
        uid: tempId,
        role: newMemberData.role || 'member',
        isApproved: true,
        isEmailVerified: true
      };
      await setDoc(doc(db, 'users', tempId), memberToSave);
      setIsAddModalOpen(false);
      setNewMemberData({
        displayName: '',
        email: '',
        phone: '',
        address: '',
        gender: 'male',
        position: 'Tín hữu',
        role: 'member'
      });
    } catch (error) {
      console.error('Add member failed:', error);
    }
  };

  const handleDeleteMember = async (uid: string) => {
    if (!['admin', 'pastor'].includes(user.role)) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa tín hữu này khỏi danh sách?')) return;

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Delete member failed:', error);
    }
  };

  const seedSampleData = async () => {
    if (!['admin', 'pastor'].includes(user.role)) return;
    const samples: Partial<UserProfile>[] = [
      { displayName: 'Nguyễn Văn An', email: 'an.nguyen@example.com', phone: '0901234567', address: '123 Lê Lợi, Quận 1', gender: 'male', position: 'Chấp sự', role: 'staff', isApproved: true, isEmailVerified: true },
      { displayName: 'Trần Thị Bình', email: 'binh.tran@example.com', phone: '0912345678', address: '456 Nguyễn Huệ, Quận 1', gender: 'female', position: 'Trưởng ban hát', role: 'staff', isApproved: true, isEmailVerified: true },
      { displayName: 'Lê Văn Cường', email: 'cuong.le@example.com', phone: '0923456789', address: '789 Cách Mạng Tháng 8, Quận 3', gender: 'male', position: 'Tín hữu', role: 'member', isApproved: true, isEmailVerified: true },
      { displayName: 'Phạm Thị Dung', email: 'dung.pham@example.com', phone: '0934567890', address: '101 Võ Văn Tần, Quận 3', gender: 'female', position: 'Tín hữu', role: 'member', isApproved: true, isEmailVerified: true }
    ];

    try {
      for (const s of samples) {
        const tempId = 'sample_' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'users', tempId), { ...s, uid: tempId });
      }
      alert('Đã thêm dữ liệu mẫu thành công!');
    } catch (error) {
      console.error('Seed failed:', error);
    }
  };

  const openEditModal = (member: UserProfile) => {
    setEditingMember({ ...member });
    setIsModalOpen(true);
  };

  const genderLabels = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm tín hữu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all text-sm sm:text-base"
          />
        </div>
        {['admin', 'pastor'].includes(user.role) && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={seedSampleData}
              className="flex-1 sm:flex-none bg-neutral-100 text-neutral-600 px-4 py-2.5 sm:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors text-xs sm:text-sm"
              title="Thêm dữ liệu mẫu"
            >
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              Dữ liệu mẫu
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-[2] sm:flex-none bg-neutral-900 text-white px-6 py-2.5 sm:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              Thêm tín hữu
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-4 sm:px-8 py-4 sm:py-5 font-bold text-neutral-400 text-[10px] sm:text-xs uppercase tracking-wider">Tín hữu</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 font-bold text-neutral-400 text-[10px] sm:text-xs uppercase tracking-wider">Giới tính</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 font-bold text-neutral-400 text-[10px] sm:text-xs uppercase tracking-wider">SĐT & Địa chỉ</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 font-bold text-neutral-400 text-[10px] sm:text-xs uppercase tracking-wider">Chức vụ</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 font-bold text-neutral-400 text-[10px] sm:text-xs uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredMembers.map((m) => (
                <tr key={m.uid} className="group hover:bg-neutral-50 transition-colors">
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img 
                        src={getAvatarUrl(m.displayName, m.photoURL)} 
                        alt={m.displayName} 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-neutral-100" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-neutral-900 text-xs sm:text-base">{m.displayName}</p>
                          {!m.isApproved && (
                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Chờ duyệt
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-neutral-400 truncate max-w-[100px] sm:max-w-none">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <span className={cn(
                      "px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold",
                      m.gender === 'male' ? "bg-blue-50 text-blue-600" : 
                      m.gender === 'female' ? "bg-pink-50 text-pink-600" : 
                      "bg-neutral-100 text-neutral-500"
                    )}>
                      {m.gender ? genderLabels[m.gender] : 'Chưa rõ'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] sm:text-sm text-neutral-600">
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {m.phone || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-400">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{m.address || '---'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6">
                    <p className="text-xs sm:text-sm font-medium text-neutral-700">{m.position || 'Tín hữu'}</p>
                  </td>
                  <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <button 
                        onClick={() => setViewingMember(m)}
                        className="p-1.5 sm:p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg sm:rounded-xl transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {['admin', 'pastor'].includes(user.role) && (
                        <>
                          <button 
                            onClick={() => openEditModal(m)}
                            className="p-1.5 sm:p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg sm:rounded-xl transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(m.uid)}
                            className="p-1.5 sm:p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <UserIcon className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <p className="text-neutral-500 font-medium">Không tìm thấy tín hữu nào.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {isModalOpen && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-neutral-900">Cập nhật thông tin</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateMember} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Họ và tên</label>
                  <input 
                    required
                    type="text" 
                    value={editingMember.displayName}
                    onChange={(e) => setEditingMember({...editingMember, displayName: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Giới tính</label>
                    <select 
                      value={editingMember.gender || 'other'}
                      onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as any})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Vai trò hệ thống</label>
                    <select 
                      value={editingMember.role}
                      onChange={(e) => setEditingMember({...editingMember, role: e.target.value as any})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    >
                      <option value="member">Tín hữu</option>
                      <option value="staff">Nhân sự</option>
                      <option value="accountant">Kế toán</option>
                      <option value="pastor">Mục sư</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">SĐT</label>
                    <input 
                      type="text" 
                      value={editingMember.phone || ''}
                      onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Chức vụ</label>
                    <input 
                      type="text" 
                      value={editingMember.position || ''}
                      onChange={(e) => setEditingMember({...editingMember, position: e.target.value})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                      placeholder="VD: Chấp sự, Trưởng ban..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Địa chỉ</label>
                  <textarea 
                    rows={2}
                    value={editingMember.address || ''}
                    onChange={(e) => setEditingMember({...editingMember, address: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all"
                >
                  Lưu thay đổi
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-neutral-900">Thêm tín hữu mới</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Họ và tên</label>
                  <input 
                    required
                    type="text" 
                    value={newMemberData.displayName}
                    onChange={(e) => setNewMemberData({...newMemberData, displayName: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="Nhập họ tên..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Email (nếu có)</label>
                  <input 
                    type="email" 
                    value={newMemberData.email || ''}
                    onChange={(e) => setNewMemberData({...newMemberData, email: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="example@gmail.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Giới tính</label>
                    <select 
                      value={newMemberData.gender || 'male'}
                      onChange={(e) => setNewMemberData({...newMemberData, gender: e.target.value as any})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">SĐT</label>
                    <input 
                      type="text" 
                      value={newMemberData.phone || ''}
                      onChange={(e) => setNewMemberData({...newMemberData, phone: e.target.value})}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                      placeholder="090..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Chức vụ</label>
                  <input 
                    type="text" 
                    value={newMemberData.position || ''}
                    onChange={(e) => setNewMemberData({...newMemberData, position: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="VD: Chấp sự, Tín hữu..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Địa chỉ</label>
                  <textarea 
                    rows={2}
                    value={newMemberData.address || ''}
                    onChange={(e) => setNewMemberData({...newMemberData, address: e.target.value})}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                    placeholder="Nhập địa chỉ..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all"
                >
                  Thêm vào danh sách
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Member Detail Modal */}
      <AnimatePresence>
        {viewingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="relative h-32 bg-neutral-900">
                 <button 
                  onClick={() => setViewingMember(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="px-8 pb-8 -mt-12 text-center">
                 <img 
                  src={getAvatarUrl(viewingMember.displayName, viewingMember.photoURL)} 
                  alt={viewingMember.displayName} 
                  className="w-24 h-24 rounded-3xl border-4 border-white mx-auto shadow-lg object-cover mb-4" 
                 />
                 <h3 className="text-2xl font-black text-neutral-900">{viewingMember.displayName}</h3>
                 <p className="text-neutral-500 font-medium mb-6">{viewingMember.position || 'Tín hữu'}</p>
                 
                 <div className="space-y-4 text-left">
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Mail className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Email</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingMember.email || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Phone className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Số điện thoại</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingMember.phone || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <MapPin className="w-5 h-5 text-neutral-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Địa chỉ</p>
                          <p className="text-sm font-bold text-neutral-900">{viewingMember.address || 'Chưa cập nhật'}</p>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
