'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
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
      const startDate = periodFilter === 'month'
        ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: apiLogs } = await supabase.from('api_logs').select('*').gte('timestamp', startDate);
      const { data: tokens }  = await supabase.from('tokens_usage').select('*').gte('timestamp', startDate);

      setSummary({
        totalApiCalls:    apiLogs?.length || 0,
        totalTokens:      tokens?.reduce((s, t) => s + (t.total_tokens || 0), 0) || 0,
        estimatedCost:    tokens?.reduce((s, t) => s + (t.estimated_cost_usd || 0), 0) || 0,
        tavilyCallsToday: apiLogs?.filter(l => l.api_name === 'tavily').length || 0,
        llmCallsToday:    tokens?.length || 0,
      });

      const timeMap = new Map<string, HourlyData>();
      const timeKey = (ts: string) => {
        const d = new Date(ts);
        return periodFilter === 'month'
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      };
      const ensure = (k: string) => {
        if (!timeMap.has(k)) timeMap.set(k, { hour: k, tavily: 0, llm: 0, tokens: 0 });
        return timeMap.get(k)!;
      };
      apiLogs?.forEach(l => { if (l.api_name === 'tavily') ensure(timeKey(l.timestamp)).tavily++; });
      tokens?.forEach(t => { const d = ensure(timeKey(t.timestamp)); d.llm++; d.tokens += t.total_tokens || 0; });
      setHourlyData(Array.from(timeMap.values()).sort((a, b) => a.hour.localeCompare(b.hour)));

      const bkdn = new Map<string, number>();
      apiLogs?.forEach(l => bkdn.set(l.api_name, (bkdn.get(l.api_name) || 0) + 1));
      setApiBreakdown(Array.from(bkdn.entries()).map(([name, value]) => ({ name, value })));

      const { data: recent } = await supabase
        .from('api_logs').select('timestamp, api_name, response_time_ms, success')
        .order('timestamp', { ascending: false }).limit(10);
      setRecentCalls(recent || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  const periodLabel = periodFilter === '24h' ? 'Hour' : 'Day';

  const summaryCards = [
    { label: 'Total API Calls',  value: summary?.totalApiCalls || 0,                          color: '#3b82f6' },
    { label: 'Tavily Calls',     value: summary?.tavilyCallsToday || 0,                        color: '#10b981' },
    { label: 'LLM Calls',       value: summary?.llmCallsToday || 0,                            color: '#f59e0b' },
    { label: 'Total Tokens',     value: (summary?.totalTokens || 0).toLocaleString(),           color: '#8b5cf6' },
    { label: 'Estimated Cost',   value: `$${(summary?.estimatedCost || 0).toFixed(4)}`,         color: '#ef4444' },
  ];

  const successRate = recentCalls.length
    ? ((recentCalls.filter(c => c.success).length / recentCalls.length) * 100).toFixed(1)
    : '0';
  const avgResponse = recentCalls.length
    ? Math.round(recentCalls.reduce((s, c) => s + (c.response_time_ms || 0), 0) / recentCalls.length)
    : 0;
  const avgCost = summary?.llmCallsToday
    ? ((summary.estimatedCost || 0) / summary.llmCallsToday).toFixed(6)
    : '0.000000';

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, minHeight: '100%', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 4px' }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', margin: 0 }}>Metrics</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Period toggle */}
          <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
            {(['24h', 'month'] as PeriodFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: periodFilter === p ? '#111827' : '#fff',
                  color:      periodFilter === p ? '#fff'    : '#6b7280',
                }}
              >
                {p === '24h' ? '24h' : 'Month'}
              </button>
            ))}
          </div>
          <button
            onClick={loadMetrics}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* API calls bar chart */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 20px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>API Calls per {periodLabel}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tavily" fill="#10B981" name="Tavily" radius={[2, 2, 0, 0]} />
              <Bar dataKey="llm"    fill="#3B82F6" name="LLM"    radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Token usage line chart */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 20px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Token Usage per {periodLabel}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="tokens" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Tokens" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* API distribution pie */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 20px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Distribution by API</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={apiBreakdown}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                dataKey="value"
              >
                {apiBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Statistics</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Success Rate',         value: `${successRate}%`,   color: '#16a34a' },
              { label: 'Avg Response Time',     value: `${avgResponse}ms`, color: '#3b82f6' },
              { label: 'Avg Cost per LLM Call', value: `$${avgCost}`,      color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent calls table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Recent Calls</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Timestamp', 'API', 'Time (ms)', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentCalls.map((call, idx) => (
              <tr key={idx} style={{ borderBottom: idx < recentCalls.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>
                  {new Date(call.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', background: '#f3f4f6', borderRadius: 4, color: '#374151' }}>
                    {call.api_name}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#374151' }}>
                  {call.response_time_ms ?? '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: call.success ? '#f0fdf4' : '#fef2f2',
                    color:      call.success ? '#16a34a'  : '#dc2626',
                  }}>
                    {call.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
