import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Module, Certificate } from '../types';

interface StoreContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  modules: Module[];
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  certificates: Certificate[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (email: string, password?: string) => User | null;
  logout: () => void;
  toggleModuleCompletion: (userId: string, moduleId: string) => void;
  issueCertificate: (student: User) => Certificate;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_MODULES: Module[] = [
  { id: '1', title: 'Fondamentaux de la Cybersécurité', description: 'Apprenez les bases de la protection des données.' },
  { id: '2', title: 'Développement Web Moderne', description: 'Maîtrisez React et Node.js.' },
  { id: '3', title: 'Intelligence Artificielle', description: 'Introduction aux réseaux de neurones.' },
];

const INITIAL_USERS: User[] = [
  { id: 'admin-1', name: 'Admin Principal', email: 'admin@certiverify.com', password: 'admin', role: 'admin', completedModules: [] },
  { id: 'student-1', name: 'Jean Dupont', email: 'jean@student.com', password: 'password', role: 'student', completedModules: [] },
];

const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'WF6FOFBPV',
    studentId: 'student-1',
    studentName: 'mimiaou',
    issueDate: '24/04/2026',
    hash: 'a3R3M3NxcnZ2LTE3'
  },
  {
    id: '3OWSX6ULH',
    studentId: 'student-1',
    studentName: 'Jean Dupont',
    issueDate: '15/02/2026',
    hash: 'H4SH-SC-3OWSX6ULH'
  },
  {
    id: 'X7Y2Z9W4Q',
    studentId: 'student-2',
    studentName: 'Marie Curie',
    issueDate: '20/03/2026',
    hash: 'CRYPTO-MARIE-X7Y2Z9W4Q'
  }
];

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('cv_users');
    if (!saved) return INITIAL_USERS;
    const parsed: User[] = JSON.parse(saved);
    const merged = [...parsed];
    INITIAL_USERS.forEach(initialUser => {
      const index = merged.findIndex(u => u.email === initialUser.email);
      if (index === -1) merged.push(initialUser);
      else if (!merged[index].password) merged[index] = { ...merged[index], password: initialUser.password };
    });
    return merged;
  });

  const [modules, setModules] = useState<Module[]>(() => {
    const saved = localStorage.getItem('cv_modules');
    return saved ? JSON.parse(saved) : INITIAL_MODULES;
  });

  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    const saved = localStorage.getItem('cv_certificates');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure our initial ones are also there if they were missing or if it's the first time
      return parsed.length > 0 ? parsed : INITIAL_CERTIFICATES;
    }
    return INITIAL_CERTIFICATES;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => { localStorage.setItem('cv_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('cv_modules', JSON.stringify(modules)); }, [modules]);
  useEffect(() => { localStorage.setItem('cv_certificates', JSON.stringify(certificates)); }, [certificates]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('cv_current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('cv_current_user');
  }, [currentUser]);

  const login = (email: string, password?: string) => {
    const user = users.find(u => u.email === email && (!password || u.password === password));
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const logout = () => setCurrentUser(null);

  const toggleModuleCompletion = (userId: string, moduleId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const completed = u.completedModules.includes(moduleId)
          ? u.completedModules.filter(id => id !== moduleId)
          : [...u.completedModules, moduleId];
        if (currentUser && currentUser.id === userId) setCurrentUser({...u, completedModules: completed});
        return { ...u, completedModules: completed };
      }
      return u;
    }));
  };

  const issueCertificate = (student: User) => {
    const newCert: Certificate = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      studentId: student.id,
      studentName: student.name,
      issueDate: new Date().toLocaleDateString(),
      hash: btoa(`${student.id}-${Date.now()}`).substr(0, 16)
    };
    setCertificates(prev => [...prev, newCert]);
    return newCert;
  };

  return (
    <StoreContext.Provider value={{
      users, setUsers, modules, setModules, certificates, currentUser, setCurrentUser,
      login, logout, toggleModuleCompletion, issueCertificate
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
