import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiArrowLeft, FiClock, FiMapPin, FiPhone, FiCheck, FiNavigation } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom markers
const bikeIcon = L.divIcon({
  html: '<div class="bike-marker rider-marker">🛵</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: '',
});

const restaurantIcon = L.divIcon({
  html: '<div style="font-size:28px">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

const customerIcon = L.divIcon({
  html: '<div style="font-size:28px">🏠</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

// Generate intermediate points between two coordinates
function interpolatePoints(start, end, numPoints = 20) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = start[0] + (end[0] - start[0]) * t;
    const lng = start[1] + (end[1] - start[1]) * t;
    // Add slight randomness for realistic path
    const jitter = (Math.random() - 0.5) * 0.002;
    points.push([lat + jitter, lng + jitter]);
  }
  return points;
}

// Component to auto-fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const STATUS_STEPS = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];
const STATUS_LABELS = {
  ASSIGNED: 'Head to Restaurant',
  PICKED_UP: 'Pick up Order',
  ON_THE_WAY: 'Delivering to Customer',
  DELIVERED: 'Delivered!',
};
const STATUS_ICONS = {
  ASSIGNED: '🏪',
  PICKED_UP: '📦',
  ON_THE_WAY: '🚀',
  DELIVERED: '✅',
};

export default function ActiveDelivery() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [riderPos, setRiderPos] = useState(null);
  const [routeProgress, setRouteProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const navigate = useNavigate();
  const animRef = useRef(null);
  const routeRef = useRef([]);

  useEffect(() => {
    fetchActiveOrder();
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  const fetchActiveOrder = async () => {
    try {
      const { data } = await api.get('/orders/active');
      if (data.order) {
        setOrder(data.order);
        const pickup = [data.order.pickupLocation.lat, data.order.pickupLocation.lng];
        const delivery = [data.order.deliveryLocation.lat, data.order.deliveryLocation.lng];

        setRiderPos(pickup);
        setEta(data.order.estimatedTime || 15);

        // Generate full route
        const toRestaurant = interpolatePoints(pickup, pickup, 5);
        const toCustomer = interpolatePoints(pickup, delivery, 30);
        routeRef.current = [...toRestaurant, ...toCustomer];

        // Start animation
        startAnimation();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startAnimation = () => {
    if (animRef.current) clearInterval(animRef.current);

    let step = 0;
    animRef.current = setInterval(() => {
      if (routeRef.current.length === 0) return;
      step = (step + 1) % routeRef.current.length;
      setRiderPos(routeRef.current[step]);
      setRouteProgress(step);

      // Update ETA
      const remaining = routeRef.current.length - step;
      const etaMin = Math.max(1, Math.round((remaining / routeRef.current.length) * 25));
      setEta(etaMin);
    }, 800);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/orders/${order.orderId}/status`, { status: newStatus });
      if (data.success) {
        setOrder(data.order);
        toast.success(`Status: ${newStatus.replace('_', ' ')}`);

        if (newStatus === 'DELIVERED') {
          if (animRef.current) clearInterval(animRef.current);
          toast.success('Delivery completed! 🎉', { duration: 4000 });
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = () => {
    if (!order) return null;
    const idx = STATUS_STEPS.indexOf(order.status);
    return idx < STATUS_STEPS.length - 1 ? STATUS_STEPS[idx + 1] : null;
  };

  const nextStatus = getNextStatus();

  const routeLine = useMemo(() => {
    if (!order) return [];
    return [
      [order.pickupLocation.lat, order.pickupLocation.lng],
      [order.deliveryLocation.lat, order.deliveryLocation.lng],
    ];
  }, [order]);

  const mapBounds = useMemo(() => {
    if (!order) return null;
    return [
      [order.pickupLocation.lat, order.pickupLocation.lng],
      [order.deliveryLocation.lat, order.deliveryLocation.lng],
    ];
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-screen">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-xl font-bold mb-2">No Active Delivery</h2>
        <p className="text-dark-400 text-sm mb-6">Accept an order to start delivering</p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          View Available Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 relative">
      {/* Map */}
      <div className="h-[60vh] w-full relative">
        <MapContainer
          center={[order.pickupLocation.lat, order.pickupLocation.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds bounds={mapBounds} />

          {/* Route polyline */}
          <Polyline
            positions={routeLine}
            pathOptions={{ color: '#F97316', weight: 4, opacity: 0.8, dashArray: '10, 10' }}
          />

          {/* Restaurant marker */}
          <Marker
            position={[order.pickupLocation.lat, order.pickupLocation.lng]}
            icon={restaurantIcon}
          >
            <Popup>
              <div className="text-dark-900 font-semibold">{order.restaurantName}</div>
              <div className="text-xs text-gray-600">{order.pickupLocation.address}</div>
            </Popup>
          </Marker>

          {/* Customer marker */}
          <Marker
            position={[order.deliveryLocation.lat, order.deliveryLocation.lng]}
            icon={customerIcon}
          >
            <Popup>
              <div className="text-dark-900 font-semibold">{order.customerName || 'Customer'}</div>
              <div className="text-xs text-gray-600">{order.deliveryLocation.address}</div>
            </Popup>
          </Marker>

          {/* Rider marker with animation */}
          {riderPos && (
            <Marker position={riderPos} icon={bikeIcon}>
              <Popup>
                <div className="text-dark-900 font-semibold">You are here 🛵</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map overlays */}
        <div className="absolute top-4 left-4 z-[1000]">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 bg-dark-800/90 backdrop-blur-lg rounded-xl flex items-center justify-center border border-dark-700"
          >
            <FiArrowLeft className="text-white" size={20} />
          </motion.button>
        </div>

        {/* LIVE badge */}
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-lg px-3 py-1.5 rounded-full live-badge">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
        </div>

        {/* ETA badge */}
        <div className="absolute bottom-4 right-4 z-[1000]">
          <div className="flex items-center gap-1.5 bg-dark-800/90 backdrop-blur-lg px-3 py-2 rounded-xl border border-dark-700">
            <FiClock className="text-primary-400" size={14} />
            <span className="text-white text-sm font-semibold">{eta} min</span>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-dark-800 rounded-t-3xl border-t border-dark-700 -mt-6 relative z-10 px-4 pt-6 pb-8"
      >
        {/* Status progress */}
        <div className="flex items-center justify-between mb-5 px-2">
          {STATUS_STEPS.map((step, i) => {
            const isActive = STATUS_STEPS.indexOf(order.status) >= i;
            const isCurrent = order.status === step;
            return (
              <div key={step} className="flex items-center">
                <div className={`flex flex-col items-center ${i > 0 ? 'ml-1' : ''}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                      isCurrent
                        ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30'
                        : isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-dark-700 text-dark-500'
                    }`}
                  >
                    {STATUS_ICONS[step]}
                  </div>
                  <span className={`text-[9px] mt-1 ${isActive ? 'text-white' : 'text-dark-500'}`}>
                    {step.replace('_', ' ')}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 mt-[-12px] ${isActive ? 'bg-primary-500' : 'bg-dark-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current instruction */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-2xl">
              {STATUS_ICONS[order.status]}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{STATUS_LABELS[order.status]}</p>
              <p className="text-dark-400 text-xs mt-0.5">
                {order.status === 'ASSIGNED' && order.restaurantName}
                {order.status === 'PICKED_UP' && 'Confirm order pickup'}
                {order.status === 'ON_THE_WAY' && order.deliveryLocation?.address}
                {order.status === 'DELIVERED' && 'Delivery complete!'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-primary-400 font-bold">LKR {order.earnings}</p>
              <p className="text-dark-400 text-xs">{order.distance} km</p>
            </div>
          </div>
        </div>

        {/* Location cards */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl">
            <FiMapPin className="text-red-400 flex-shrink-0" size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-400">Pickup</p>
              <p className="text-sm font-medium truncate">{order.restaurantName}</p>
            </div>
            <a href={`tel:+94112345678`} className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center">
              <FiPhone className="text-dark-300" size={14} />
            </a>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl">
            <FiNavigation className="text-green-400 flex-shrink-0" size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-400">Deliver to</p>
              <p className="text-sm font-medium truncate">{order.customerName || 'Customer'}</p>
            </div>
            <a href={`tel:+94771234567`} className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center">
              <FiPhone className="text-dark-300" size={14} />
            </a>
          </div>
        </div>

        {/* Action button */}
        {nextStatus && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={updating}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
              nextStatus === 'DELIVERED'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25'
                : 'btn-primary'
            }`}
          >
            {updating ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiCheck size={20} />
                {nextStatus === 'PICKED_UP' && 'Confirm Pickup'}
                {nextStatus === 'ON_THE_WAY' && 'Start Delivery'}
                {nextStatus === 'DELIVERED' && 'Complete Delivery'}
              </>
            )}
          </motion.button>
        )}

        {order.status === 'DELIVERED' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-4"
          >
            <div className="text-5xl mb-2">🎉</div>
            <p className="text-xl font-bold text-green-400">Delivery Complete!</p>
            <p className="text-dark-400 text-sm mt-1">Earnings added to your account</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
