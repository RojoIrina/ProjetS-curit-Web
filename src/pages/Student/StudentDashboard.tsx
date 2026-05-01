import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Award, BookOpen, Clock, ShieldCheck, LogOut, Key, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export default function StudentDashboard() {
  const { currentUser, modules, toggleModuleCompletion, issueCertificate, certificates, moduleProgress, refreshProgress } = useStore();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accessKeyModal, setAccessKeyModal] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  if (!currentUser || currentUser.role !== 'student') {
    return <Navigate to="/login" />;
  }

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Use moduleProgress from API if available, fallback to modules + completedModules
  const completedModules = currentUser.completedModules ?? [];
  const allCompleted = modules.length > 0 && modules.every(m => completedModules.includes(m.id));
  const existingCert = certificates.find(c => c.studentId === currentUser.id);

  const handleUnlock = async () => {
    if (allCompleted && !existingCert && !isIssuing) {
      setIsIssuing(true);
      try {
        const newCert = await issueCertificate(currentUser);
        if (newCert) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#10b981']
          });
          // Show access key modal
          if (newCert.accessKey) {
            setAccessKeyModal(newCert.accessKey);
          } else {
            setTimeout(() => navigate(`/certificate/${newCert.id}`), 2000);
          }
        }
      } finally {
        setIsIssuing(false);
      }
    }
  };

  return (
    <div className="space-y-12">
      {/* Access Key Modal */}
      <AnimatePresence>
        {accessKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Clé d'Accès Secrète</h3>
                  <p className="text-xs text-slate-500">Conservez cette clé précieusement !</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">⚠️ Affichée une seule fois</p>
                <p className="text-sm text-amber-800">Cette clé vous permet de télécharger et déverrouiller votre certificat. Elle ne sera <strong>plus jamais affichée</strong>.</p>
              </div>

              <div className="flex items-center gap-2 p-4 bg-slate-900 rounded-2xl">
                <code className="text-lg font-mono font-bold text-indigo-400 flex-1 text-center tracking-[0.3em]">{accessKeyModal}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(accessKeyModal);
                    showFeedback('Clé copiée !');
                  }}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setAccessKeyModal(null);
                  const cert = certificates.find(c => c.studentId === currentUser.id) || existingCert;
                  if (cert) navigate(`/certificate/${cert.id}`);
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              >
                J'ai sauvegardé ma clé → Voir le certificat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">
             <ShieldCheck className="w-3 h-3" />
             Portail Étudiant Sécurisé
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Bonjour, {currentUser.fullName}</h1>
          <p className="text-slate-500 font-medium">Suivez votre progression et obtenez votre certification officielle.</p>
        </div>
        <div className="flex items-center gap-4 relative">
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-16 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-sm z-50"
              >
                <CheckCircle2 className="w-3 h-3" />
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
          {existingCert && (
            <Link 
              to={`/certificate/${existingCert.id}`}
              className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold hover:bg-emerald-100 transition-all border border-emerald-100 uppercase tracking-widest text-xs"
            >
              <Award className="w-5 h-5" />
              Certificat Délivré
            </Link>
          )}
          <button 
            onClick={() => { navigate('/login'); }}
            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Modules de formation
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {completedModules.length} / {modules.length} Complétés
            </span>
          </div>

          <div className="space-y-4">
            {modules.map((module, i) => {
              const isCompleted = completedModules.includes(module.id);
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    toggleModuleCompletion(currentUser.id, module.id);
                    showFeedback(isCompleted ? 'Module retiré' : 'Module complété !');
                  }}
                  className={`p-6 bg-white border rounded-3xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${isCompleted ? 'border-emerald-200' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl transition-colors ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1">
                      <p className={`font-bold text-slate-800 transition-all ${isCompleted ? 'opacity-40 italic' : ''}`}>
                        {module.title}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{module.description}</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-slate-200" />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Award className="w-64 h-64" />
            </div>
            
            <div className="space-y-2 relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Progression</p>
              <h3 className="text-2xl font-bold">Certification Académique</h3>
              <p className="text-slate-400 text-xs leading-relaxed">Validez l'intégralité du cursus pour signer numériquement votre diplôme.</p>
            </div>

            <div className="py-8 relative z-10">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: modules.length > 0 ? `${(completedModules.length / modules.length) * 100}%` : '0%' }}
                  className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dernière étape : Signature</p>
            </div>

            {!existingCert ? (
              <button
                disabled={!allCompleted || isIssuing}
                onClick={handleUnlock}
                className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest ${allCompleted && !isIssuing ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                {isIssuing ? 'Signature en cours...' : 'Signer & Sceller'}
              </button>
            ) : (
              <Link 
                to={`/certificate/${existingCert.id}`}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 hover:bg-emerald-600 text-sm uppercase tracking-widest"
              >
                Voir l'original
              </Link>
            )}
          </div>

          <div className="p-8 bg-white border border-[#E5E5E5] rounded-3xl space-y-4">
             <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Pourquoi CertiVerify ?</h4>
             <ul className="space-y-3 text-sm font-medium">
               <li className="flex gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                 <span>Signature numérique unique</span>
               </li>
               <li className="flex gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                 <span>Vérifiable partout dans le monde</span>
               </li>
               <li className="flex gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                 <span>Archive sécurisée à vie</span>
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
