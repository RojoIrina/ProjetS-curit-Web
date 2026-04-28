import React, { useState, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Award, ShieldCheck, Download, Share2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CertificateView() {
  const { id } = useParams();
  const { certificates } = useStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const certificate = certificates.find(c => c.id === id);
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!certificate) {
    return <Navigate to="/" />;
  }

  const shareUrl = `${window.location.origin}/?verify=${certificate.id}`;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  /**
   * CORE FEATURE: PDF GENERATION
   * Converts the HTML certificate into a high-quality PDF using canvas rendering.
   * We use scale: 2 for high density and fixed dimensions for the PDF.
   */
  const downloadPDF = async () => {
    if (!certificateRef.current) return;
    
    showFeedback('Génération du PDF...');
    
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // 2 is usually safer for memory
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`certificat-${certificate.studentName.replace(/\s+/g, '-')}-${certificate.id}.pdf`);
      showFeedback('PDF Téléchargé !');
    } catch (error) {
      console.error('PDF Export failed:', error);
      showFeedback('Erreur lors de l\'export PDF');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-12 left-1/2 px-6 py-3 bg-[#0f172a] text-white rounded-2xl flex items-center gap-2 text-sm font-bold shadow-2xl z-[200]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
      <Link to="/student" className="inline-flex items-center gap-2 text-sm font-bold text-[#94a3b8] hover:text-[#4f46e5] transition-colors uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      <div ref={certificateRef} className="bg-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white border-[16px] border-[#f8fafc] p-16 shadow-2xl rounded-sm overflow-hidden"
          style={{ backgroundColor: '#ffffff', borderColor: '#f8fafc' }}
        >
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] scale-150">
            <h2 className="text-9xl font-black uppercase tracking-widest whitespace-nowrap text-[#0f172a]">CertiVerify Official</h2>
          </div>

          {/* Certificate Border Accents */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-[#0f172a] m-8 opacity-20" />
          <div className="absolute top-0 right-0 w-24 h-24 border-t-8 border-r-8 border-[#0f172a] m-8 opacity-20" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-8 border-l-8 border-[#0f172a] m-8 opacity-20" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-[#0f172a] m-8 opacity-20" />

          <div className="flex flex-col items-center text-center space-y-12">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-[#0f172a] rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
                <Award className="w-10 h-10 text-[#ffffff]" />
              </div>
              <h1 className="text-sm font-bold uppercase tracking-[0.4em] text-[#0f172a]">Certificat de Réussite Académique</h1>
            </div>

            <div className="space-y-4">
              <p className="text-xl font-serif italic text-[#94a3b8]">Ce document certifie officiellement que</p>
              <p className="text-6xl font-bold tracking-tight text-[#0f172a] border-b-2 border-[#f1f5f9] pb-4 px-12">
                {certificate.studentName}
              </p>
            </div>

            <p className="max-w-lg text-lg text-[#475569] leading-relaxed font-serif italic">
              A validé l'intégralité du cursus et a démontré une maîtrise exceptionnelle des compétences requises pour la formation <br />
              <span className="not-italic font-bold text-[#0f172a] uppercase text-sm tracking-[0.2em] block mt-6 bg-[#f8fafc] py-3 rounded-lg border border-[#f1f5f9]">Architecture & Sécurité des Systèmes Numériques</span>
            </p>

            <div className="flex justify-between w-full pt-16 items-end">
              <div className="space-y-6 text-left">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Date d'émission</p>
                  <p className="font-bold text-[#1e293b]">{certificate.issueDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Identifiant Unique</p>
                  <p className="font-mono text-xs font-bold text-[#4f46e5]">{certificate.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-center flex flex-col items-center p-4 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                <QRCodeSVG value={shareUrl} size={80} />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94a3b8] pt-1">Scan to Verify</p>
              </div>

              <div className="space-y-6 text-right">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] font-mono">Digital Signature Hash</p>
                  <div className="font-mono text-[9px] text-[#94a3b8] w-40 break-all leading-tight">
                    {certificate.hash}
                  </div>
                </div>
                <div className="pt-6 border-t border-[#f1f5f9]">
                   <div className="flex items-center justify-end gap-2 text-[#0f172a] mb-1">
                     <ShieldCheck className="w-5 h-5 text-[#10b981]" />
                     <span className="font-bold uppercase italic text-xs">Verified by CertiVerify AI</span>
                   </div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Bureau académique</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center gap-4">
        <button 
          onClick={downloadPDF}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <Download className="w-5 h-5" />
          Télécharger l'Original (PDF)
        </button>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            showFeedback('Lien copié !');
          }}
          className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <Share2 className="w-5 h-5 text-slate-400" />
          Partager le lien
        </button>
      </div>
    </div>
  );
}
