import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiMapPin, FiDollarSign, FiStar, FiChevronRight, FiClock, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth, api } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { StatSkeleton } from '../components/LoadingSkeleton';

export default function Dashboard() {
  const { rider, updateRider } = useAuth();
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [orderRes, earningsRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/earnings/summary'),
      ]);
      setActiveOrder(orderRes.data.order);
      setSummary(earningsRes.data.summary);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const { data } = await api.patch('/rider/status', { isOnline: !rider?.isOnline });
      if (data.success) {
        updateRider(data.rider);
        toast.success(data.rider.isOnline ? 'You are now online! 🟢' : 'You are now offline');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const statusColors = {
    ASSIGNED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PICKED_UP: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ON_THE_WAY: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold">
            Hey, <span className="text-primary-500">{rider?.name?.split(' ')[0] || 'Rider'}</span> 👋
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">Let's deliver happiness today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-dark-800 px-3 py-1.5 rounded-full border border-dark-700">
            <FiStar className="text-yellow-400" size={14} />
            <span className="text-sm font-semibold">{rider?.rating?.toFixed(1) || '5.0'}</span>
          </div>
        </div>
      </motion.div>

      {/* Online Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={rider?.isOnline ? 'online-dot' : 'offline-dot'} />
            <div>
              <p className="font-semibold">{rider?.isOnline ? 'You\'re Online' : 'You\'re Offline'}</p>
              <p className="text-dark-400 text-xs">{rider?.isOnline ? 'Ready to receive orders' : 'Go online to start earning'}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleOnline}
            disabled={toggling}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              rider?.isOnline
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                : 'bg-dark-700 text-dark-300 border border-dark-600 hover:bg-dark-600'
            }`}
          >
            {toggling ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              rider?.isOnline ? 'Go Offline' : 'Go Online'
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Active Order Card */}
      <AnimatePresence>
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-4 mb-6 border-l-4 border-l-primary-500 cursor-pointer hover:bg-dark-700/60 transition-colors"
            onClick={() => navigate('/active-delivery')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-400">🏃 Active Delivery</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColors[activeOrder.status]}`}>
                {activeOrder.status?.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FiMapPin className="text-red-400" size={14} />
                <span className="text-dark-300">{activeOrder.restaurantName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FiMapPin className="text-green-400" size={14} />
                <span className="text-dark-300">{activeOrder.deliveryLocation?.address || 'Customer Location'}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-700">
                <span className="text-dark-400 text-xs flex items-center gap-1">
                  <FiClock size={12} /> ~{activeOrder.estimatedTime || 15} min
                </span>
                <span className="text-primary-400 font-semibold text-sm">
                  LKR {activeOrder.earnings || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center mt-3 text-primary-400 text-xs font-medium gap-1">
              View on Map <FiChevronRight size={14} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3">Today's Performance</h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            <StatSkeleton /><StatSkeleton /><StatSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <FiActivity className="text-primary-400 mb-1" size={18} />
              <motion.span
                key={summary?.today?.trips}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-white"
              >
                {summary?.today?.trips || 0}
              </motion.span>
              <span className="text-dark-400 text-xs">Trips</span>
            </div>
            <div className="stat-card">
              <FiMapPin className="text-blue-400 mb-1" size={18} />
              <span className="text-2xl font-bold text-white">
                {(summary?.today?.distance || 0).toFixed(1)}
              </span>
              <span className="text-dark-400 text-xs">km</span>
            </div>
            <div className="stat-card">
              <FiDollarSign className="text-green-400 mb-1" size={18} />
              <motion.span
                key={summary?.today?.earnings}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-white"
              >
                {summary?.today?.earnings || 0}
              </motion.span>
              <span className="text-dark-400 text-xs">LKR</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/orders')}
            className="glass-card-hover p-4 text-left"
          >
            <FiTruck className="text-primary-400 mb-2" size={22} />
            <p className="font-semibold text-sm">Available Orders</p>
            <p className="text-dark-400 text-xs mt-0.5">View nearby orders</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/earnings')}
            className="glass-card-hover p-4 text-left"
          >
            <FiDollarSign className="text-green-400 mb-2" size={22} />
            <p className="font-semibold text-sm">Earnings</p>
            <p className="text-dark-400 text-xs mt-0.5">LKR {summary?.total?.earnings || 0} total</p>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <div className="glass-card divide-y divide-dark-700">
          <div className="flex justify-between items-center p-3">
            <span className="text-dark-300 text-sm">Total Deliveries</span>
            <span className="font-semibold">{rider?.totalDeliveries || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3">
            <span className="text-dark-300 text-sm">This Week</span>
            <span className="font-semibold text-primary-400">LKR {summary?.week?.earnings || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3">
            <span className="text-dark-300 text-sm">This Month</span>
            <span className="font-semibold text-green-400">LKR {summary?.month?.earnings || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3">
            <span className="text-dark-300 text-sm">Vehicle</span>
            <span className="font-semibold capitalize">{rider?.vehicleType || 'bike'} 🛵</span>
          </div>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
}
