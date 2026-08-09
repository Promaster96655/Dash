import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import LandingPage from "./components/LandingPage";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AnimatedBackground from "./components/AnimatedBackground";
import SiteLogo, { SiteBranding } from "./components/SiteLogo";
import { Server, Shield, Cpu, Mail, Lock, User as UserIcon, X, AlertTriangle, CheckCircle } from "lucide-react";

const themeStyles: Record<string, Record<string, string>> = {
  purple: {
    "indigo-50": "#faf5ff",
    "indigo-100": "#f3e8ff",
    "indigo-200": "#e9d5ff",
    "indigo-300": "#d8b4fe",
    "indigo-400": "#c084fc",
    "indigo-500": "#a855f7",
    "indigo-600": "#9333ea",
    "indigo-700": "#7c3aed",
    "indigo-800": "#6b21a8",
    "indigo-900": "#581c87",
    "indigo-950": "#2e1065",
  },
  indigo: {
    "indigo-50": "#eef2ff",
    "indigo-100": "#e0e7ff",
    "indigo-200": "#c7d2fe",
    "indigo-300": "#a5b4fc",
    "indigo-400": "#818cf8",
    "indigo-500": "#6366f1",
    "indigo-600": "#4f46e5",
    "indigo-700": "#4338ca",
    "indigo-800": "#3730a3",
    "indigo-900": "#312e81",
    "indigo-950": "#1e1b4b",
  },
  emerald: {
    "indigo-50": "#ecfdf5",
    "indigo-100": "#d1fae5",
    "indigo-200": "#a7f3d0",
    "indigo-300": "#6ee7b7",
    "indigo-400": "#34d399",
    "indigo-500": "#10b981",
    "indigo-600": "#059669",
    "indigo-700": "#047857",
    "indigo-800": "#065f46",
    "indigo-900": "#064e3b",
    "indigo-950": "#022c22",
  },
  rose: {
    "indigo-50": "#fff1f2",
    "indigo-100": "#ffe4e6",
    "indigo-200": "#fecdd3",
    "indigo-300": "#fda4af",
    "indigo-400": "#fb7185",
    "indigo-500": "#f43f5e",
    "indigo-600": "#e11d48",
    "indigo-700": "#be123c",
    "indigo-800": "#9f1239",
    "indigo-900": "#881337",
    "indigo-950": "#4c0519",
  },
  amber: {
    "indigo-50": "#fffbeb",
    "indigo-100": "#fef3c7",
    "indigo-200": "#fde68a",
    "indigo-300": "#fcd34d",
    "indigo-400": "#fbbf24",
    "indigo-500": "#f59e0b",
    "indigo-600": "#d97706",
    "indigo-700": "#b45309",
    "indigo-800": "#92400e",
    "indigo-900": "#78350f",
    "indigo-950": "#451a03",
  },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [firebaseToken, setFirebaseToken] = useState<string>("");
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register">("login");
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [systemTheme, setSystemTheme] = useState<string>("purple");

  // Site Branding (Name & Logo)
  const [siteBranding, setSiteBranding] = useState<SiteBranding>({
    siteName: "MagicalNode",
    siteTagline: "VPS Platforms",
    logoType: "icon",
    logoIcon: "Server",
    logoUrl: "",
  });

  // Track global theme settings dynamically from Firestore (realtime sync)
  useEffect(() => {
    const themeRef = doc(db, "settings", "theme");
    const unsubscribeTheme = onSnapshot(themeRef, (docSnap) => {
      if (docSnap.exists()) {
        setSystemTheme(docSnap.data().theme || "purple");
      } else {
        setSystemTheme("purple");
      }
    }, (err) => {
      console.warn("Could not load system-wide theme snapshot:", err);
      setSystemTheme("purple");
    });

    const brandingRef = doc(db, "settings", "branding");
    const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteBranding({
          siteName: data.siteName || "MagicalNode",
          siteTagline: data.siteTagline || "VPS Platforms",
          logoType: data.logoType || "icon",
          logoIcon: data.logoIcon || "Server",
          logoUrl: data.logoUrl || "",
        });
      }
    }, (err) => {
      console.warn("Could not load branding snapshot:", err);
    });

    return () => {
      unsubscribeTheme();
      unsubscribeBranding();
    };
  }, []);


  // Auth Input States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Determine Dashboard View Mode (User Panel vs. Admin Panel)
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");

  // Track Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setAuthError(null);
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch token for secure server API requests
          const token = await currentUser.getIdToken();
          setFirebaseToken(token);

          // Get or create Profile dynamically in Firestore
          const profileRef = doc(db, "users", currentUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (!profileSnap.exists()) {
            // First time registration or missing profile fallback
            const welcomeProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || "",
              credits: 0, // 0 Welcome Credits
              role: currentUser.email === "mrzorvixofficial@gmail.com" ? "admin" : "user",
              status: "active",
              createdAt: Date.now(),
            };
            await setDoc(profileRef, welcomeProfile);
            setUserProfile(welcomeProfile);
          } else {
            // Ensure mrzorvixofficial@gmail.com has admin role even if it was stored as user previously
            const data = profileSnap.data();
            if (currentUser.email === "mrzorvixofficial@gmail.com" && data.role !== "admin") {
              data.role = "admin";
              await setDoc(profileRef, { ...data, role: "admin" });
            }
            setUserProfile(data);
          }

          // Setup a real-time listener so changes (credits, roles, status) sync instantly
          const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
              const currentProfile = docSnap.data();
              setUserProfile(currentProfile);

              // Auto-route based on stored view mode preference
              const savedMode = localStorage.getItem("viewMode") as "user" | "admin";
              if (currentProfile.role === "admin") {
                if (!savedMode || savedMode === "admin") {
                  localStorage.setItem("viewMode", "admin");
                  setViewMode("admin");
                } else {
                  setViewMode(savedMode);
                }
              } else {
                setViewMode("user");
              }
            }
          });

          setAuthMode("landing"); // Reset auth navigation
          return () => unsubscribeProfile();
        } catch (err: any) {
          console.error("Profile initialization error:", err);
          setAuthError("Failed to initialize secure cloud profile.");
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setFirebaseToken("");
        setViewMode("user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle User Email Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setAuthError("Please fill out all registration fields.");
      return;
    }
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const registeredUser = userCredential.user;

      // Update Display Name in Auth State
      await updateProfile(registeredUser, { displayName: name });

      // Build User Record
      const initialProfile = {
        uid: registeredUser.uid,
        name: name,
        email: email,
        photoURL: "",
        credits: 0, // Welcome bonus
        role: email === "mrzorvixofficial@gmail.com" ? "admin" : "user",
        status: "active",
        createdAt: Date.now(),
      };

      // Set Firestore profile immediately
      await setDoc(doc(db, "users", registeredUser.uid), initialProfile);
      setUserProfile(initialProfile);

      setAuthSuccess("Registration successful! Initiating secure session...");
      // State change is handled by onAuthStateChanged listener
    } catch (err: any) {
      console.error("Email registration failure:", err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("This email address is already registered.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Password should be at least 6 characters.");
      } else {
        setAuthError(err.message || "Registration failed. Try again.");
      }
      setLoading(false);
    }
  };

  // Handle User Email Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please provide both email and password.");
      return;
    }
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthSuccess("Welcome back! Loading secure hypervisor session...");
    } catch (err: any) {
      console.error("Email auth failure:", err);
      
      // Auto-registration for admin user on the fly if not registered yet
      if (email === "mrzorvixofficial@gmail.com" && password === "Master" && 
          (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const registeredUser = userCredential.user;
          await updateProfile(registeredUser, { displayName: "Platform Master Admin" });
          
          const initialProfile = {
            uid: registeredUser.uid,
            name: "Platform Master Admin",
            email: email,
            photoURL: "",
            credits: 0,
            role: "admin",
            status: "active",
            createdAt: Date.now(),
          };

          await setDoc(doc(db, "users", registeredUser.uid), initialProfile);
          setUserProfile(initialProfile);
          setAuthSuccess("Admin account created and verified successfully!");
          setLoading(false);
          return;
        } catch (regErr: any) {
          console.error("Admin auto-registration failed:", regErr);
        }
      }

      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("Invalid email or password combination.");
      } else {
        setAuthError(err.message || "Authentication failed. Try again.");
      }
      setLoading(false);
    }
  };

  // Handle Google OAuth Integration
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const googleUser = userCredential.user;

      // Check / Create profile dynamically
      const profileRef = doc(db, "users", googleUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        const welcomeProfile = {
          uid: googleUser.uid,
          name: googleUser.displayName || googleUser.email?.split("@")[0] || "User",
          email: googleUser.email || "",
          photoURL: googleUser.photoURL || "",
          credits: 0, // 0 welcome credits
          role: googleUser.email === "mrzorvixofficial@gmail.com" ? "admin" : "user",
          status: "active",
          createdAt: Date.now(),
        };
        await setDoc(profileRef, welcomeProfile);
        setUserProfile(welcomeProfile);
      } else {
        const data = profileSnap.data();
        if (googleUser.email === "mrzorvixofficial@gmail.com" && data.role !== "admin") {
          data.role = "admin";
          await setDoc(profileRef, { ...data, role: "admin" });
        }
        setUserProfile(data);
      }

      setAuthSuccess("OAuth Handshake verified! Loading dashboards...");
    } catch (err: any) {
      console.error("Google Auth failure:", err);
      setAuthError(err.message || "Google Sign-In canceled or failed.");
      setLoading(false);
    }
  };

  // Sign Out Handler
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem("viewMode");
      setViewMode("user");
      setAuthMode("landing");
    } catch (err) {
      console.error("Logout error:", err);
    }
    setLoading(false);
  };

  // Helper to trigger profile refetch manually if needed
  const handleRefreshUser = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    } catch (err) {
      console.error("Profile refresh failed:", err);
    }
  };

  // Resolve current active view content
  const renderContent = () => {
    // Global Loader Screen
    if (loading && !user) {
      return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-neutral-100 font-sans p-6">
          <div className="relative flex flex-col items-center space-y-6 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center animate-bounce shadow-2xl shadow-purple-600/30">
              <Server className="w-9 h-9 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white uppercase">MagicalNode Console</h2>
              <p className="text-xs text-neutral-400 font-medium mt-1 animate-pulse">Syncing secure hypervisor credentials...</p>
            </div>
          </div>
        </div>
      );
    }

    // Handle Suspended User States
    if (user && userProfile?.status === "suspended") {
      return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-neutral-100 font-sans p-6 text-center">
          <div className="max-w-md border border-red-900 bg-red-950/20 rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white uppercase">Session Restricted</h1>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Your account (<strong>{userProfile.email}</strong>) has been suspended by a platform administrator. 
                Please contact customer support or submit an infrastructure appeal to regain access.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold py-3 rounded-lg border border-purple-700/80 transition-colors cursor-pointer text-sm shadow-md shadow-purple-950/40"
            >
              Exit Client Session
            </button>
          </div>
        </div>
      );
    }

    // Active User Authenticated Dashboards Routing
    if (user && userProfile) {
      if (viewMode === "admin" && userProfile.role === "admin") {
        return (
          <AdminDashboard
            userProfile={userProfile}
            firebaseToken={firebaseToken}
            onClose={() => {
              localStorage.setItem("viewMode", "user");
              setViewMode("user");
            }}
          />
        );
      } else {
        return (
          <UserDashboard
            userProfile={userProfile}
            firebaseToken={firebaseToken}
            onLogout={handleLogout}
            refreshUser={handleRefreshUser}
          />
        );
      }
    }

    // Login / Register Form Overlay Layout
    if (authMode === "login" || authMode === "register") {
      const isLogin = authMode === "login";
      return (
        <div className="min-h-screen bg-transparent text-neutral-100 flex flex-col justify-center items-center font-sans p-6 relative">
          <div className="w-full max-w-md bg-neutral-900/80 border border-purple-900/50 rounded-2xl shadow-2xl relative z-10 overflow-hidden backdrop-blur-md">
            {/* Header Close */}
            <button
              onClick={() => {
                setAuthMode("landing");
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="absolute top-4 right-4 text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 transition-colors p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 space-y-6">
              {/* Branding */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <SiteLogo branding={siteBranding} size="lg" className="justify-center" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight pt-1">
                  {isLogin ? `Sign In to ${siteBranding.siteName}` : "Create Cloud Account"}
                </h2>
                <p className="text-xs text-neutral-400">
                  {isLogin
                    ? "Manage your physical Proxmox Virtual Machine pools"
                    : "Register to deploy your private virtual machine pools"}
                </p>
              </div>

              {/* Success or Error banners */}
              {authError && (
                <div className="bg-red-950/50 border border-red-900 text-red-200 p-4 rounded-xl text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                  <span className="font-semibold leading-relaxed">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="bg-purple-950/50 border border-purple-900 text-purple-200 p-4 rounded-xl text-xs flex items-start gap-3">
                  <CheckCircle className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                  <span className="font-semibold leading-relaxed">{authSuccess}</span>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-850 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Password</label>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-purple-600/30 transition-all text-sm cursor-pointer mt-2"
                >
                  {isLogin ? "Sign In to Platform" : "Create Free Account"}
                </button>
              </form>

              {/* Separator */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-850"></div>
                <span className="flex-shrink mx-4 text-neutral-500 text-[10px] font-bold uppercase tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-neutral-850"></div>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-200 font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-purple-950/30"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google Authentication
              </button>

              {/* Auth Switcher Footer */}
              <p className="text-center text-xs text-neutral-400">
                {isLogin ? `New to ${siteBranding.siteName}?` : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setAuthMode(isLogin ? "register" : "login");
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-purple-400 hover:underline font-bold hover:text-purple-300 ml-1 cursor-pointer"
                >
                  {isLogin ? "Sign up now" : "Sign in here"}
                </button>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Fallback to beautiful Landing Page
    return (
      <LandingPage
        onLoginClick={() => setAuthMode("login")}
        onRegisterClick={() => setAuthMode("register")}
      />
    );
  };

  const activeThemeColors = themeStyles[systemTheme] || themeStyles.purple;
  const styleContent = `
    :root {
      --color-indigo-50: ${activeThemeColors["indigo-50"]};
      --color-indigo-100: ${activeThemeColors["indigo-100"]};
      --color-indigo-200: ${activeThemeColors["indigo-200"]};
      --color-indigo-300: ${activeThemeColors["indigo-300"]};
      --color-indigo-400: ${activeThemeColors["indigo-400"]};
      --color-indigo-500: ${activeThemeColors["indigo-500"]};
      --color-indigo-600: ${activeThemeColors["indigo-600"]};
      --color-indigo-700: ${activeThemeColors["indigo-700"]};
      --color-indigo-800: ${activeThemeColors["indigo-800"]};
      --color-indigo-900: ${activeThemeColors["indigo-900"]};
      --color-indigo-950: ${activeThemeColors["indigo-950"]};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      <AnimatedBackground theme={systemTheme} />
      {renderContent()}
    </>
  );
}
