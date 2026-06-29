"use client";
 
 import React, { createContext, useContext, useEffect, useState } from "react";
 import {
   onAuthStateChanged,
   signInWithEmailAndPassword,
   createUserWithEmailAndPassword,
   signOut as firebaseSignOut,
   sendPasswordResetEmail,
   sendEmailVerification,
   GoogleAuthProvider,
   OAuthProvider,
   signInWithPopup,
   User as FirebaseUser,
 } from "firebase/auth";
 import { auth, isFirebaseConfigured, db } from "@/lib/firebase";
 import { doc, setDoc, getDoc } from "firebase/firestore";
 
 export interface UserProfile {
   uid: string;
   email: string;
   displayName?: string;
   emailVerified: boolean;
 }
 
 interface AuthContextProps {
   user: UserProfile | null;
   loading: boolean;
   isDemoMode: boolean;
   subscriptionTier: 'Starter' | 'Growth' | 'Business' | 'Enterprise';
   monthlyScanCount: number;
   login: (email: string, password: string) => Promise<void>;
   signup: (email: string, password: string, name: string) => Promise<void>;
   loginWithGoogle: () => Promise<void>;
   loginWithApple: () => Promise<void>;
   logout: () => Promise<void>;
   resetPassword: (email: string) => Promise<void>;
   updateSubscriptionTier: (tier: 'Starter' | 'Growth' | 'Business' | 'Enterprise') => void;
   incrementScanCount: () => void;
   sendVerificationEmail: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextProps | undefined>(undefined);
 
 export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
 }) => {
   const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isFirebaseConfigured);
  const [subscriptionTier, setSubscriptionTier] = useState<'Starter' | 'Growth' | 'Business' | 'Enterprise'>('Starter');
  const [monthlyScanCount, setMonthlyScanCount] = useState<number>(4); // Default demo starts with 4 scans

  useEffect(() => {
    // Load subscription info from localStorage
    if (typeof window !== "undefined") {
      const savedTier = localStorage.getItem("saas_sub_tier");
      if (savedTier) {
        setSubscriptionTier(savedTier as any);
      }
      const savedScanCount = localStorage.getItem("saas_scan_count");
      if (savedScanCount) {
        setMonthlyScanCount(parseInt(savedScanCount, 10));
      }
    }

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || undefined,
            emailVerified: firebaseUser.emailVerified,
          };
          setUser(profile);
          setIsDemoMode(false);

          // Retrieve or create profile database record in Firestore
          if (db) {
            try {
              const userRef = doc(db, "users", firebaseUser.uid);
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.tier) {
                  setSubscriptionTier(data.tier);
                  localStorage.setItem("saas_sub_tier", data.tier);
                }
                if (data.scans !== undefined) {
                  setMonthlyScanCount(data.scans);
                  localStorage.setItem("saas_scan_count", data.scans.toString());
                }
              } else {
                await setDoc(userRef, {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
                  tier: "Starter",
                  scans: 4,
                  status: "Active",
                  joined: new Date().toISOString().split("T")[0],
                });
                setSubscriptionTier("Starter");
                setMonthlyScanCount(4);
                localStorage.setItem("saas_sub_tier", "Starter");
                localStorage.setItem("saas_scan_count", "4");
              }
            } catch (err) {
              console.error("Firestore user profile sync error:", err);
            }
          }
        } else {
          setUser(null);
          setSubscriptionTier("Starter");
          setMonthlyScanCount(4);
          localStorage.removeItem("saas_sub_tier");
          localStorage.removeItem("saas_scan_count");
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Mock auth initialization from localStorage
      const storedUser = localStorage.getItem("demo_user");
      if (storedUser) {
        const profile = JSON.parse(storedUser);
        setUser({
          ...profile,
          emailVerified: profile.emailVerified ?? true,
        });
        
        // Load mock user specific limits if they exist in registered list
        const storedUsersRaw = localStorage.getItem("demo_registered_users");
        const registeredUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        const matched = registeredUsers.find((u: any) => u.uid === profile.uid);
        if (matched) {
          const userTier = matched.tier || "Starter";
          const userScans = matched.scans !== undefined ? matched.scans : 4;
          setSubscriptionTier(userTier);
          setMonthlyScanCount(userScans);
          localStorage.setItem("saas_sub_tier", userTier);
          localStorage.setItem("saas_scan_count", userScans.toString());
        }
      }
      setIsDemoMode(true);
      setLoading(false);
    }
  }, []);

  const updateSubscriptionTier = async (tier: 'Starter' | 'Growth' | 'Business' | 'Enterprise') => {
    setSubscriptionTier(tier);
    localStorage.setItem("saas_sub_tier", tier);
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid), { tier }, { merge: true });
      } catch (err) {
        console.error("Failed to sync tier to Firestore:", err);
      }
    } else {
      // Update in mock registered users
      const storedUsersRaw = localStorage.getItem("demo_registered_users");
      if (storedUsersRaw && user) {
        const registeredUsers = JSON.parse(storedUsersRaw);
        const updated = registeredUsers.map((u: any) => {
          if (u.uid === user.uid || (user.uid === "demo-user-id" && u.email === user.email)) {
            return { ...u, tier };
          }
          return u;
        });
        localStorage.setItem("demo_registered_users", JSON.stringify(updated));
      }
    }
  };

  const incrementScanCount = async () => {
    const newCount = monthlyScanCount + 1;
    setMonthlyScanCount(newCount);
    localStorage.setItem("saas_scan_count", newCount.toString());
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid), { scans: newCount }, { merge: true });
      } catch (err) {
        console.error("Failed to sync scans to Firestore:", err);
      }
    } else {
      // Update in mock registered users
      const storedUsersRaw = localStorage.getItem("demo_registered_users");
      if (storedUsersRaw && user) {
        const registeredUsers = JSON.parse(storedUsersRaw);
        const updated = registeredUsers.map((u: any) => {
          if (u.uid === user.uid || (user.uid === "demo-user-id" && u.email === user.email)) {
            return { ...u, scans: newCount };
          }
          return u;
        });
        localStorage.setItem("demo_registered_users", JSON.stringify(updated));
      }
    }
  };

  const sendVerificationEmail = async () => {
    if (isFirebaseConfigured && auth?.currentUser) {
      const actionCodeSettings = {
        url: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "http://localhost:3000/dashboard",
        handleCodeInApp: false,
      };
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
    } else {
      alert("Verification email simulation sent (mocked).");
    }
  };

  const login = async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // Mock login check
      const storedUsersRaw = localStorage.getItem("demo_registered_users");
      const registeredUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const matched = registeredUsers.find(
        (u: any) => u.email === email && u.password === password
      );

      if (matched || (email === "demo@example.com" && password === "password")) {
        const profile = {
          uid: matched?.uid || "demo-user-id",
          email,
          displayName: matched?.name || "Demo User",
          emailVerified: true,
        };
        localStorage.setItem("demo_user", JSON.stringify(profile));
        setUser(profile);

        const userTier = matched?.tier || "Starter";
        const userScans = matched?.scans !== undefined ? matched.scans : 4;
        setSubscriptionTier(userTier);
        setMonthlyScanCount(userScans);
        localStorage.setItem("saas_sub_tier", userTier);
        localStorage.setItem("saas_scan_count", userScans.toString());
      } else {
        throw new Error("Invalid credentials. Try demo@example.com / password.");
      }
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Try to send email verification link with redirect to dashboard
      try {
        const actionCodeSettings = {
          url: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "http://localhost:3000/dashboard",
          handleCodeInApp: false,
        };
        await sendEmailVerification(cred.user, actionCodeSettings);
      } catch (err) {
        console.error("Failed to send verification email during signup:", err);
      }

      setUser({
        uid: cred.user.uid,
        email: cred.user.email || "",
        displayName: name,
        emailVerified: cred.user.emailVerified,
      });

      if (db) {
        try {
          await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            email: cred.user.email || "",
            displayName: name,
            tier: "Starter",
            scans: 4,
            status: "Active",
            joined: new Date().toISOString().split("T")[0],
          });
        } catch (err) {
          console.error("Failed to register profile in Firestore:", err);
        }
      }

      setSubscriptionTier("Starter");
      setMonthlyScanCount(4);
      localStorage.setItem("saas_sub_tier", "Starter");
      localStorage.setItem("saas_scan_count", "4");
    } else {
      // Mock signup
      const storedUsersRaw = localStorage.getItem("demo_registered_users");
      const registeredUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      if (registeredUsers.some((u: any) => u.email === email)) {
        throw new Error("Email already registered.");
      }

      const newUser = {
        uid: "demo-" + Math.random().toString(36).substr(2, 9),
        email,
        password,
        name,
        tier: "Starter",
        scans: 4,
      };

      registeredUsers.push(newUser);
      localStorage.setItem(
        "demo_registered_users",
        JSON.stringify(registeredUsers)
      );

      const profile = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.name,
        emailVerified: true,
      };
      localStorage.setItem("demo_user", JSON.stringify(profile));
      setUser(profile);

      setSubscriptionTier("Starter");
      setMonthlyScanCount(4);
      localStorage.setItem("saas_sub_tier", "Starter");
      localStorage.setItem("saas_scan_count", "4");
    }
  };

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      const profile = {
        uid: "demo-google-user",
        email: "google-demo@example.com",
        displayName: "Google Demo User",
        emailVerified: true,
      };
      localStorage.setItem("demo_user", JSON.stringify(profile));
      setUser(profile);
      setSubscriptionTier("Starter");
      setMonthlyScanCount(4);
      localStorage.setItem("saas_sub_tier", "Starter");
      localStorage.setItem("saas_scan_count", "4");
    }
  };

  const loginWithApple = async () => {
    if (isFirebaseConfigured && auth) {
      const provider = new OAuthProvider("apple.com");
      await signInWithPopup(auth, provider);
    } else {
      const profile = {
        uid: "demo-apple-user",
        email: "apple-demo@example.com",
        displayName: "Apple Demo User",
        emailVerified: true,
      };
      localStorage.setItem("demo_user", JSON.stringify(profile));
      setUser(profile);
      setSubscriptionTier("Starter");
      setMonthlyScanCount(4);
      localStorage.setItem("saas_sub_tier", "Starter");
      localStorage.setItem("saas_scan_count", "4");
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    } else {
      localStorage.removeItem("demo_user");
      setUser(null);
    }
    setSubscriptionTier("Starter");
    setMonthlyScanCount(4);
    localStorage.removeItem("saas_sub_tier");
    localStorage.removeItem("saas_scan_count");
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      alert(`Demo reset email link sent to ${email} (mocked).`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        subscriptionTier,
        monthlyScanCount,
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        logout,
        resetPassword,
        updateSubscriptionTier,
        incrementScanCount,
        sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
