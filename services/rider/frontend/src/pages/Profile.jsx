import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiTruck, FiStar, FiLogOut, FiEdit2, FiSave, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth, api } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const { rider, updateRider, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: rider?.name || '',
    phone: rider?.phone || '',
    vehicleType: rider?.vehicleType || 'bike',
  });
  const [saving, setSaving] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/orders/history?limit=10');
      setOrderHistory(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/rider/profile', form);
      if (data.success) {
        updateRider(data.rider);
        setEditing(false);
        toast.success('Profile updated!');
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const vehicleTypes = [
    { value: 'bike', emoji: '🏍️' },
    { value: 'scooter', emoji: '🛵' },
    { value: 'car', emoji: '🚗' },
  ];

  const statusColors = {
    ASSIGNED: 'bg-blue-500/20 text-blue-400',
    PICKED_UP: 'bg-yellow-500/20 text-yellow-400',
    ON_THE_WAY: 'bg-primary-500/20 text-primary-400',
    DELIVERED: 'bg-green-500/20 text-green-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="page-container">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6 text-center relative"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="absolute top-4 right-4 w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center border border-dark-600"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          ) : editing ? (
            <FiSave className="text-primary-400" size={16} />
          ) : (
            <FiEdit2 className="text-dark-300" size={16} />
          )}
        </motion.button>

        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/30">
          {rider?.name?.charAt(0)?.toUpperCase() || '🛵'}
        </div>

        {editing ? (
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field text-center text-lg font-bold mb-1 max-w-xs mx-auto"
          />
        ) : (
          <h2 className="text-xl font-bold">{rider?.name || 'Rider'}</h2>
        )}

        <div className="flex items-center justify-center gap-1 mt-1 text-dark-400 text-sm">
          <FiMail size={13} />
          <span>{rider?.email}</span>
        </div>

        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full">
            <FiStar className="text-yellow-400" size={14} />
            <span className="text-sm font-semibold text-yellow-400">{rider?.rating?.toFixed(1) || '5.0'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-500/10 px-3 py-1.5 rounded-full">
            <FiTruck className="text-primary-400" size={14} />
            <span className="text-sm font-semibold text-primary-400">{rider?.totalDeliveries || 0} rides</span>
          </div>
        </div>
      </motion.div>

      {/* Profile details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card divide-y divide-dark-700 mb-6"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <FiPhone className="text-dark-400" size={18} />
            <div>
              <p className="text-xs text-dark-400">Phone</p>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field py-1 px-2 text-sm mt-1 w-48"
                />
              ) : (
                <p className="text-sm font-medium">{rider?.phone || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <FiTruck className="text-dark-400" size={18} />
            <div>
              <p className="text-xs text-dark-400">Vehicle</p>
              {editing ? (
                <div className="flex gap-2 mt-1">
                  {vehicleTypes.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setForm({ ...form, vehicleType: v.value })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                        form.vehicleType === v.value
                          ? 'bg-primary-500/20 border border-primary-500/30'
                          : 'bg-dark-700 border border-dark-600'
                      }`}
                    >
                      {v.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium capitalize">{rider?.vehicleType || 'bike'}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <FiMapPin className="text-dark-400" size={18} />
            <div>
              <p className="text-xs text-dark-400">Location</p>
              <p className="text-sm font-medium">
                {rider?.currentLocation?.lat?.toFixed(4)}, {rider?.currentLocation?.lng?.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent deliveries */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h3 className="font-semibold mb-3">Recent Deliveries</h3>
        {orderHistory.length === 0 ? (
          <div className="glass-card p-4 text-center text-dark-400 text-sm">
            No delivery history yet
          </div>
        ) : (
          <div className="space-y-2">
            {orderHistory.map((order, idx) => (
              <motion.div
                key={order._id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-dark-700 rounded-lg flex items-center justify-center text-sm">
                    🍽️
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.restaurantName || 'Delivery'}</p>
                    <p className="text-xs text-dark-400">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary-400">LKR {order.earnings || 0}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                    {order.status?.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full btn-danger flex items-center justify-center gap-2 mb-2"
      >
        <FiLogOut size={18} />
        Sign Out
      </motion.button>

      <BottomNav />
    </div>
  );
}
