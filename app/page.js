import Link from 'next/link';
import { FaSchool, FaShieldAlt, FaChartLine, FaUsers } from 'react-icons/fa';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800/50 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FaSchool className="text-white text-lg" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              E-Grantha
            </span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition font-medium shadow-lg shadow-blue-500/25"
            >
              Register School
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-blue-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            The Future of School Management
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Manage your school with <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
              unparalleled elegance.
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            E-Grantha provides a powerful, secure, and beautiful platform for modern educational institutions. Streamline administration, connect with students, and focus on education.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
            >
              Get Started Now
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-lg font-bold transition-all hover:scale-105"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-blue-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <FaShieldAlt className="text-2xl text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Secure & Reliable</h3>
              <p className="text-slate-400 leading-relaxed">
                Enterprise-grade security with role-based access control to keep your institution's data safe and private.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-purple-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <FaChartLine className="text-2xl text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Real-time Analytics</h3>
              <p className="text-slate-400 leading-relaxed">
                Get instant insights into student performance, attendance, and administrative metrics with our powerful dashboard.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <FaUsers className="text-2xl text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Seamless Connection</h3>
              <p className="text-slate-400 leading-relaxed">
                Bridge the gap between administration, teachers, and students with our integrated event and communication tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 text-center text-slate-500">
        <p>© 2024 E-Grantha. All rights reserved.</p>
      </footer>
    </main>
  );
}
