import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '../ui/Toast';
import { useToast } from '../../hooks/useToast';

export const ToastContext = {
  addToast: (_msg: string, _type?: 'success' | 'error' | 'info' | 'warning') => {},
};

export function Layout() {
  const { toasts, addToast, removeToast } = useToast();
  ToastContext.addToast = addToast;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
