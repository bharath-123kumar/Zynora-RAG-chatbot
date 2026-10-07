import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, PlusCircle, MessageSquare, LogOut, Shield, Activity } from 'lucide-react';

const AdminNavigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'AI Monitoring', path: '/admin/monitoring', icon: Activity },
    { label: 'Knowledge Base', path: '/admin/documents', icon: FileText },
    { label: 'Create Document', path: '/admin/editor', icon: PlusCircle },
    { label: 'Zynora Chat', path: '/chat', icon: MessageSquare }
  ];

  return (
    <nav className="bg-[#0e1626] border-b border-slate-800 px-6 py-3.5 mb-6 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base leading-none">Zynora Admin Console</h1>
            <span className="text-[11px] text-slate-400 font-mono">Zyngram Knowledge Management</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          {/* User Profile & Logout */}
          <div className="pl-3 ml-3 border-l border-slate-800 flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-slate-200">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-indigo-400 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-950/40 transition-colors text-xs flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavigation;
