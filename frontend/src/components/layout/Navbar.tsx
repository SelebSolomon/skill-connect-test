import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Zap, User, LogOut, BriefcaseBusiness, MessageSquare, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/auth.store';
import { useLogout } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/jobs', label: 'Find Jobs' },
    { to: '/services', label: 'Services' },
    { to: '/providers', label: 'Providers' },
  ];

  const authLinks = user?.role === 'client'
    ? [
        { to: '/jobs/my', label: 'My Jobs', icon: <BriefcaseBusiness className="w-4 h-4" /> },
        { to: '/conversations', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
      ]
    : user?.role === 'provider'
    ? [
        { to: '/bids/my', label: 'My Bids', icon: <BriefcaseBusiness className="w-4 h-4" /> },
        { to: '/profile/me', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        { to: '/conversations', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-white">
              <Zap className="w-4 h-4" />
            </div>
            <span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-transparent">
              SkillLink
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:flex items-center gap-1">
                  {authLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                        )
                      }
                    >
                      {link.icon}
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen((p) => !p)}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-white text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block">{user.name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white shadow-lg py-1 animate-slide-up">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                      {user.role === 'client' && (
                        <Link
                          to="/jobs/create"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <BriefcaseBusiness className="w-4 h-4" />
                          Post a Job
                        </Link>
                      )}
                      <button
                        onClick={() => { logout.mutate(); setProfileOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((p) => !p)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-slide-up">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {authLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50',
                )
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
