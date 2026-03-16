import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiClock, FiDollarSign, FiNavigation, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const navigate = useNavigate();
  const timersRef = useRef({});

  useEffect(() => {
    fetchOrders();
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/available');
      if (data.success) {
        // Add 30-second countdown timers
        const ordersWithTimers = data.orders.map(o => ({ ...o, timeLeft: 30 }));
        setOrders(ordersWithTimers);

        // Setup countdown timers
        ordersWithTimers.forEach((order) => {
          timersRef.current[order.orderId] = setInterval(() => {
            setOrders(prev => prev.map(o => {
              if (o.orderId === order.orderId) {
                const newTime = o.timeLeft - 1;
                if (newTime <= 0) {
                  clearInterval(timersRef.current[order.orderId]);
                  return null;
                }
                return { ...o, timeLeft: newTime };
              }
              return o;
            }).filter(Boolean));
          }, 1000);
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      const { data } = await api.post(`/orders/${orderId}/accept`);
      if (data.success) {
        toast.success('Order accepted! 🎉');
        clearInterval(timersRef.current[orderId]);
        navigate('/active-delivery');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/reject`, { reason: 'Not interested' });
      setOrders(prev => prev.filter(o => o.orderId !== orderId));
      clearInterval(timersRef.current[orderId]);
      toast('Order skipped', { icon: '👋' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold">Available Orders</h1>
        <p className="text-dark-400 text-sm mt-0.5">
          {orders.length} order{orders.length !== 1 ? 's' : ''} nearby
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="text-5xl mb-3">📭</div>
          <h3 className="font-semibold text-lg">No orders available</h3>
          <p className="text-dark-400 text-sm mt-1">New orders will appear here. Stay online!</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-hover p-4"
              >
                {/* Timer Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-dark-400">Auto-reject in</span>
                    <span className={`font-mono font-semibold ${order.timeLeft <= 10 ? 'text-red-400' : 'text-primary-400'}`}>
                      {order.timeLeft}s
                    </span>
                  </div>
                  <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${order.timeLeft <= 10 ? 'bg-red-500' : 'bg-primary-500'}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(order.timeLeft / 30) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Order info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    🍽️
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{order.restaurantName}</h3>
                    <p className="text-dark-400 text-xs flex items-center gap-1 mt-0.5">
                      <FiMapPin size={11} /> {order.pickupLocation?.address || 'Pickup point'}
                    </p>
                  </div>
                  <span className="text-primary-400 font-bold text-lg">
                    LKR {order.earnings}
                  </span>
                </div>

                {/* Delivery to */}
                <div className="flex items-center gap-2 mb-3 pl-2 border-l-2 border-dark-600 ml-4">
                  <FiNavigation className="text-green-400" size={12} />
                  <span className="text-xs text-dark-300">{order.deliveryLocation?.address || 'Delivery point'}</span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-3 text-xs text-dark-400">
                  <span className="flex items-center gap-1">
                    <FiMapPin size={12} /> {order.distance} km
                  </span>
                  <span className="flex items-center gap-1">
                    <FiClock size={12} /> ~{order.estimatedTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FiDollarSign size={12} /> LKR {order.earnings}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleReject(order.orderId)}
                    className="flex-1 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-300 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
                  >
                    <FiX size={16} /> Reject
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAccept(order.orderId)}
                    disabled={accepting === order.orderId}
                    className="flex-[2] btn-primary py-2.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {accepting === order.orderId ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><FiCheck size={16} /> Accept Order</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <BottomNav />
    </div>
  );
}
