// ================================================================
// STORE CONTEXT — Migrated to HttpOnly cookie-based auth
// Access token in memory only. Refresh token in HttpOnly cookie.
// ================================================================
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  loginApi, logoutApi, getProfileApi,
  listUsersApi, createUserApi, deleteUserApi,
  listModulesApi, createModuleApi, deleteModuleApi,
  listCertificatesApi, issueCertificateApi,
  toggleModuleApi, verifyCertificateApi,
  enrollModuleApi, completeModuleApi, getProgressApi,
  setAccessToken, clearTokens, getAccessToken,
  type AuthUser, type VerifyResult,
} from '../services/api';
import type {
  UserResponse, ModuleResponse, ModuleProgressResponse, CertificateResponse,
} from '../types/api.types';

// ─── Types ───

export type User = UserResponse & {
  completedModules?: string[];
};

export type Module = ModuleResponse;

export type ModuleProgress = ModuleProgressResponse;

export type Certificate = CertificateResponse;

interface StoreContextType {
  users: User[];
  modules: Module[];
  certificates: Certificate[];
  currentUser: (User & { role: string }) | null;
  moduleProgress: ModuleProgress[];
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  addUser: (data: { email: string; fullName: string; role: string }) => Promise<{ user: User; temporaryPassword: string } | null>;
  removeUser: (id: string) => Promise<void>;
  refreshModules: () => Promise<void>;
  addModule: (data: { title: string; description: string }) => Promise<Module | null>;
  removeModule: (id: string) => Promise<void>;
  refreshProgress: () => Promise<void>;
  enrollInModule: (moduleId: string) => Promise<void>;
  completeModule: (moduleId: string, userId?: string) => Promise<void>;
  refreshCertificates: () => Promise<void>;
  issueCertificate: (student: User) => Promise<Certificate | null>;
  verifyCertificate: (uid: string, qrSig?: string) => Promise<VerifyResult | null>;
  toggleModuleCompletion: (userId: string, moduleId: string) => Promise<void>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  setCurrentUser: (user: User | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Bootstrap: try to restore session via cookie-based refresh ───
  useEffect(() => {
    // If there's a saved access token in sessionStorage (legacy), use it
    const savedToken = sessionStorage.getItem('cv_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
      sessionStorage.removeItem('cv_access_token');
      sessionStorage.removeItem('cv_refresh_token'); // Clean up legacy
    }

    // Try to get profile — if refresh cookie exists, server will auto-refresh
    getProfileApi().then(res => {
      if (res.success && res.data) {
        setCurrentUser(mapUser(res.data));
      } else {
        clearTokens();
      }
    }).catch(() => {
      clearTokens();
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshModules();
      refreshCertificates();
      if (currentUser.role === 'admin') refreshUsers();
      if (currentUser.role === 'student') refreshProgress();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginApi(email, password);
      if (res.success && res.data) {
        // Access token already set in api.ts; refresh token is in HttpOnly cookie
        const profileRes = await getProfileApi();
        if (profileRes.success && profileRes.data) {
          const user = mapUser(profileRes.data);
          setCurrentUser(user);
          return user;
        }
      }
      if (res.error) setError(res.error);
      return null;
    } catch {
      setError('Erreur de connexion au serveur');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logoutApi().catch(() => {}); // Fire-and-forget; server clears cookie
    clearTokens();
    setCurrentUser(null);
    setUsers([]);
    setCertificates([]);
    setModuleProgress([]);
  };

  const refreshUsers = useCallback(async () => {
    const res = await listUsersApi();
    if (res.success && res.data) setUsers(res.data.map(mapUser));
  }, []);

  const addUser = async (data: { email: string; fullName: string; role: string }) => {
    const res = await createUserApi({ ...data, role: data.role });
    if (res.success && res.data) { refreshUsers(); return res.data as { user: User; temporaryPassword: string }; }
    return null;
  };

  const removeUser = async (id: string) => { await deleteUserApi(id); refreshUsers(); };

  const refreshModules = useCallback(async () => {
    const res = await listModulesApi();
    if (res.success && res.data) setModules(res.data as Module[]);
  }, []);

  const addModule = async (data: { title: string; description: string }) => {
    const res = await createModuleApi(data);
    if (res.success && res.data) { refreshModules(); return res.data as Module; }
    return null;
  };

  const removeModule = async (id: string) => { await deleteModuleApi(id); refreshModules(); };

  const refreshProgress = useCallback(async () => {
    const res = await getProgressApi();
    if (res.success && res.data) setModuleProgress(res.data as ModuleProgress[]);
  }, []);

  const enrollInModule = async (moduleId: string) => { await enrollModuleApi(moduleId); refreshProgress(); };

  const completeModuleAction = async (moduleId: string, userId?: string) => {
    await completeModuleApi(moduleId, userId);
    refreshProgress();
    const profileRes = await getProfileApi();
    if (profileRes.success && profileRes.data) setCurrentUser(mapUser(profileRes.data));
  };

  const refreshCertificates = useCallback(async () => {
    const res = await listCertificatesApi(
      currentUser?.role === 'student' ? { studentId: currentUser.id } : undefined
    );
    if (res.success && res.data) setCertificates(res.data as Certificate[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const issueCert = async (student: User): Promise<Certificate | null> => {
    const res = await issueCertificateApi({
      studentId: student.id,
      title: 'Architecture & Sécurité des Systèmes Numériques',
    });
    if (res.success && res.data) { refreshCertificates(); return res.data as Certificate; }
    return null;
  };

  const verifyCert = async (uid: string, qrSig?: string): Promise<VerifyResult | null> => {
    const res = await verifyCertificateApi(uid, qrSig);
    if (res.success && res.data) return res.data;
    return null;
  };

  const toggleModuleCompletion = async (userId: string, moduleId: string) => {
    await toggleModuleApi(userId, moduleId);
    const profileRes = await getProfileApi();
    if (profileRes.success && profileRes.data) setCurrentUser(mapUser(profileRes.data));
    refreshProgress();
    if (currentUser?.role === 'admin') refreshUsers();
  };

  return (
    <StoreContext.Provider value={{
      users, modules, certificates, currentUser: currentUser as StoreContextType['currentUser'], moduleProgress, isLoading, error,
      login, logout, refreshUsers, addUser, removeUser,
      refreshModules, addModule, removeModule,
      refreshProgress, enrollInModule, completeModule: completeModuleAction,
      refreshCertificates, issueCertificate: issueCert, verifyCertificate: verifyCert,
      toggleModuleCompletion, setUsers, setModules, setCurrentUser,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

function mapUser(u: UserResponse): User {
  return {
    ...u,
    completedModules: u.userModules
      ?.filter((um) => um.status === 'completed')
      .map((um) => um.moduleId) ?? [],
  };
}

