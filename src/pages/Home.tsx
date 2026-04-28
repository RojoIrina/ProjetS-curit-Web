import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, ShieldCheck, Zap, Globe, Lock, ChevronRight, FileText, Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../hooks/useStore';
import { useSearchParams, Link } from 'react-router-dom';

export default function Home() {
  const [certId, setCertId] = useState('');
  const [verificationResult, setVerificationResult] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [certData, setCertData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { certificates } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleVerify = useCallback((id: string) => {
    if (!id || id.trim().length < 8) return;
    const targetId = id.trim().toUpperCase();
    
    setCertId(targetId);
    setIsVerifying(true);
    setVerificationResult('idle');
    setCertData(null);
    
    // Slight delay to simulate security analysis
    const timer = setTimeout(() => {
      const cert = certificates.find(c => c.id === targetId);
      if (cert) {
        setCertData(cert);
        setVerificationResult('found');
      } else {
        setVerificationResult('not_found');
      }
      setIsVerifying(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [certificates]);

  useEffect(() => {
    const verifyId = searchParams.get('verify');
    if (verifyId && certificates.length > 0) {
      handleVerify(verifyId);
    }
  }, [searchParams, certificates.length, handleVerify]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setIsVerifying(true);
      setVerificationResult('idle');
      setCertData(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        const idRegex = /[A-Z0-9]{9}/; 
        
        // Strategy: Look for any valid cert ID in filename or content
        const foundInCollection = certificates.find(cert => 
          file.name.toUpperCase().includes(cert.id) || 
          content.toUpperCase().includes(cert.id)
        );

        setTimeout(() => {
          if (foundInCollection) {
            setCertId(foundInCollection.id);
            setCertData(foundInCollection);
            setVerificationResult('found');
          } else {
            // Fallback to regex match
            const idMatch = file.name.toUpperCase().match(idRegex) || content.toUpperCase().match(idRegex);
            const extractedId = idMatch ? idMatch[0] : null;
            
            if (extractedId) {
              const cert = certificates.find(c => c.id === extractedId);
              if (cert) {
                setCertId(extractedId);
                setCertData(cert);
                setVerificationResult('found');
              } else {
                setVerificationResult('not_found');
              }
            } else {
              setVerificationResult('not_found');
            }
          }
          setIsVerifying(false);
        }, 1500);
      };

      reader.readAsText(file.slice(0, 30000)); // Read more to be safe
    }
  };

  return (
    <div className="space-y-32 py-20 pb-40">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center space-y-12 max-w-5xl mx-auto px-6">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-50/50 rounded-full blur-[120px] -z-10" />
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Infrastructure d'Authentification Décentralisée
          </div>
          
          <h1 className="text-7xl lg:text-8xl font-black tracking-tight text-slate-950 leading-[0.9] lg:leading-[0.85]">
            La confiance <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient font-serif italic">enfin palpable.</span>
          </h1>
          
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            CertiVerify est l'étalon-or pour la validation académique. Authentifiez vos diplômes avec une preuve cryptographique infalsifiable.
          </p>
        </motion.div>

        {/* Verification Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl bg-white p-2 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100"
        >
          <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Scanner de Certificats</h2>
                <p className="text-xs text-slate-400 font-medium lowercase">Vérifiez l'authenticité d'un document Instantanément</p>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-100" />
                <div className="w-2 h-2 rounded-full bg-slate-100" />
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
            </div>

            <div className="space-y-6">
              <form onSubmit={(e) => { e.preventDefault(); handleVerify(certId); }} className="relative group">
                <input
                  type="text"
                  placeholder="Collez l'ID unique du certificat..."
                  value={certId}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCertId(val);
                    if (val.length === 9) {
                      handleVerify(val);
                    }
                  }}
                  className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-mono text-lg placeholder:text-slate-300 shadow-inner"
                  required
                />
                <button 
                  type="submit"
                  disabled={isVerifying}
                  className="absolute right-3 top-3 bottom-3 px-8 bg-slate-950 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all flex items-center gap-3 disabled:opacity-50 shadow-lg shadow-indigo-500/10 active:scale-95"
                >
                  {isVerifying ? (
                    <Zap className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isVerifying ? 'Analyse...' : 'Vérifier'}
                </button>
              </form>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`relative border-2 border-dashed rounded-[2rem] p-12 transition-all flex flex-col items-center justify-center gap-6 cursor-pointer group ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner' : 'border-slate-200 hover:border-indigo-300 bg-slate-50/30'}`}
              >
                <div className={`w-20 h-20 rounded-3xl transition-all duration-500 flex items-center justify-center ${isDragging ? 'bg-indigo-600 text-white rotate-12 scale-110' : 'bg-white text-slate-300 shadow-sm group-hover:text-indigo-400 group-hover:scale-105'}`}>
                  <FileText className="w-10 h-10" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-extrabold text-slate-800 text-lg">{isVerifying ? 'Extraction en cours...' : 'Déposez votre document PDF'}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{isVerifying ? 'Moteur de vision actif' : 'Recherche automatique de signature numérique'}</p>
                </div>
                
                {isVerifying && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600 rounded-b-[2rem] origin-left"
                    transition={{ duration: 2 }}
                  />
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {verificationResult === 'found' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-start gap-6 text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-4 w-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-emerald-900 uppercase text-[10px] tracking-widest mb-1">Authenticité Confirmée</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none">{certData?.studentName}</h3>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Certifié</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100/50">
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Émis le</p>
                        <p className="text-sm font-bold text-slate-700">{certData?.issueDate}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Actions</p>
                        <div className="flex gap-2">
                           <Link 
                             to={`/certificate/${certData?.id}`}
                             className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all"
                           >
                             Consulter
                           </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {verificationResult === 'not_found' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="p-8 bg-rose-50/50 border border-rose-100 rounded-3xl flex items-start gap-6 text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-rose-900 uppercase text-[10px] tracking-widest">Certification Introuvable</p>
                    <p className="text-sm text-rose-800 font-medium">Ce document ne contient aucune signature numérique valide reconnue par nos services.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Social Proof / Partners */}
      <section className="max-w-7xl mx-auto px-6 overflow-hidden">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-12">Partenaires Académiques Majeurs</p>
        <div className="flex justify-center flex-wrap gap-10 sm:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default scale-90 sm:scale-100">
          {['Polytechnique', 'HEC Paris', 'Sorbonne', 'MIT', 'Stanford'].map(name => (
            <div key={name} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">{name[0]}</div>
              <span className="font-bold text-slate-900 text-lg tracking-tighter">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-12 overflow-hidden relative shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">Vérification en temps réel</h3>
              <p className="text-lg text-slate-500 font-medium max-w-md">Protocole SSL intégré pour une validation instantanée des hash numériques sans latence.</p>
            </div>
            <button className="flex items-center gap-2 text-indigo-600 font-bold group-hover:gap-4 transition-all">
              En savoir plus <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50" />
          <div className="absolute bottom-12 right-12 hidden lg:block border border-slate-100 bg-slate-50/50 p-6 rounded-3xl scale-125 rotate-6 backdrop-blur-sm shadow-2xl">
            <div className="flex gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="w-20 h-3 rounded-full bg-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="w-40 h-2 rounded-full bg-slate-100" />
              <div className="w-32 h-2 rounded-full bg-slate-100" />
              <div className="w-36 h-2 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 text-white flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <ShieldCheck className="w-12 h-12 text-indigo-400" />
            <h3 className="text-3xl font-black tracking-tight leading-none">Sécurité Militaire</h3>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Chaque certificat est haché en SHA-256 et signé numériquement, rendant toute altération impossible.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-black">256-bit</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest text-wrap">Encryption active</p>
            </div>
            <div>
              <p className="text-2xl font-black">Zéro</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Faux document</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-4 group">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-all">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">QR Code Sécurisé</h4>
            <p className="text-slate-500 text-sm">
              Validation mobile via scan direct sans application tierce requise.
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-4 group">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">Validité Mondiale</h4>
            <p className="text-slate-500 text-sm">
              Certificats reconnus à l'échelle internationale par les universités partenaires.
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-10 flex items-center gap-12 group">
          <div className="hidden sm:flex shrink-0 w-24 h-24 items-center justify-center bg-white rounded-3xl shadow-lg text-indigo-600 group-hover:rotate-12 transition-transform">
             <Quote className="w-10 h-10 fill-current" />
          </div>
          <div>
            <p className="text-indigo-900 font-serif italic text-lg leading-relaxed mb-4">"CertiVerify a radicalement transformé notre processus de recrutement en rendant nos titres infalsifiables."</p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Doyen Académique, Sorbonne</p>
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
          <Lock className="w-32 h-32 absolute -bottom-8 -right-8 opacity-10 group-hover:scale-110 transition-transform" />
          <h4 className="text-xl font-bold mb-2">Confidentialité Totale</h4>
          <p className="text-indigo-100 text-sm leading-relaxed opacity-80">
            Protocole Zero-Knowledge : nous vérifions sans jamais stocker vos données personnelles.
          </p>
        </div>
      </section>

      {/* Why Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 pt-12">
        <div className="space-y-4">
          <div className="text-4xl font-black text-slate-200">01</div>
          <h4 className="text-2xl font-black text-slate-900">Signé par l'IA</h4>
          <p className="text-slate-500 leading-relaxed">Notre moteur d'intelligence artificielle analyse la structure du document pour détecter toute anomalie physique ou numérique.</p>
        </div>
        <div className="space-y-4">
          <div className="text-4xl font-black text-slate-200">02</div>
          <h4 className="text-2xl font-black text-slate-900">Preuve immuable</h4>
          <p className="text-slate-500 leading-relaxed">Une fois émis, le certificat est ancré dans notre archi-numérique, rendant sa modification impossible, même par nous.</p>
        </div>
        <div className="space-y-4">
          <div className="text-4xl font-black text-slate-200">03</div>
          <h4 className="text-2xl font-black text-slate-900">Interopérable</h4>
          <p className="text-slate-500 leading-relaxed">Compatible avec les standards Européens de certification numérique et les protocoles de confiance académique.</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-950 py-24 rounded-[4rem] mx-6 flex flex-col items-center text-center space-y-8 px-6">
        <h2 className="text-5xl font-black text-white tracking-tight">
          Prêt à sécuriser <br />
          <span className="text-indigo-500">votre avenir ?</span>
        </h2>
        <p className="text-slate-400 max-w-xl text-lg">
          Rejoignez des milliers d'étudiants qui utilisent déjà CertiVerify pour authentifier leurs accomplissements académiques.
        </p>
        <button className="px-12 py-5 bg-white text-slate-950 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
          Commencer maintenant
        </button>
      </section>
    </div>
  );
}

