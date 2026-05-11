import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion } from 'motion/react';
import { Church, Save, Loader2, Info, Upload, Image as ImageIcon, Database, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
}

export default function Settings({ user }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    churchName: '',
    churchSubtitle: '',
    logoUrl: ''
  });

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedSuccess(false);

    try {
      // 1. Ministries
      const ministries = [
        { name: 'Ban Hát dẫn & Thờ phượng', description: 'Phụ trách âm nhạc và dẫn dắt cộng đoàn thờ phượng.' },
        { name: 'Ban Thanh niên', description: 'Hoạt động kết nối và gây dựng thế hệ trẻ.' },
        { name: 'Ban Thiếu nhi (Trường Chúa nhật)', description: 'Giảng dạy lời Chúa cho các em nhỏ.' },
        { name: 'Ban Thăm viếng & Chăm sóc', description: 'Thăm viếng các tín hữu đau yếu hoặc mới tin Chúa.' }
      ];

      const ministryIds: string[] = [];
      const ministryPath = 'ministries';
      for (const m of ministries) {
        try {
          const docRef = await addDoc(collection(db, ministryPath), m);
          ministryIds.push(docRef.id);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, ministryPath);
        }
      }

      // 2. Activities
      const activities = [
        { 
          title: 'Lễ Thờ Phượng Chúa Nhật', 
          description: 'Thờ phượng Chúa và nghe sứ điệp lời Ngài.', 
          type: 'service', 
          location: 'Nhà Thờ Chính', 
          startTime: Timestamp.fromDate(new Date(new Date().setHours(8, 0, 0))),
          ministryId: ministryIds[0] || ''
        },
        { 
          title: 'Nhóm Thanh Niên', 
          description: 'Sinh hoạt, thông công và học lời Chúa.', 
          type: 'meeting', 
          location: 'Phòng Hội Trường', 
          startTime: Timestamp.fromDate(new Date(new Date().setHours(19, 0, 0))),
          ministryId: ministryIds[1] || ''
        }
      ];

      const activityPath = 'activities';
      for (const a of activities) {
        try {
          await addDoc(collection(db, activityPath), a);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, activityPath);
        }
      }

      // 3. Transactions
      const transactions = [
        { type: 'income', amount: 5000000, category: 'Dâng hiến Thập phân', description: 'Tiền dâng thập phân tuần 1 tháng 5', date: Timestamp.now(), recordedBy: user.uid },
        { type: 'income', amount: 2500000, category: 'Dâng hiến Cảm tạ', description: 'Tín hữu dâng cảm tạ Chúa nhật', date: Timestamp.now(), recordedBy: user.uid },
        { type: 'expense', amount: 1200000, category: 'Điện nước & Vận hành', description: 'Thanh toán tiền điện tháng 4', date: Timestamp.now(), recordedBy: user.uid },
        { type: 'expense', amount: 800000, category: 'Từ thiện & Thăm viếng', description: 'Hỗ trợ gia đình khó khăn trong Hội thánh', date: Timestamp.now(), recordedBy: user.uid }
      ];

      const transactionPath = 'transactions';
      for (const t of transactions) {
        try {
          await addDoc(collection(db, transactionPath), t);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, transactionPath);
        }
      }

      // 4. Tasks
      const tasks = [
        { title: 'Chuẩn bị bài giảng Chúa nhật', description: 'Soạn slide và tài liệu cho buổi nhóm tới.', status: 'todo', assignedTo: user.uid, assignedBy: user.uid, createdAt: Timestamp.now(), dueDate: '2026-05-15', priority: 'high' },
        { title: 'Lập báo cáo tài chính tháng', description: 'Tổng kết thu - chi và trình Mục sư.', status: 'todo', assignedTo: user.uid, assignedBy: user.uid, createdAt: Timestamp.now(), dueDate: '2026-05-30', priority: 'medium' }
      ];

      const taskPath = 'tasks';
      for (const task of tasks) {
        try {
          await addDoc(collection(db, taskPath), task);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, taskPath);
        }
      }

      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 5000);
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Có lỗi xảy ra khi tạo dữ liệu mẫu. Vui lòng kiểm tra quyền truy cập.');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'app'));
        if (snap.exists()) {
          setFormData(snap.data() as any);
        } else {
          // Initialize if not exists
          const initial = { churchName: 'Hội Thánh', churchSubtitle: 'Chúa Giê-su', logoUrl: '' };
          setFormData(initial);
          await setDoc(doc(db, 'settings', 'app'), initial);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { // Limit to 500KB for Firestore
      alert('Logo quá lớn (giới hạn 500KB). Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') return;
    
    setSaving(true);
    const path = 'settings/app';
    try {
      await updateDoc(doc(db, 'settings', 'app'), formData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-church-navy" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <header className="mb-10 text-center sm:text-left">
        <h3 className="text-3xl font-display font-black text-church-navy">Thiết lập hệ thống</h3>
        <p className="text-neutral-500 font-medium">Tùy chỉnh thông tin hiển thị của Hội thánh</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-xl shadow-neutral-200/50 overflow-hidden">
        <div className="p-8 border-b border-neutral-50 bg-neutral-50/50 flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm">
            <Info className="w-6 h-6 text-church-gold" />
          </div>
          <div>
            <h4 className="font-black text-church-navy">Thông tin hiển thị</h4>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Thay đổi tên hội thánh trên thanh menu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-8">
            {/* Logo Upload */}
            <div className="space-y-4">
              <label className="text-sm font-black text-church-navy uppercase tracking-widest ml-1">Logo Hội Thánh</label>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-neutral-50 rounded-[1.5rem] border-2 border-dashed border-neutral-200">
                <div className="relative group">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-inner border border-neutral-100 overflow-hidden flex items-center justify-center">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-neutral-200" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-church-navy text-white rounded-xl shadow-lg hover:bg-church-gold transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-church-navy mb-1">Tải lên Logo của bạn</p>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                    Khuyên dùng ảnh PNG hình vuông, kích thước 512x512px. <br />
                    Giới hạn dung lượng: 500KB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-church-navy uppercase tracking-widest ml-1">Tên Hội Thánh (Phần chính)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-church-gold transition-colors">
                  <Church className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.churchName}
                  onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                  placeholder="Ví dụ: Hội Thánh"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-church-gold focus:outline-none transition-all font-bold text-church-navy"
                />
              </div>
              <p className="text-xs text-neutral-400 ml-1 font-medium italic">Tên hiển thị chính trên thanh menu sidebar.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-church-navy uppercase tracking-widest ml-1">Phụ đề (Phần dưới)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-church-gold transition-colors">
                  <Info className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={formData.churchSubtitle}
                  onChange={(e) => setFormData({ ...formData, churchSubtitle: e.target.value })}
                  placeholder="Ví dụ: Chúa Giê-su"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-church-gold focus:outline-none transition-all font-bold text-church-navy"
                />
              </div>
              <p className="text-xs text-neutral-400 ml-1 font-medium italic">Dòng chữ nhỏ hiển thị phía dưới tên hội thánh.</p>
            </div>
          </div>

          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={saving}
              type="submit"
              className="w-full py-4 bg-church-navy text-white rounded-[1.5rem] font-black shadow-xl shadow-church-navy/20 hover:shadow-church-navy/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Save className="w-6 h-6" />
              )}
              {saving ? 'Đang lưu...' : 'Lưu thiết lập'}
            </motion.button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-6 bg-church-gold/10 rounded-[1.5rem] border border-church-gold/20 flex gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
          <span className="text-2xl">💡</span>
        </div>
        <p className="text-sm text-church-navy/80 font-medium leading-relaxed">
          <strong>Mẹo:</strong> Sau khi lưu, Logo sẽ tự động được sử dụng làm biểu tượng ứng dụng (Favicon) trên trình duyệt.
        </p>
      </div>

      {/* Demo Data Section */}
      <div className="mt-8 bg-rose-50 rounded-[2rem] border border-rose-100 overflow-hidden">
        <div className="p-8 border-b border-rose-100/50 bg-rose-100/20 flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm">
            <Database className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h4 className="font-black text-rose-900">Chế độ Demo</h4>
            <p className="text-xs text-rose-400 font-bold uppercase tracking-widest">Dành cho việc giới thiệu phần mềm</p>
          </div>
        </div>
        <div className="p-8">
          <p className="text-sm text-rose-800/70 font-medium leading-relaxed mb-6">
            Nếu bạn đang chuẩn bị đi gặp khách hàng, hãy sử dụng tính năng này để tự động tạo các dữ liệu mẫu (Ban ngành, hoạt động, thu chi, công việc) giúp trang chủ trông sinh động và thực tế hơn.
          </p>
          
          <motion.button
            whileHover={!seeding && !seedSuccess ? { scale: 1.02 } : {}}
            whileTap={!seeding && !seedSuccess ? { scale: 0.98 } : {}}
            type="button"
            onClick={handleSeedData}
            disabled={seeding || seedSuccess}
            className={`w-full py-4 rounded-[1.5rem] font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
              seedSuccess 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : seeding
                  ? 'bg-rose-400 text-white cursor-not-allowed'
                  : 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700 cursor-pointer'
            }`}
          >
            {seeding ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : seedSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Database className="w-6 h-6" />
            )}
            {seeding ? 'Đang tạo dữ liệu...' : seedSuccess ? 'Đã tạo thành công!' : 'Tạo ngay dữ liệu mẫu'}
          </motion.button>

          {seedSuccess && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs font-bold text-emerald-600 mt-4"
            >
              Dữ liệu đã được thêm. Vui lòng quay lại Dashboard để xem kết quả!
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
