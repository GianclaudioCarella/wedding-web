'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [maybeCount, setMaybeCount] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/admin/login');
      return;
    }

    setIsAuthenticated(true);
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      // Get total guests
      const { count: total } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true });

      // Get confirmed guests (attending = 'yes')
      const { count: confirmed } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('attending', 'yes');

      // Get declined guests (attending = 'no')
      const { count: declined } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('attending', 'no');

      // Get maybe guests (attending = 'perhaps')
      const { count: maybe } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('attending', 'perhaps');

      setTotalGuests(total || 0);
      setConfirmedCount(confirmed || 0);
      setDeclinedCount(declined || 0);
      setMaybeCount(maybe || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Confirmed (Yes)</h2>
            <p className="text-4xl font-bold text-green-600">{confirmedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Declined (No)</h2>
            <p className="text-4xl font-bold text-red-600">{declinedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Maybe</h2>
            <p className="text-4xl font-bold text-yellow-600">{maybeCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Guests</h2>
            <p className="text-4xl font-bold text-gray-900">{totalGuests}</p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Rate</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">Responses Received</span>
                <span className="text-sm font-semibold text-gray-900">
                  {confirmedCount + declinedCount + maybeCount} / {totalGuests}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ 
                      width: totalGuests > 0 
                        ? `${((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {totalGuests > 0 
                    ? Math.round(((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
