import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion } from 'motion/react';
import { Church, Save, Loader2, Info } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
}

export default function Settings({ user }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    churchName: '',
    churchSubtitle: ''
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'app'));
        if (snap.exists()) {
          setFormData(snap.data() as any);
        } else {
          // Initialize if not exists
          const initial = { churchName: 'Hội Thánh', churchSubtitle: 'Chúa Giê-su' };
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
    <div className="max-w-2xl mx-auto">
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
          <div className="space-y-6">
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
          <strong>Mẹo:</strong> Thay đổi này sẽ được cập nhật ngay lập tức cho tất cả người dùng trong hệ thống. Hãy đảm bảo tên hội thánh được viết đúng chính tả.
        </p>
      </div>
    </div>
  );
}
