import { useStore } from '../../hooks/useStore';
import { Users, BookOpen, Award, Plus, ArrowRight, LogOut, Shield } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const { users, modules, certificates, currentUser, logout } = useStore();
  const navigate = useNavigate();

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  const students = users.filter(u => u.role === 'student');

  const stats = [
    { label: 'Étudiants Inscrits', value: students.length, icon: Users, color: 'bg-indigo-50 text-indigo-600', link: '/admin/users' },
    { label: 'Modules Actifs', value: modules.length, icon: BookOpen, color: 'bg-indigo-50 text-indigo-600', link: '/admin/modules' },
    { label: 'Certs. Délivrés', value: certificates.length, icon: Award, color: 'bg-emerald-50 text-emerald-500', link: '#' },
  ];

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">
             <Shield className="w-3 h-3" />
             Console d'Administration
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Admin</h1>
          <p className="text-slate-500 font-medium">Gérez votre centre de formation et suivez les certifications.</p>
        </div>
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl w-fit ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            </div>
            {stat.link !== '#' && (
              <Link 
                to={stat.link}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:gap-3 transition-all uppercase tracking-widest"
              >
                Gérer <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Certificats Récents</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {certificates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Aucun certificat n'a encore été délivré.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">ID Unique</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Étudiant</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Statut</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date d'émission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {certificates.map(cert => {
                    const statusColors: Record<string, string> = {
                      signed: 'text-indigo-600 bg-indigo-50',
                      delivered: 'text-emerald-600 bg-emerald-50',
                      revoked: 'text-rose-600 bg-rose-50',
                      draft: 'text-amber-600 bg-amber-50',
                    };
                    return (
                      <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[10px] text-indigo-600 font-bold">{cert.certificateUid}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{cert.studentName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${statusColors[cert.status] || 'text-slate-600 bg-slate-50'}`}>
                            {cert.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('fr-FR') : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Catalogue Actif</h2>
            <Link to="/admin/modules" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-4">
            {modules.slice(0, 3).map(module => (
              <div key={module.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-800">{module.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{module.creditHours}h</p>
                </div>
                <BookOpen className="w-4 h-4 text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
