import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, BookOpen, X, Search, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ModuleCRUD() {
  const { modules, addModule, removeModule, currentUser } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce module ?')) {
      await removeModule(id);
      showFeedback('Module supprimé');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addModule({
      title: formData.title,
      description: formData.description,
    });
    if (result) {
      setIsModalOpen(false);
      setFormData({ title: '', description: '' });
      showFeedback('Module ajouté au catalogue');
    }
  };

  return (
    <div className="space-y-8">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="w-4 h-4" />
        Retour au Dashboard
      </Link>

      <header className="flex justify-between items-center relative">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Catalogue de Modules</h1>
          <p className="text-gray-500 font-medium">Définissez les modules requis pour la certification.</p>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-48 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-bold"
            >
              <Check className="w-3 h-3" />
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Ajouter un module
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {modules.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="p-8 bg-white border border-[#E5E5E5] rounded-3xl space-y-4 hover:border-indigo-200 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-indigo-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(module.id)}
                    className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{module.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{module.description}</p>
              </div>
              {module.creditHours > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{module.creditHours}h de formation</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
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
                <h3 className="text-xl font-bold">Nouveau Module</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Titre du module</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-5 py-3 bg-[#F9F9F9] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: Sécurité Réseau"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-5 py-3 bg-[#F9F9F9] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                    placeholder="Détaillez le contenu du module..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold mt-4 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Créer le module
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
