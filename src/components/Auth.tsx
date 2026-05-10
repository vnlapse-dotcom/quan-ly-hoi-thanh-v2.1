import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Church, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, {
          displayName: formData.displayName
        });

        await sendEmailVerification(firebaseUser);

        const isAdminEmail = firebaseUser.email === 'vnlapse@gmail.com';
        const newUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: formData.displayName,
          role: isAdminEmail ? 'admin' : 'member',
          isApproved: isAdminEmail,
          isEmailVerified: false
        };

        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        setMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        const isAdminEmail = firebaseUser.email === 'vnlapse@gmail.com';
        const newUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Thành viên mới',
          photoURL: firebaseUser.photoURL || undefined,
          role: isAdminEmail ? 'admin' : 'member',
          isApproved: isAdminEmail,
          isEmailVerified: firebaseUser.emailVerified
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Vui lòng nhập email để khôi phục mật khẩu.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setMessage('Yêu cầu đã được gửi! Vui lòng kiểm tra email để đặt lại mật khẩu.');
      setIsForgotPassword(false);
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Email này chưa được đăng ký trong hệ thống.');
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-neutral-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Church className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900">
            {isForgotPassword ? 'Khôi Phục Mật Khẩu' : (isLogin ? 'Đăng Nhập' : 'Đăng Ký Thành Viên')}
          </h1>
          <p className="text-neutral-500 text-sm mt-2">
            {isForgotPassword ? 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu' : 'Hệ thống quản lý Hội thánh trực tuyến'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-sm font-bold border border-green-100">
            {message}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-neutral-400 uppercase ml-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                <input 
                  required
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                />
              </div>
            </div>
            <button 
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Gửi yêu cầu
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
              }}
              className="w-full text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-400 uppercase ml-2">Họ và tên</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                    <input 
                      required
                      type="text"
                      placeholder="Nguyễn Văn An"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black text-neutral-400 uppercase ml-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                  <input 
                    required
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between ml-2">
                  <label className="text-xs font-black text-neutral-400 uppercase">Mật khẩu</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-xs font-black text-neutral-400 hover:text-neutral-900 uppercase tracking-wider transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                  <input 
                    required
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-neutral-400 font-bold tracking-widest">Hoặc</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 bg-white border border-neutral-200 text-neutral-900 rounded-2xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Tiếp tục với Google
            </button>

            <p className="mt-8 text-center text-sm text-neutral-500 font-medium">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
                className="ml-2 text-neutral-900 font-black hover:underline"
              >
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
