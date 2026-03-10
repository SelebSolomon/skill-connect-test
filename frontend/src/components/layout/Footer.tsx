import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-white">
              <Zap className="w-4 h-4" />
            </div>
            <span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-transparent">
              SkillLink
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link to="/jobs" className="hover:text-gray-900 transition-colors">Find Jobs</Link>
            <Link to="/services" className="hover:text-gray-900 transition-colors">Services</Link>
            <Link to="/providers" className="hover:text-gray-900 transition-colors">Providers</Link>
            <Link to="/register" className="hover:text-gray-900 transition-colors">Sign Up</Link>
          </nav>

          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} SkillLink. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
