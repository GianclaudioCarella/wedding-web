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
  const [sentCount, setSentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [guests, setGuests] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'confirmed' | 'declined' | 'maybe' | 'no-response'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{id: string, name: string} | null>(null);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'en',
    total_guests: 1
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
        .select('id, name, email, phone, address, language, total_guests, save_the_date_sent, rsvp_link, attending, notes')
        .order('name', { ascending: true });

      if (guestsError) throw guestsError;
      setGuests(guestsData || []);

      // Calculate totals based on total_guests field
      const confirmedGuests = guestsData?.filter(g => g.attending === 'yes') || [];
      const declinedGuests = guestsData?.filter(g => g.attending === 'no') || [];
      const maybeGuests = guestsData?.filter(g => g.attending === 'perhaps') || [];

      const confirmedTotal = confirmedGuests.reduce((sum, g) => sum + (g.total_guests || 1), 0);
      const declinedTotal = declinedGuests.reduce((sum, g) => sum + (g.total_guests || 1), 0);
      const maybeTotal = maybeGuests.reduce((sum, g) => sum + (g.total_guests || 1), 0);
      const allGuestsTotal = (guestsData || []).reduce((sum, g) => sum + (g.total_guests || 1), 0);

      // Calculate sent and pending counts
      const sentGuests = guestsData?.filter(g => g.save_the_date_sent === true) || [];
      const pendingGuests = guestsData?.filter(g => g.save_the_date_sent !== true) || [];
      const sentTotal = sentGuests.length;
      const pendingTotal = pendingGuests.length;

      setTotalGuests(allGuestsTotal);
      setConfirmedCount(confirmedTotal);
      setDeclinedCount(declinedTotal);
      setMaybeCount(maybeTotal);
      setSentCount(sentTotal);
      setPendingCount(pendingTotal);
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
      if (isEditing && editingGuestId) {
        // Update existing guest
        const { error } = await supabase
          .from('guests')
          .update(newGuest)
          .eq('id', editingGuestId);

        if (error) throw error;
      } else {
        // Insert new guest
        const { error } = await supabase
          .from('guests')
          .insert([newGuest]);

        if (error) throw error;
      }

      // Reset form and close modal
      setNewGuest({ name: '', email: '', phone: '', address: '', language: 'en', total_guests: 1 });
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingGuestId(null);
      
      // Refresh the guests list
      fetchStats();
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('Failed to save guest');
    }
  };

  const handleEditClick = (guest: any) => {
    setNewGuest({
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      address: guest.address || '',
      language: guest.language || 'en',
      total_guests: guest.total_guests || 1
    });
    setEditingGuestId(guest.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (guest: any) => {
    setGuestToDelete({ id: guest.id, name: guest.name });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!guestToDelete) return;

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToDelete.id);

      if (error) throw error;

      // Close modal and refresh
      setIsDeleteModalOpen(false);
      setGuestToDelete(null);
      fetchStats();
    } catch (error) {
      console.error('Error deleting guest:', error);
      alert('Failed to delete guest');
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setGuestToDelete(null);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f7fd' }}>
        <p className="text-gray-900">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 px-6" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-[1800px] mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Confirmed (Yes)</h2>
            <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Declined (No)</h2>
            <p className="text-3xl font-bold text-red-600">{declinedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Maybe</h2>
            <p className="text-3xl font-bold text-yellow-600">{maybeCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">RSVP Sent Status</h2>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
              <span className="text-xs text-gray-500">sent</span>
              <span className="text-gray-400">/</span>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <span className="text-xs text-gray-500">pending</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Total Guests</h2>
            <p className="text-3xl font-bold text-gray-900">{totalGuests}</p>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Response Rate</h2>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-700">Responses Received</span>
                <span className="text-xs font-semibold text-gray-900">
                  {confirmedCount + declinedCount + maybeCount} / {totalGuests}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: totalGuests > 0 
                        ? `${((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {totalGuests > 0 
                    ? Math.round(((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">Guests List</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({guests.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'pending' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RSVP Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('sent')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'sent' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RSVP Sent ({sentCount})
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'confirmed' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Confirmed ({guests.filter(g => g.attending === 'yes').length})
              </button>
              <button
                onClick={() => setFilter('declined')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'declined' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Declined ({guests.filter(g => g.attending === 'no').length})
              </button>
              <button
                onClick={() => setFilter('maybe')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'maybe' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Maybe ({guests.filter(g => g.attending === 'perhaps').length})
              </button>
              <button
                onClick={() => setFilter('no-response')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'no-response' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No Response ({guests.filter(g => !g.attending).length})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Save the Date Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    RSVP Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests
                  .filter(guest => {
                    if (filter === 'all') return true;
                    if (filter === 'pending') return guest.save_the_date_sent !== true;
                    if (filter === 'sent') return guest.save_the_date_sent === true;
                    if (filter === 'confirmed') return guest.attending === 'yes';
                    if (filter === 'declined') return guest.attending === 'no';
                    if (filter === 'maybe') return guest.attending === 'perhaps';
                    if (filter === 'no-response') return !guest.attending;
                    return true;
                  })
                  .map((guest, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {guest.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                      {guest.phone || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-24">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {guest.language?.toUpperCase() || 'EN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {guest.total_guests || 1}
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
                    <td className="px-6 py-4 text-sm text-gray-500 w-48 max-w-48">
                      {guest.notes ? (
                        <div className="truncate" title={guest.notes}>
                          {guest.notes}
                        </div>
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
                    <td className="px-6 py-4 text-sm text-gray-500 w-64 max-w-64">
                      <a 
                        href={guest.rsvp_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                        title={guest.rsvp_link}
                      >
                        {guest.rsvp_link}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(guest)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                          title="Edit guest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {!guest.save_the_date_sent && (
                          <button
                            onClick={() => handleMarkAsSent(guest.id)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            title="Mark as sent"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(guest)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          title="Delete guest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Guest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{isEditing ? 'Edit Guest' : 'Add New Guest'}</h2>
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
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-900 mb-1">
                  Language *
                </label>
                <select
                  id="language"
                  value={newGuest.language}
                  onChange={(e) => setNewGuest({ ...newGuest, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label htmlFor="total_guests" className="block text-sm font-medium text-gray-900 mb-1">
                  Total Guests *
                </label>
                <input
                  type="number"
                  id="total_guests"
                  min="1"
                  value={newGuest.total_guests}
                  onChange={(e) => setNewGuest({ ...newGuest, total_guests: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
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
                  {isEditing ? 'Update Guest' : 'Add Guest'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingGuestId(null);
                    setNewGuest({ name: '', email: '', address: '', language: 'en', total_guests: 1 });
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && guestToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Delete</h2>
            <p className="text-gray-900 mb-6">
              Are you sure you want to delete <strong>{guestToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
