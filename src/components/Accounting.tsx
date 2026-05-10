import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Filter,
  Trash2,
  Download,
  X,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface AccountingProps {
  user: UserProfile;
}

export default function Accounting({ user }: AccountingProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'income',
    amount: 0,
    category: 'Dâng hiến',
    description: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  useEffect(() => {
    const path = 'transactions';
    const q = query(collection(db, path), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
    return () => unsub();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'transactions';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        recordedBy: user.uid
      });
      setIsModalOpen(false);
      setFormData({
        type: 'income',
        amount: 0,
        category: 'Dâng hiến',
        description: '',
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa giao dịch này?')) return;
    const path = `transactions/${id}`;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-church-navy p-8 sm:p-10 rounded-4xl text-white shadow-2xl relative overflow-hidden group col-span-1 md:col-span-1"
        >
          <div className="relative z-10">
            <p className="text-church-gold font-black text-[10px] uppercase tracking-[.3em] mb-3">Số dư hiện tại</p>
            <h3 className="text-4xl sm:text-5xl font-display font-black mb-8 leading-none">{balance.toLocaleString('vi-VN')} <span className="text-sm font-sans font-medium text-church-gold/60">₫</span></h3>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-400">{((totalIncome / (totalIncome + totalExpense || 1)) * 100).toFixed(1)}%</span>
               </div>
               <span className="text-xs text-neutral-400 font-medium">Tỷ lệ thu nhập</span>
            </div>
          </div>
          <Wallet className="absolute -right-12 -bottom-12 w-48 h-48 text-white/5 rotate-12 group-hover:rotate-0 transition-all duration-700" />
        </motion.div>

        <div className="bg-white p-8 sm:p-10 rounded-4xl border border-neutral-100 shadow-sm flex flex-col justify-between glass card-hover ring-1 ring-black/5">
          <div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <ArrowUpRight className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-neutral-400 font-black text-[10px] uppercase tracking-[.2em] mb-2 text-emerald-600/60">Tổng thu nhập</p>
            <h3 className="text-3xl font-display font-black text-church-navy truncate">{totalIncome.toLocaleString('vi-VN')} <span className="text-xs font-sans font-medium text-neutral-300">₫</span></h3>
          </div>
          <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-between">
             <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none">Từ {transactions.filter(t => t.type === 'income').length} nguồn</p>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-4xl border border-neutral-100 shadow-sm flex flex-col justify-between glass card-hover ring-1 ring-black/5">
          <div>
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <ArrowDownRight className="w-7 h-7 text-rose-600" />
            </div>
            <p className="text-neutral-400 font-black text-[10px] uppercase tracking-[.2em] mb-2 text-rose-600/60">Tổng chi phí</p>
            <h3 className="text-3xl font-display font-black text-church-navy truncate">{totalExpense.toLocaleString('vi-VN')} <span className="text-xs font-sans font-medium text-neutral-300">₫</span></h3>
          </div>
          <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-between">
             <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none">{transactions.filter(t => t.type === 'expense').length} khoản chi</p>
             <div className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm glass">
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm giao dịch, danh mục..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-church-navy/10 focus:border-church-navy outline-none transition-all text-sm font-medium"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full sm:w-auto px-6 py-4 bg-white border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-church-navy/10 outline-none font-bold text-xs uppercase tracking-widest text-neutral-500"
          >
            <option value="all">Tất cả giao dịch</option>
            <option value="income">Chỉ khoản thu</option>
            <option value="expense">Chỉ khoản chi</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
           <button className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl hover:bg-neutral-900 hover:text-white transition-all group active:scale-90">
              <Download className="w-5 h-5 text-neutral-400 group-hover:text-white" />
           </button>
           <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-neutral-900 text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-church-navy transition-all shadow-xl shadow-neutral-200 active:scale-95"
          >
            <Plus className="w-5 h-5 text-church-gold" />
            Ghi nhận mới
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-4xl border border-neutral-100 shadow-sm overflow-hidden glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-neutral-50/30 border-b border-neutral-50">
                <th className="px-10 py-6 font-black text-neutral-400 text-[10px] uppercase tracking-[.2em]">Thời điểm</th>
                <th className="px-10 py-6 font-black text-neutral-400 text-[10px] uppercase tracking-[.2em]">Nội dung & Danh mục</th>
                <th className="px-10 py-6 font-black text-neutral-400 text-[10px] uppercase tracking-[.2em] text-right">Số tiền</th>
                <th className="px-10 py-6 font-black text-neutral-400 text-[10px] uppercase tracking-[.2em] text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="group hover:bg-neutral-50 transition-all cursor-pointer"
                  onClick={() => setViewingTransaction(tx)}
                >
                  <td className="px-10 py-8">
                    <p className="font-display font-black text-church-navy text-lg leading-none mb-1">{format(new Date(tx.date), 'dd/MM')}</p>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{format(new Date(tx.date), 'yyyy · HH:mm')}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-church-navy text-base truncate max-w-[300px] group-hover:text-church-gold transition-colors">{tx.description || 'Không có mô tả'}</p>
                    <span className="inline-block mt-2 px-3 py-1.5 bg-neutral-100 rounded-xl text-[10px] font-black text-neutral-400 uppercase tracking-[.15em] transition-all group-hover:bg-church-navy/5 group-hover:text-church-navy">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className={cn(
                      "text-xl font-display font-black",
                      tx.type === 'income' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}
                      <span className="text-xs ml-1 font-sans font-medium">₫</span>
                    </p>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tx.id);
                      }}
                      className="p-3 text-neutral-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-6">
                       <div className="w-20 h-20 bg-neutral-50 rounded-4xl flex items-center justify-center animate-bounce">
                          <Wallet className="w-10 h-10 text-neutral-200" />
                       </div>
                       <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Không tìm thấy dữ liệu phù hợp</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Transaction Detail Modal */}
      <AnimatePresence>
        {viewingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className={cn(
                "p-6 sm:p-10 text-center relative",
                viewingTransaction.type === 'income' ? "bg-green-50" : "bg-red-50"
              )}>
                 <button 
                  onClick={() => setViewingTransaction(null)} 
                  className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-black/5 rounded-full transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className={cn(
                   "w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-sm",
                   viewingTransaction.type === 'income' ? "bg-green-600 text-white" : "bg-red-600 text-white"
                 )}>
                    {viewingTransaction.type === 'income' ? <ArrowUpRight className="w-8 h-8 sm:w-10 sm:h-10" /> : <ArrowDownRight className="w-8 h-8 sm:w-10 sm:h-10" />}
                 </div>
                 <p className="text-[10px] sm:text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">
                   {viewingTransaction.type === 'income' ? 'Khoản thu' : 'Khoản chi'}
                 </p>
                 <h3 className={cn(
                   "text-2xl sm:text-4xl font-black",
                   viewingTransaction.type === 'income' ? "text-green-600" : "text-red-600"
                 )}>
                   {viewingTransaction.type === 'income' ? '+' : '-'}{viewingTransaction.amount.toLocaleString('vi-VN')} ₫
                 </h3>
              </div>
              <div className="p-6 sm:p-10 space-y-6">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-neutral-50">
                       <span className="text-[10px] sm:text-sm font-bold text-neutral-400 uppercase">Mô tả</span>
                       <span className="font-bold text-neutral-900 text-sm sm:text-base">{viewingTransaction.description || 'Không có mô tả'}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-neutral-100">
                       <span className="text-[10px] sm:text-sm font-bold text-neutral-400 uppercase">Danh mục</span>
                       <span className="px-3 py-1 bg-neutral-100 rounded-full text-[10px] sm:text-xs font-bold text-neutral-600 uppercase">
                          {viewingTransaction.category}
                       </span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-neutral-100">
                       <span className="text-[10px] sm:text-sm font-bold text-neutral-400 uppercase">Ngày ghi nhận</span>
                       <span className="font-bold text-neutral-900 text-sm sm:text-base">{format(new Date(viewingTransaction.date), 'HH:mm, dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                    <div className="flex items-center justify-between py-4">
                       <span className="text-[10px] sm:text-sm font-bold text-neutral-400 uppercase">ID Giao dịch</span>
                       <span className="text-[10px] sm:text-xs font-mono text-neutral-400 truncate ml-4">{viewingTransaction.id}</span>
                    </div>
                 </div>
                 <button 
                  onClick={() => setViewingTransaction(null)}
                  className="w-full py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-800 transition-all"
                 >
                   Đóng
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
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
                <h3 className="text-2xl font-bold text-neutral-900">Ghi nhận giao dịch</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 sm:p-10 space-y-6 sm:space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="flex p-1 bg-neutral-100 rounded-2xl">
                   <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'income'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all",
                      formData.type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-neutral-500"
                    )}
                   >
                     Khoản thu
                   </button>
                   <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'expense'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all",
                      formData.type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-neutral-500"
                    )}
                   >
                     Khoản chi
                   </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Số tiền (VNĐ)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-xl sm:text-2xl font-black focus:ring-2 focus:ring-neutral-900 outline-none"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Danh mục</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    >
                      <option value="Dâng hiến">Dâng hiến</option>
                      <option value="Xây dựng">Xây dựng</option>
                      <option value="Từ thiện">Từ thiện</option>
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Lương/Phụ cấp">Lương/Phụ cấp</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-900">Ngày tháng</label>
                    <input 
                      required
                      type="datetime-local" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900">Mô tả chi tiết</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none text-sm sm:text-base"
                    placeholder="Nội dung giao dịch..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 sm:py-5 bg-neutral-900 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200"
                >
                  Xác nhận lưu
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
