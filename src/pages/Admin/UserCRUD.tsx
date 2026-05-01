import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Shield, User as UserIcon, X, Search, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserCRUD() {
  const { users, addUser, removeUser, currentUser, modules } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'student' as const });
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    const duration = msg.includes('Pass temp') ? 10000 : 3000;
    setTimeout(() => setFeedback(null), duration);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cet utilisateur ?')) {
      await removeUser(id);
      showFeedback('Utilisateur supprimé');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addUser({
      fullName: formData.fullName,
      email: formData.email,
      role: formData.role,
    });
    if (result) {
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', role: 'student' });
      showFeedback(`Utilisateur créé ! Pass temp: ${result.temporaryPassword}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalModules = modules.length || 3;

  return (
    <div className="space-y-8">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="w-4 h-4" />
        Retour au Dashboard
      </Link>
      
      <header className="flex justify-between items-center relative">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 font-medium">Ajoutez, modifiez ou supprimez les comptes étudiants et admin.</p>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`absolute right-64 top-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-xl border z-50 ${feedback.includes('Pass temp') ? 'bg-amber-50 text-amber-700 border-amber-200 min-w-[300px]' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
            >
              {feedback.includes('Pass temp') ? <AlertCircle className="w-4 h-4" /> : <Check className="w-3 h-3" />}
              <div className="flex flex-col gap-1">
                <span>{feedback.split(' ! ')[0]}</span>
                {feedback.includes('Pass temp') && (
                  <span className="font-mono bg-white/50 px-2 py-1 rounded border border-amber-200 text-sm">
                    {feedback.split(' ! ')[1]}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Ajouter un utilisateur
        </button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-[#E5E5E5] rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#F9F9F9] border-b border-[#E5E5E5]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Utilisateur</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Role</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Email</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Modules Complétés</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-all group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                      {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <span className="font-bold">{user.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${((user.completedModules?.length || 0) / totalModules) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-400">{user.completedModules?.length || 0}/{totalModules}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Nouvel Utilisateur</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nom Complet</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-5 py-3 bg-[#F9F9F9] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: Jean Dupont"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-3 bg-[#F9F9F9] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: jean@domain.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Rôle</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full px-5 py-3 bg-[#F9F9F9] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Étudiant</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold mt-4 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Enregistrer
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
