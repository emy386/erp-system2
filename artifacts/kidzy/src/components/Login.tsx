/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, Phone, User as UserIcon, Sparkles, LogIn, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { supabase, hasSupabase as supabaseReady } from '../lib/supabase';

const hashPassword = (pw: string) => btoa(pw);
const verifyPassword = (input: string, stored: string) => {
  if (stored === input) return true;
  try { return btoa(input) === stored; } catch { return false; }
};

export const Login: React.FC = () => {
  const { users, setUsers, setCurrentUser } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register Form States
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");

  useEffect(() => {
    const storedEmail = localStorage.getItem("kidzy_login_email");
    const storedPass = localStorage.getItem("kidzy_login_password");
    if (storedEmail) {
      setSavedEmail(storedEmail);
      setEmail(storedEmail);
      if (storedPass) {
        setSavedPassword(storedPass);
        setPassword(storedPass);
      }
    }
  }, []);

  const saveCredentials = (em: string, pw: string) => {
    localStorage.setItem("kidzy_login_email", em);
    localStorage.setItem("kidzy_login_password", pw);
  };
  const clearCredentials = () => {
    localStorage.removeItem("kidzy_login_email");
    localStorage.removeItem("kidzy_login_password");
    setSavedEmail("");
    setSavedPassword("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // First: always try matching against the users table (staff added by owner)
    // This works both with and without Supabase configured
    const localMatch = users.find(
      u => u?.email?.toLowerCase() === email?.toLowerCase().trim() && verifyPassword(password, u.password || "")
    );
    if (localMatch) {
      if (rememberMe) { saveCredentials(email.trim(), password); } else { clearCredentials(); }
      setCurrentUser(localMatch);
      setLoading(false);
      return;
    }

    // Second: try Supabase Auth for owner accounts registered via signup
    if (supabaseReady && supabase) {
      try {
        console.log("🔐 Logging in via Supabase Auth...");

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("انتهت مهلة الاتصال بقاعدة البيانات، تحقق من اتصالك")), 15000)
        );
        const authPromise = supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        const { data, error: authError } = await Promise.race([authPromise, timeoutPromise]) as Awaited<typeof authPromise>;

        if (authError) {
          throw authError;
        }

        if (data.user) {
          // Try to fetch from profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          const mappedUser: User = {
            id: data.user.id,
            name: profile?.name || email.split("@")[0],
            phone: profile?.phone || "",
            role: (profile?.role || "owner") as User["role"],
            permissions: profile?.permissions || ["all"],
            staffRoles: [],
            variableTasks: [],
            email: email.trim(),
            password: "",
            jobTitle: profile?.role === "owner" ? "صاحبة البراند والمشروع 👑" : "عضوة فريق كيدزي ✨"
          };

          if (rememberMe) { saveCredentials(email.trim(), password); } else { clearCredentials(); }
          setCurrentUser(mappedUser);
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "عفواً، البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        setLoading(false);
        return;
      }
    }

    // No match found anywhere
    setError("عفواً، البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى مراجعتها والمحاولة مرة أخرى.");
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (supabaseReady && supabase) {
      try {
        console.log("📝 Registering Owner via Supabase Auth...");
        const { data, error: registerError } = await supabase.auth.signUp({
          email: regEmail.trim(),
          password: regPassword,
        });

        if (registerError) {
          throw registerError;
        }

        if (data.user) {
          const newUserId = data.user.id;

          // Save to profiles table
          const profileData = {
            id: newUserId,
            email: regEmail.trim(),
            name: regName,
            phone: regPhone,
            role: "owner",
            permissions: ["all"],
          };

          const { error: profileInsError } = await supabase
            .from("profiles")
            .insert([profileData]);

          if (profileInsError) {
            console.error("Created Auth user but profiles table insertion failed:", profileInsError.message);
          }

          const newOwner: User = {
            id: newUserId,
            name: regName,
            phone: regPhone,
            role: "owner",
            permissions: ["all"],
            staffRoles: [],
            variableTasks: [],
            email: regEmail.trim(),
            password: hashPassword(regPassword),
            jobTitle: "صاحبة البراند والمشروع 👑"
          };

          const updatedUsers = [...users];
          if (!updatedUsers.some(u => u?.email?.toLowerCase() === regEmail?.toLowerCase())) {
            updatedUsers.push(newOwner);
          }
          setUsers(updatedUsers);
          setCurrentUser(newOwner);
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "فشل تسجيل الحساب، يرجى المحاولة بقيم أخرى أو كلمة مرور أطول.");
        setLoading(false);
        return;
      }
    }

    // Pure Local Storage Fallback
    setTimeout(() => {
      // Check if email already exists
      const exists = users.some(u => u?.email?.toLowerCase() === regEmail?.toLowerCase());
      if (exists) {
        setError("عفواً، هذا البريد الإلكتروني مسجل سابقاً في النظام.");
        setLoading(false);
        return;
      }

      // Create new owner account
      const newOwner: User = {
        id: `u-${Date.now()}`,
        name: regName,
        phone: regPhone,
        role: "owner",
        permissions: ["all"],
        staffRoles: [],
        variableTasks: [],
        email: regEmail,
        password: hashPassword(regPassword),
        jobTitle: "صاحبة البراند والمشروع 👑"
      };

      setUsers([...users, newOwner]);
      setCurrentUser(newOwner);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-right relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      {/* Premium ambient decorative glowing blurs */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col items-center z-10">
        {/* Branding header */}
        <div className="text-center flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-blue-500/20">
            K
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-normal">سيستم كيدزي للمبيعات 🚀</h2>
            <p className="mt-2 text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
              {isRegister 
                ? "ابدئي مشروعكِ الآن وسجلي كصاحبة للبراند لمتابعة الأوردرات والتصنيع والأرباح ✨" 
                : "برنامج ERP متكامل لإدارة الورش، تتبع الإنتاج والمصاريف، حسابات العمال، والمبيعات."
              }
            </p>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-xs font-bold text-red-600 leading-relaxed text-right animate-shake">
            ⚠️ {error}
          </div>
        )}

        {isRegister ? (
          /* REGISTRATION FORM (OWNER SIGN UP) */
          <form className="w-full space-y-4" onSubmit={handleRegisterSubmit}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1.5">
                <UserIcon size={12} />
                <span>الاسم الكامل (صاحبة المشروع)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: سارة أحمد"
                required
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-amber-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-right"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1.5">
                <Phone size={12} />
                <span>رقم الموبايل للتواصل</span>
              </label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                required
                disabled={loading}
                dir="auto"
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-amber-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-left font-mono"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1.5">
                <Mail size={12} />
                <span>البريد الإلكتروني المعتمد للعمل (Email)</span>
              </label>
              <input
                type="email"
                placeholder="owner@example.com"
                required
                disabled={loading}
                dir="auto"
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-amber-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-left font-mono"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1.5">
                <Lock size={12} />
                <span>كلمة المرور الخاصة بكِ (Password)</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                required
                disabled={loading}
                dir="auto"
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-amber-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-left font-mono"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              <div className="flex justify-start pt-1">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)}
                    className="rounded-sm accent-amber-500" 
                  />
                  <span>عرض كلمة المرور</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-100 hover:shadow-amber-200/50 text-xs sm:text-sm mt-6 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جاري حفظ الحساب وتجهيز الدخول...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>إنشاء حساب كصاحبة البراند ✨</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(""); }}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-bold transition-all mt-4 hover:underline"
            >
              لديكِ حساب صاحبة براند بالفعل؟ تسجيل الدخول هنا
            </button>
          </form>
        ) : (
          /* STANDARD SIGN IN FORM */
          <form className="w-full space-y-4" onSubmit={handleLoginSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-600 flex items-center gap-1 border-r-2 border-blue-500 pr-2">
                <span>البريد الإلكتروني للعمل (Email)</span>
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                required
                disabled={loading}
                dir="auto"
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-left font-mono"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-600 flex items-center gap-1 border-r-2 border-blue-500 pr-2">
                <span>كلمة المرور المسجلة (Password)</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                required
                disabled={loading}
                dir="auto"
                className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none transition-all text-left font-mono"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="flex justify-between items-center pt-1">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)}
                    className="rounded-sm accent-blue-600" 
                  />
                  <span>عرض كلمة المرور</span>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={() => setRememberMe(!rememberMe)}
                    className="rounded-sm accent-blue-600" 
                  />
                  <span>تذكر بيانات الدخول</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200/50 hover:shadow-blue-300/40 text-xs sm:text-sm mt-4 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جاري التحقق والدخول...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>دخول للسيستم</span>
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
              <p className="text-[11px] text-slate-400 font-bold">لستِ مسجلة كصاحبة للبراند بالسيستم بعد؟</p>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(""); }}
                className="text-xs text-amber-600 hover:text-amber-700 font-black flex items-center gap-1.5 transition-all hover:bg-amber-50 px-3 py-2 rounded-xl border border-dashed border-amber-200"
              >
                <Sparkles size={14} />
                <span>تسجيل حساب جديد كصاحبة براند 👑</span>
              </button>
            </div>
          </form>
        )}

        <div className="pt-2">
          <p className="text-center text-[10px] text-slate-400 font-bold leading-relaxed">
            جميع الحقوق محفوظة لسيستم كيدزي للمبيعات © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};
