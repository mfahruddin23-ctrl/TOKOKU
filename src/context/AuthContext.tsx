import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_owner_01',
  email: 'owner@razkajaya.com',
  displayName: 'H. Razka Pratama (Owner)',
  role: 'owner',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('razka_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            localStorage.setItem('razka_user_profile', JSON.stringify(data));
          } else {
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Staff Razka Jaya',
              role: 'owner', // First user starts with owner role
              isActive: true,
              avatarUrl: firebaseUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            localStorage.setItem('razka_user_profile', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign-out error:', e);
    }
    setCurrentUser(null);
    setUserProfile(DEFAULT_PROFILE);
    localStorage.removeItem('razka_user_profile');
  };

  const switchRole = (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      owner: 'H. Razka Pratama (Owner)',
      admin: 'Rian Wijaya (Admin Toko)',
      manager: 'Budi Santoso (Manajer Operasional)',
      cashier: 'Siti Rahma (Kasir Utama)',
      warehouse: 'Agus Triono (Kepala Gudang)',
      finance: 'Dewi Lestari (Staf Keuangan)',
    };

    const updated: UserProfile = {
      ...userProfile,
      role,
      displayName: roleNames[role] || `Petugas (${role})`,
    };
    setUserProfile(updated);
    localStorage.setItem('razka_user_profile', JSON.stringify(updated));
  };

  const hasPermission = (permission: string): boolean => {
    const role = userProfile.role;
    if (role === 'owner' || role === 'admin') return true;

    switch (permission) {
      case 'pos_access':
        return ['owner', 'admin', 'manager', 'cashier'].includes(role);
      case 'products_edit':
        return ['owner', 'admin', 'manager', 'warehouse'].includes(role);
      case 'purchases_create':
        return ['owner', 'admin', 'manager', 'warehouse'].includes(role);
      case 'inventory_adjust':
        return ['owner', 'admin', 'manager', 'warehouse'].includes(role);
      case 'finance_access':
        return ['owner', 'admin', 'manager', 'finance'].includes(role);
      case 'reports_view':
        return ['owner', 'admin', 'manager', 'finance'].includes(role);
      case 'settings_edit':
        return ['owner', 'admin'].includes(role);
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        loginWithGoogle,
        logout,
        switchRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
