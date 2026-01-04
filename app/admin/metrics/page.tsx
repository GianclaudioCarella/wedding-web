'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MetricsSummary {
  totalApiCalls: number;
  totalTokens: number;
  estimatedCost: number;
  tavilyCallsToday: number;
  llmCallsToday: number;
}

interface RecentCall {
  timestamp: string;
  api_name: string;
  response_time_ms: number;
  success: boolean;
}

interface HourlyData {
  hour: string;
  tavily: number;
  llm: number;
  tokens: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

type PeriodFilter = '24h' | 'month';

export default function MetricsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [apiBreakdown, setApiBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('24h');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [periodFilter]);

  async function loadMetrics() {
    try {
      let startDate: string;
      
      if (periodFilter === 'month') {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDayOfMonth.toISOString();
      } else {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      }

      // Summary
      const { data: apiLogs } = await supabase
        .from('api_logs')
        .select('*')
        .gte('timestamp', startDate);

      const { data: tokens } = await supabase
        .from('tokens_usage')
        .select('*')
        .gte('timestamp', startDate);

      setSummary({
        totalApiCalls: apiLogs?.length || 0,
        totalTokens: tokens?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0,
        estimatedCost: tokens?.reduce((sum, t) => sum + (t.estimated_cost_usd || 0), 0) || 0,
        tavilyCallsToday: apiLogs?.filter(l => l.api_name === 'tavily').length || 0,
        llmCallsToday: tokens?.length || 0,
      });

      // Data aggregation for charts (by hour for 24h, by day for month)
      const timeMap = new Map<string, HourlyData>();
      
      apiLogs?.forEach(log => {
        const date = new Date(log.timestamp);
        const timeKey = periodFilter === 'month'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { hour: timeKey, tavily: 0, llm: 0, tokens: 0 });
        }
        const data = timeMap.get(timeKey)!;
        if (log.api_name === 'tavily') data.tavily++;
      });

      tokens?.forEach(token => {
        const date = new Date(token.timestamp);
        const timeKey = periodFilter === 'month'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { hour: timeKey, tavily: 0, llm: 0, tokens: 0 });
        }
        const data = timeMap.get(timeKey)!;
        data.llm++;
        data.tokens += token.total_tokens || 0;
      });

      setHourlyData(Array.from(timeMap.values()).sort((a, b) => a.hour.localeCompare(b.hour)));

      // API breakdown for pie chart
      const breakdown = new Map<string, number>();
      apiLogs?.forEach(log => {
        breakdown.set(log.api_name, (breakdown.get(log.api_name) || 0) + 1);
      });
      setApiBreakdown(Array.from(breakdown.entries()).map(([name, value]) => ({ name, value })));

      // Recent calls
      const { data: recent } = await supabase
        .from('api_logs')
        .select('timestamp, api_name, response_time_ms, success')
        .order('timestamp', { ascending: false })
        .limit(10);

      setRecentCalls(recent || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Admin</span>
          </button>
        </div>
        
        <div className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => router.push('/admin/chat')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-sm">AI Assistant</span>
            </button>
            <button
              onClick={() => router.push('/admin/metrics')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm">Metrics</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900 transition-colors text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Metrics
              </h1>
              <div className="flex gap-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPeriodFilter('24h')}
                    className={`px-4 py-2 rounded transition ${
                      periodFilter === '24h'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    24h
                  </button>
                  <button
                    onClick={() => setPeriodFilter('month')}
                    className={`px-4 py-2 rounded transition ${
                      periodFilter === 'month'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Month
                  </button>
                </div>
                <button
                  onClick={loadMetrics}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="text-gray-900 text-sm font-semibold mb-2">Total API Calls</div>
                <div className="text-3xl font-bold text-blue-600">{summary?.totalApiCalls || 0}</div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="text-gray-900 text-sm font-semibold mb-2">Tavily Calls</div>
                <div className="text-3xl font-bold text-green-600">{summary?.tavilyCallsToday || 0}</div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="text-gray-900 text-sm font-semibold mb-2">LLM Calls</div>
                <div className="text-3xl font-bold text-orange-600">{summary?.llmCallsToday || 0}</div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="text-gray-900 text-sm font-semibold mb-2">Total Tokens</div>
                <div className="text-3xl font-bold text-purple-600">
                  {(summary?.totalTokens || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="text-gray-900 text-sm font-semibold mb-2">Estimated Cost</div>
                <div className="text-3xl font-bold text-red-600">
                  ${(summary?.estimatedCost || 0).toFixed(4)}
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* API Calls by Hour Chart */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  API Calls per {periodFilter === '24h' ? 'Hour' : 'Day'}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tavily" fill="#10B981" name="Tavily" />
                    <Bar dataKey="llm" fill="#3B82F6" name="LLM" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Token Usage Chart */}
              {/* Token Usage Chart */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Token Usage per {periodFilter === '24h' ? 'Hour' : 'Day'}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="tokens" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      name="Tokens"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - API Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribution by API</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={apiBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {apiBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Additional Statistics */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-900 font-semibold">Success Rate</div>
                    <div className="text-2xl font-bold text-green-600">
                      {recentCalls.length > 0
                        ? ((recentCalls.filter(c => c.success).length / recentCalls.length) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-900 font-semibold">Average Response Time</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {recentCalls.length > 0
                        ? Math.round(
                            recentCalls.reduce((sum, c) => sum + (c.response_time_ms || 0), 0) /
                              recentCalls.length
                          )
                        : 0}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-900 font-semibold">Average Cost per Call</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${summary?.llmCallsToday
                        ? ((summary?.estimatedCost || 0) / summary.llmCallsToday).toFixed(6)
                        : '0.000000'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Calls */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Calls</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        API
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Time (ms)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentCalls.map((call, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(call.timestamp).toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {call.api_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {call.response_time_ms || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              call.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {call.success ? '✓ Success' : '✗ Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
