import React, { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Activity, Transaction, Task } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { 
  Users, 
  Calendar, 
  Wallet, 
  CheckSquare, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Line,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { 
  startOfDay, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  eachDayOfInterval,
  isSameDay
} from 'date-fns';

interface DashboardProps {
  user: UserProfile;
  onNavigate: (tab: any) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    users: 0,
    activities: 0,
    tasks: 0,
    balance: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [timeframe, setTimeframe] = useState<'7days' | 'month' | 'lastMonth'>('7days');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartData, setChartData] = useState<any[]>([]);

  const parseDate = (d: any) => {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    if (typeof d.toDate === 'function') return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  };

  useEffect(() => {
    // Basic stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setStats(prev => ({ ...prev, users: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubActivities = onSnapshot(collection(db, 'activities'), (snap) => {
      setStats(prev => ({ ...prev, activities: snap.size }));
      const activities = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setRecentActivities(activities.slice(0, 5));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'activities'));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setStats(prev => ({ ...prev, tasks: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
      const txs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      const income = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      setStats(prev => ({ ...prev, balance: income - expense }));
      setRecentTransactions(txs.slice(0, 5));
      setAllTransactions(txs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    return () => {
      unsubUsers();
      unsubActivities();
      unsubTasks();
      unsubTransactions();
    };
  }, []);

  useEffect(() => {
    if (allTransactions.length === 0) return;

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (timeframe === '7days') {
      startDate = startOfDay(subDays(now, 6));
      endDate = now;
    } else if (timeframe === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
    }

    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    const categories = selectedCategory === 'all' 
      ? allTransactions.map(t => t.category)
      : [selectedCategory];

    const data = interval.map(day => {
      const dayTxs = allTransactions.filter(t => {
        const tDate = parseDate(t.date);
        const matchesDate = isSameDay(tDate, day);
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesDate && matchesCategory;
      });

      return {
        name: format(day, timeframe === '7days' ? 'dd/MM' : 'dd'),
        income: dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
      };
    });

    setChartData(data);
  }, [allTransactions, timeframe, selectedCategory]);

  const categories = Array.from(new Set(allTransactions.map(t => t.category)));

  const statCards = [
    { id: 'personnel', label: 'Nhân sự', value: stats.users, icon: Users, color: 'bg-blue-500' },
    { id: 'activities', label: 'Hoạt động', value: stats.activities, icon: Calendar, color: 'bg-purple-500' },
    { id: 'tasks', label: 'Công việc', value: stats.tasks, icon: CheckSquare, color: 'bg-green-500' },
    { id: 'accounting', label: 'Số dư quỹ', value: stats.balance.toLocaleString('vi-VN') + ' ₫', icon: Wallet, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl font-display font-black text-church-navy leading-tight">
            Chào {format(new Date(), 'a', { locale: vi }) === 'SA' ? 'buổi sáng' : 'buổi chiều'}, <span className="text-church-gold">{user.displayName}</span>! 👋
          </h1>
          <p className="text-neutral-500 mt-2 text-sm sm:text-lg font-medium">Bình an của Chúa ở cùng bạn. Đây là tổng quan Hội thánh hôm nay.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-neutral-200 shadow-sm self-start md:self-auto glass transition-all hover:shadow-md">
           <div className="w-10 h-10 bg-church-navy/5 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-church-navy" />
           </div>
           <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none mb-1">Thời gian hiện tại</p>
              <p className="text-lg font-bold text-neutral-900 leading-none">{format(new Date(), 'HH:mm', { locale: vi })}</p>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
            onClick={() => onNavigate(card.id)}
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm card-hover cursor-pointer group active:scale-95"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12", card.color + " bg-opacity-10")}>
              <card.icon className={cn("w-7 h-7", card.color.replace('bg-', 'text-'))} />
            </div>
            <p className="text-neutral-500 font-semibold text-sm uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl sm:text-3xl font-display font-bold text-church-navy mt-1 truncate">{card.value}</p>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-neutral-400 group-hover:text-church-gold transition-colors">
              Chi tiết ứng dụng
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-4xl border border-neutral-200 shadow-sm overflow-hidden glass">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-display font-bold text-church-navy">Phân tích Tài chính</h3>
              <p className="text-neutral-500 font-medium">Xu hướng thu nhập và chi phí của Hội thánh</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-church-navy outline-none focus:ring-2 focus:ring-church-gold/20"
              >
                <option value="7days">7 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="lastMonth">Tháng trước</option>
              </select>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-church-navy outline-none focus:ring-2 focus:ring-church-gold/20"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Thu</p>
              <p className="text-lg font-black text-emerald-700">
                {chartData.reduce((acc, d) => acc + d.income, 0).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Chi</p>
              <p className="text-lg font-black text-rose-700">
                {chartData.reduce((acc, d) => acc + d.expense, 0).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="p-4 bg-church-navy/5 rounded-2xl border border-church-navy/10">
              <p className="text-[10px] font-black text-church-navy uppercase tracking-widest mb-1">Chênh lệch</p>
              <p className="text-lg font-black text-church-navy">
                {(chartData.reduce((acc, d) => acc + d.income, 0) - chartData.reduce((acc, d) => acc + d.expense, 0)).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Giao dịch</p>
               <p className="text-lg font-black text-amber-700">
                 {allTransactions.filter(t => {
                   let startDate: Date;
                   let endDate: Date = new Date();
                   const now = new Date();
                   if (timeframe === '7days') {
                     startDate = startOfDay(subDays(now, 6));
                   } else if (timeframe === 'month') {
                     startDate = startOfMonth(now);
                   } else {
                     startDate = startOfMonth(subMonths(now, 1));
                     endDate = endOfMonth(subMonths(now, 1));
                   }
                   const tDate = parseDate(t.date);
                   return tDate >= startDate && tDate <= endDate && (selectedCategory === 'all' || t.category === selectedCategory);
                 }).length}
               </p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v) => v >= 1000000 ? `${v/1000000}M` : v >= 1000 ? `${v/1000}k` : v}
                />
                <Tooltip 
                  cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: any) => [new Intl.NumberFormat('vi-VN').format(value) + ' ₫']}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Area type="monotone" dataKey="income" fill="url(#colorIncome)" stroke="none" />
                <Area type="monotone" dataKey="expense" fill="url(#colorExpense)" stroke="none" />
                <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} barSize={timeframe === '7days' ? 20 : 8} />
                <Bar dataKey="expense" name="Chi phí" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={timeframe === '7days' ? 20 : 8} />
                <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 sm:p-10 rounded-4xl border border-neutral-200 shadow-sm glass">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-display font-bold text-church-navy">Sự kiện mới</h3>
            <button 
              onClick={() => onNavigate('activities')}
              className="px-4 py-2 bg-neutral-50 rounded-xl text-xs font-bold text-church-navy hover:bg-church-navy hover:text-white transition-all"
            >
              Xem lịch
            </button>
          </div>
          <div className="space-y-6">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex gap-4 cursor-pointer group"
                onClick={() => onNavigate('activities')}
              >
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex flex-col items-center justify-center border border-neutral-100 flex-shrink-0 group-hover:bg-neutral-900 group-hover:border-neutral-900 transition-colors">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase group-hover:text-neutral-500">{format(new Date(activity.startTime), 'MMM', { locale: vi })}</span>
                  <span className="text-lg font-bold text-neutral-900 leading-none group-hover:text-white">{format(new Date(activity.startTime), 'dd')}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-neutral-900 truncate group-hover:text-neutral-600 transition-colors">{activity.title}</h4>
                  <p className="text-sm text-neutral-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(activity.startTime), 'HH:mm')} - {activity.location || 'Hội thánh'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-neutral-400 italic">Chưa có sự kiện nào</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white p-6 sm:p-10 rounded-4xl border border-neutral-200 shadow-sm overflow-hidden glass">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-display font-bold text-church-navy">Giao dịch mới nhất</h3>
            <p className="text-neutral-500 font-medium mt-1">Các khoản thu chi gần đây của Hội thánh</p>
          </div>
          <button 
            onClick={() => onNavigate('accounting')}
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-neutral-200 hover:bg-church-navy transition-all active:scale-95"
          >
            Báo cáo chi tiết
          </button>
        </div>
        <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
          <table className="w-full text-left min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-5 font-bold text-neutral-400 text-[10px] uppercase tracking-widest">Thời gian</th>
                <th className="pb-5 font-bold text-neutral-400 text-[10px] uppercase tracking-widest">Nội dung</th>
                <th className="pb-5 font-bold text-neutral-400 text-[10px] uppercase tracking-widest">Phân loại</th>
                <th className="pb-5 font-bold text-neutral-400 text-[10px] uppercase tracking-widest text-right">Giá trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {recentTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="group hover:bg-neutral-50 transition-all cursor-pointer"
                  onClick={() => onNavigate('accounting')}
                >
                  <td className="py-5">
                    <p className="text-sm font-bold text-neutral-900">{format(new Date(tx.date), 'dd/MM')}</p>
                    <p className="text-[10px] text-neutral-400 font-medium">{format(new Date(tx.date), 'yyyy')}</p>
                  </td>
                  <td className="py-5 font-bold text-neutral-900 group-hover:text-church-navy transition-colors">{tx.description || 'Không có mô tả'}</td>
                  <td className="py-5">
                    <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-[10px] font-black uppercase tracking-tight text-neutral-500 group-hover:bg-church-navy/5 group-hover:text-church-navy transition-colors">
                      {tx.category}
                    </span>
                  </td>
                  <td className={cn(
                    "py-5 font-display font-black text-right text-lg",
                    tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}
                    <span className="text-xs ml-1 font-sans">₫</span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Wallet className="w-10 h-10 text-neutral-200" />
                      <p className="text-neutral-400 font-medium italic">Chưa có giao dịch nào được ghi nhận</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
