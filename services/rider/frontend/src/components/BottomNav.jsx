import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiMapPin, FiDollarSign, FiUser, FiPackage } from 'react-icons/fi';

const navItems = [
  { path: '/dashboard', icon: FiHome, label: 'Home' },
  { path: '/orders', icon: FiPackage, label: 'Orders' },
  { path: '/active-delivery', icon: FiMapPin, label: 'Deliver' },
  { path: '/earnings', icon: FiDollarSign, label: 'Earnings' },
  { path: '/profile', icon: FiUser, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 px-3">
      <div className="w-full max-w-2xl mx-auto rounded-2xl border border-dark-600/60 bg-dark-800/80 backdrop-blur-2xl shadow-2xl shadow-black/45">
      <div className="w-full flex justify-around items-center py-2 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-9 h-1 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={`transition-colors duration-200 ${
                  isActive ? 'text-primary-500' : 'text-dark-300'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-primary-500' : 'text-dark-300'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
