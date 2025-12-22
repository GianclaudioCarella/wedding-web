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
  const [guests, setGuests] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    address: ''
  });

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
      // Get all guests with name, save_the_date_sent, and rsvp_link
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('id, name, save_the_date_sent, rsvp_link, attending')
        .order('name', { ascending: true });

      if (guestsError) throw guestsError;
      setGuests(guestsData || []);

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

  const handleMarkAsSent = async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({ save_the_date_sent: true })
        .eq('id', guestId);

      if (error) throw error;

      // Refresh the guests list
      fetchStats();
    } catch (error) {
      console.error('Error updating save_the_date_sent:', error);
      alert('Failed to update status');
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGuest.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('guests')
        .insert([newGuest]);

      if (error) throw error;

      // Reset form and close modal
      setNewGuest({ name: '', email: '', address: '' });
      setIsModalOpen(false);
      
      // Refresh the guests list
      fetchStats();
    } catch (error) {
      console.error('Error adding guest:', error);
      alert('Failed to add guest');
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wedding Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Guest
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
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

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guests List</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Save the Date Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSVP Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {guest.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.attending ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          guest.attending === 'yes' ? 'bg-green-100 text-green-800' :
                          guest.attending === 'no' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : 'Maybe'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.save_the_date_sent ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a 
                        href={guest.rsvp_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {guest.rsvp_link}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!guest.save_the_date_sent && (
                        <button
                          onClick={() => handleMarkAsSent(guest.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Mark as Sent
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Guest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Guest</h2>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  value={newGuest.address}
                  onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewGuest({ name: '', email: '', address: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
