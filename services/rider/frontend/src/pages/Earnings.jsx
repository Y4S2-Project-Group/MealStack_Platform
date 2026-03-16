import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiTrendingUp, FiClock, FiCheckCircle } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { api } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { StatSkeleton } from '../components/LoadingSkeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Earnings() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.get('/earnings/summary'),
        api.get('/earnings/history?limit=50'),
      ]);
      setSummary(summaryRes.data.summary);
      setHistory(historyRes.data.earnings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: summary?.weeklyBreakdown?.map(d => d.day) || [],
    datasets: [
      {
        label: 'Earnings (LKR)',
        data: summary?.weeklyBreakdown?.map(d => d.earnings) || [],
        backgroundColor: 'rgba(249, 115, 22, 0.6)',
        borderColor: '#F97316',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `LKR ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (val) => `LKR ${val}`,
        },
      },
    },
  };

  const typeLabels = { delivery: '🚚 Delivery', bonus: '🎁 Bonus', tip: '💝 Tip' };
  const statusColors = { pending: 'text-yellow-400', paid: 'text-green-400' };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold">Earnings 💰</h1>
        <p className="text-dark-400 text-sm mt-0.5">Track your delivery income</p>
      </motion.div>

      {/* Earnings Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <FiDollarSign className="text-primary-400" size={16} />
              </div>
              <span className="text-dark-400 text-xs">Today</span>
            </div>
            <motion.p
              key={summary?.today?.earnings}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-primary-400"
            >
              LKR {summary?.today?.earnings || 0}
            </motion.p>
            <p className="text-dark-500 text-xs mt-0.5">{summary?.today?.trips || 0} deliveries</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="text-blue-400" size={16} />
              </div>
              <span className="text-dark-400 text-xs">This Week</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">LKR {summary?.week?.earnings || 0}</p>
            <p className="text-dark-500 text-xs mt-0.5">{summary?.week?.trips || 0} deliveries</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="text-green-400" size={16} />
              </div>
              <span className="text-dark-400 text-xs">This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-400">LKR {summary?.month?.earnings || 0}</p>
            <p className="text-dark-500 text-xs mt-0.5">{summary?.month?.trips || 0} deliveries</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <FiClock className="text-yellow-400" size={16} />
              </div>
              <span className="text-dark-400 text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">LKR {summary?.pending || 0}</p>
            <p className="text-dark-500 text-xs mt-0.5">Awaiting payout</p>
          </div>
        </motion.div>
      )}

      {/* Weekly Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 mb-6"
      >
        <h3 className="font-semibold mb-3">Weekly Earnings</h3>
        <div className="h-48">
          {summary?.weeklyBreakdown && <Bar data={chartData} options={chartOptions} />}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700'
          }`}
        >
          Payout History
        </button>
      </div>

      {/* History List */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {history.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-dark-400">No earning records yet</p>
            </div>
          ) : (
            history.map((earning, idx) => (
              <motion.div
                key={earning._id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{typeLabels[earning.type]?.split(' ')[0] || '💰'}</span>
                  <div>
                    <p className="text-sm font-medium">{earning.description || earning.type}</p>
                    <p className="text-xs text-dark-400">
                      {new Date(earning.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">LKR {earning.amount}</p>
                  <p className={`text-xs capitalize ${statusColors[earning.status]}`}>
                    {earning.status}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-card divide-y divide-dark-700">
            <div className="flex justify-between items-center p-3">
              <span className="text-dark-300 text-sm">Total Earnings (All Time)</span>
              <span className="font-bold text-primary-400">LKR {summary?.total?.earnings || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3">
              <span className="text-dark-300 text-sm">Total Deliveries</span>
              <span className="font-semibold">{summary?.total?.trips || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3">
              <span className="text-dark-300 text-sm">Avg per Delivery</span>
              <span className="font-semibold">
                LKR {summary?.total?.trips > 0
                  ? Math.round((summary?.total?.earnings || 0) / summary.total.trips)
                  : 0}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
}
