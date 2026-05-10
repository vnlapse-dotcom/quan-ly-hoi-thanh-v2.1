import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Heart, 
  Wallet, 
  CheckSquare, 
  UsersRound,
  LogOut,
  Menu,
  X,
  Church,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getAvatarUrl } from '../lib/utils';

import Auth from './Auth';
import Dashboard from './Dashboard';
import Personnel from './Personnel';
import Activities from './Activities';
import Ministries from './Ministries';
import Accounting from './Accounting';
import Tasks from './Tasks';
import Prayer from './Prayer';
import Members from './Members';
import Chat from './Chat';
import { Mail, Clock } from 'lucide-react';

type Tab = 'dashboard' | 'personnel' | 'activities' | 'ministries' | 'accounting' | 'tasks' | 'prayer' | 'members' | 'chat';

export default function Layout() {
  const { user: firebaseUser, profile: user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (firebaseUser && user) {
      const isAdminEmail = firebaseUser.email === 'vnlapse@gmail.com';
      let needsUpdate = false;
      const updates: any = {};

      if (user.isEmailVerified !== firebaseUser.emailVerified) {
        updates.isEmailVerified = firebaseUser.emailVerified;
        needsUpdate = true;
      }

      if (isAdminEmail && (user.role !== 'admin' || !user.isApproved)) {
        updates.role = 'admin';
        updates.isApproved = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateDoc(doc(db, 'users', firebaseUser.uid), updates);
      }
    }
  }, [firebaseUser, user]);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-neutral-900 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!firebaseUser || !user) {
    return <Auth />;
  }

  // Check for email verification
  if (!firebaseUser.emailVerified && !firebaseUser.providerData.some((p: any) => p.providerId === 'google.com')) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-neutral-100"
        >
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mb-4">Xác thực Email</h1>
          <p className="text-neutral-500 mb-8 font-medium">
            Chúng tôi đã gửi một email xác thực đến địa chỉ <strong>{firebaseUser.email}</strong>. 
            Vui lòng kiểm tra hộp thư (bao gồm cả thư rác) và nhấn vào liên kết xác thực để tiếp tục.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black hover:bg-neutral-800 transition-all"
            >
              Tôi đã xác thực
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
            >
              Đăng xuất
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Check for admin approval
  if (!user.isApproved && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-neutral-100"
        >
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mb-4">Đang chờ phê duyệt</h1>
          <p className="text-neutral-500 mb-8 font-medium">
            Tài khoản của bạn đã được xác thực nhưng đang chờ Quản trị viên hệ thống phê duyệt. 
            Vui lòng liên hệ với Ban quản trị Hội thánh để được hỗ trợ nhanh nhất.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
          >
            Đăng xuất
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'personnel', label: 'Nhân sự', icon: Users, roles: ['admin', 'pastor'] },
    { id: 'members', label: 'Tín hữu', icon: UserCheck },
    { id: 'activities', label: 'Hoạt động', icon: Calendar },
    { id: 'prayer', label: 'Cầu nguyện', icon: Heart },
    { id: 'ministries', label: 'Ban ngành', icon: UsersRound },
    { id: 'chat', label: 'Tin nhắn', icon: MessageSquare },
    { id: 'accounting', label: 'Kế toán', icon: Wallet, roles: ['admin', 'accountant'] },
    { id: 'tasks', label: 'Công việc', icon: CheckSquare },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 300 : 96,
          x: (window.innerWidth < 1024 && !isMobileMenuOpen) ? -300 : 0
        }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className={cn(
          "bg-white border-r border-neutral-100 flex flex-col z-50 fixed lg:relative h-screen shadow-[10px_0_40px_-15px_rgba(0,0,0,0.05)]",
          window.innerWidth < 1024 && "w-[300px] shadow-2xl"
        )}
      >
        <div className="p-8 flex items-center justify-between">
          {(isSidebarOpen || window.innerWidth < 1024) && (
            <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
              <div className="w-12 h-12 bg-church-navy rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-church-navy/20">
                <Church className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="font-display font-black text-2xl text-church-navy tracking-tight block">Hội Thánh</span>
                <span className="text-[10px] font-black text-church-gold uppercase tracking-[.2em] leading-none">Chúa Giê-su</span>
              </div>
            </div>
          )}
          {!isSidebarOpen && window.innerWidth >= 1024 && (
             <div className="w-12 h-12 bg-church-navy rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-church-navy/20">
                <Church className="w-7 h-7 text-white" />
             </div>
          )}
          {window.innerWidth < 1024 && (
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
              <X className="w-6 h-6 text-neutral-400" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-6 space-y-2.5 mt-6 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as Tab);
                if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
                activeTab === item.id 
                  ? "bg-church-navy text-white shadow-xl shadow-church-navy/15" 
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-church-navy"
              )}
            >
              <item.icon className={cn("w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110", activeTab === item.id ? "text-church-gold" : "text-neutral-300 group-hover:text-church-navy")} />
              {(isSidebarOpen || window.innerWidth < 1024) && <span className="font-bold tracking-tight">{item.label}</span>}
              
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1.5 h-6 bg-church-gold rounded-r-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-neutral-50 bg-neutral-50/50">
          <div className={cn("flex items-center gap-4 p-3 rounded-2xl bg-white border border-neutral-100 shadow-sm mb-4", (!isSidebarOpen && window.innerWidth >= 1024) && "justify-center px-0")}>
            <img src={getAvatarUrl(user.displayName, user.photoURL)} alt="Avatar" className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover" />
            {(isSidebarOpen || window.innerWidth < 1024) && (
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-church-navy text-sm truncate">{user.displayName}</p>
                <p className="text-[10px] text-church-gold uppercase tracking-widest font-black opacity-80">{user.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-bold group",
              (!isSidebarOpen && window.innerWidth >= 1024) && "justify-center"
            )}
          >
            <LogOut className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
            {(isSidebarOpen || window.innerWidth < 1024) && <span>Đăng xuất</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto w-full">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-neutral-100 px-6 sm:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileMenuOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }} 
              className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl transition-all shadow-sm active:scale-90"
            >
              {window.innerWidth < 1024 ? <Menu className="w-6 h-6 text-church-navy" /> : (isSidebarOpen ? <X className="w-6 h-6 text-church-navy" /> : <Menu className="w-6 h-6 text-church-navy" />)}
            </button>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-church-navy tracking-tight">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-church-gold uppercase tracking-[.3em] mb-1">Lịch Phụng Vụ</p>
                <p className="text-sm font-bold text-church-navy">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} onNavigate={setActiveTab} />}
              {activeTab === 'personnel' && <Personnel user={user} />}
              {activeTab === 'activities' && <Activities user={user} />}
              {activeTab === 'ministries' && <Ministries user={user} />}
              {activeTab === 'accounting' && <Accounting user={user} />}
              {activeTab === 'tasks' && <Tasks user={user} />}
              {activeTab === 'prayer' && <Prayer user={user} />}
              {activeTab === 'members' && <Members user={user} />}
              {activeTab === 'chat' && <Chat user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
