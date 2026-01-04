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
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isEditingInDetails, setIsEditingInDetails] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [columnWidths, setColumnWidths] = useState({
    name: 200,
    email: 200,
    tags: 192,
    language: 100,
    totalGuests: 100,
    attending: 100,
    notes: 192,
    dateSent: 110,
    rsvpLink: 256
  });
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'en',
    total_guests: 1,
    tags: [] as string[]
  });

  const getTagColor = (tag: string) => {
    const colors = [
      'border-blue-400 text-blue-400 bg-blue-400/10',
      'border-green-400 text-green-400 bg-green-400/10',
      'border-purple-400 text-purple-400 bg-purple-400/10',
      'border-pink-400 text-pink-400 bg-pink-400/10',
      'border-indigo-400 text-indigo-400 bg-indigo-400/10',
      'border-yellow-400 text-yellow-400 bg-yellow-400/10',
      'border-teal-400 text-teal-400 bg-teal-400/10',
      'border-orange-400 text-orange-400 bg-orange-400/10',
      'border-cyan-400 text-cyan-400 bg-cyan-400/10',
      'border-rose-400 text-rose-400 bg-rose-400/10',
      'border-lime-400 text-lime-400 bg-lime-400/10',
      'border-amber-400 text-amber-400 bg-amber-400/10',
      'border-emerald-400 text-emerald-400 bg-emerald-400/10',
      'border-violet-400 text-violet-400 bg-violet-400/10',
      'border-fuchsia-400 text-fuchsia-400 bg-fuchsia-400/10',
      'border-sky-400 text-sky-400 bg-sky-400/10',
      'border-red-400 text-red-400 bg-red-400/10',
      'border-slate-400 text-slate-400 bg-slate-400/10',
      'border-stone-400 text-stone-400 bg-stone-400/10',
      'border-zinc-400 text-zinc-400 bg-zinc-400/10',
    ];
    
    // Use simple hash of tag name for consistent color
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Theme helper functions
  const bg = (dark: string, light: string) => isDarkMode ? dark : light;
  const text = (dark: string, light: string) => isDarkMode ? dark : light;
  const border = (dark: string, light: string) => isDarkMode ? dark : light;

  useEffect(() => {
    checkAuth();
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('adminTheme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
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
        .select('id, name, email, phone, address, language, total_guests, save_the_date_sent, rsvp_link, attending, notes, tags')
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
      setNewGuest({ name: '', email: '', phone: '', address: '', language: 'en', total_guests: 1, tags: [] });
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
    setEditFormData({
      id: guest.id,
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      tags: guest.tags || [],
      address: guest.address || '',
      language: guest.language || 'en',
      total_guests: guest.total_guests || 1
    });
    setIsEditingInDetails(true);
  };

  const handleDeleteClick = (guest: any) => {
    setGuestToDelete({ id: guest.id, name: guest.name });
    setIsDeleteModalOpen(true);
  };

  const handleRowClick = (guest: any) => {
    setSelectedGuest(guest);
    setIsDetailsModalOpen(true);
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

  const handleSaveEdit = async () => {
    if (!editFormData || !editFormData.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      const { id, ...updateData } = editFormData;
      const { error } = await supabase
        .from('guests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Fetch the updated guest data including the regenerated rsvp_link
      const { data: updatedGuest, error: fetchError } = await supabase
        .from('guests')
        .select('id, name, email, phone, address, language, total_guests, save_the_date_sent, rsvp_link, attending, notes, tags')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update selectedGuest with fresh data from database
      setSelectedGuest(updatedGuest);
      setIsEditingInDetails(false);
      setEditFormData(null);
      fetchStats();
    } catch (error) {
      console.error('Error updating guest:', error);
      alert('Failed to update guest');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingInDetails(false);
    setEditFormData(null);
    setCustomTagInput('');
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('adminTheme', newTheme ? 'dark' : 'light');
  };

  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column as keyof typeof columnWidths]
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={`min-h-screen py-8 px-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1800px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Wedding Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode 
                  ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30' 
                  : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={() => router.push('/admin/events')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-purple-500 text-purple-400 hover:bg-purple-900/30'
                  : 'border-purple-600 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Events
            </button>
            <button
              onClick={() => router.push('/admin/chat')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-green-500 text-green-400 hover:bg-green-900/30'
                  : 'border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              AI Assistant
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-blue-500 text-blue-400 hover:bg-blue-900/30'
                  : 'border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Guest
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-gray-600 text-gray-400 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Confirmed (Yes)</h2>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{confirmedCount}</p>
          </div>

          <div className={`rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Declined (No)</h2>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{declinedCount}</p>
          </div>

          <div className={`rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Maybe</h2>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{maybeCount}</p>
          </div>

          <div className={`rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>RSVP Sent Status</h2>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{sentCount}</p>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>sent</span>
              <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>/</span>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{pendingCount}</p>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>pending</span>
            </div>
          </div>

          <div className={`rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Guests</h2>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{totalGuests}</p>
          </div>
        </div>

        <div className={`mt-4 rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Response Rate</h2>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Responses Received</span>
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {confirmedCount + declinedCount + maybeCount} / {totalGuests}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex-1 rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: totalGuests > 0 
                        ? `${((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {totalGuests > 0 
                    ? Math.round(((confirmedCount + declinedCount + maybeCount) / totalGuests) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-4 rounded-lg shadow-md p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="mb-4">
            <h2 className={`text-base font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Guests List</h2>
            
            {/* Name Search Input */}
            <div className="mb-3">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {nameSearch && (
                  <button
                    onClick={() => setNameSearch('')}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'all' 
                    ? `border-2 ${isDarkMode ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-blue-600 bg-blue-50 text-blue-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                All ({guests.reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'pending' 
                    ? `border-2 ${isDarkMode ? 'border-orange-500 bg-orange-900/40 text-orange-300' : 'border-orange-600 bg-orange-50 text-orange-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                RSVP Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('sent')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'sent' 
                    ? `border-2 ${isDarkMode ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-blue-600 bg-blue-50 text-blue-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                RSVP Sent ({sentCount})
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'confirmed' 
                    ? `border-2 ${isDarkMode ? 'border-green-500 bg-green-900/40 text-green-300' : 'border-green-600 bg-green-50 text-green-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                Confirmed ({guests.filter(g => g.attending === 'yes').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('declined')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'declined' 
                    ? `border-2 ${isDarkMode ? 'border-red-500 bg-red-900/40 text-red-300' : 'border-red-600 bg-red-50 text-red-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                Declined ({guests.filter(g => g.attending === 'no').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('maybe')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'maybe' 
                    ? `border-2 ${isDarkMode ? 'border-yellow-500 bg-yellow-900/40 text-yellow-300' : 'border-yellow-600 bg-yellow-50 text-yellow-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                Maybe ({guests.filter(g => g.attending === 'perhaps').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('no-response')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'no-response' 
                    ? `border-2 ${isDarkMode ? 'border-gray-500 bg-gray-700/40 text-gray-300' : 'border-gray-600 bg-gray-50 text-gray-700'}` 
                    : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }`}
              >
                No Response ({guests.filter(g => !g.attending).reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
            </div>
            
            {/* Tag Filters */}
            {(() => {
              const allTags = Array.from(new Set(guests.flatMap(g => g.tags || [])));
              if (allTags.length > 0) {
                return (
                  <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter by Tag:</p>
                    <div className="flex flex-wrap gap-2">
                      {tagFilter.length > 0 && (
                        <button
                          onClick={() => setTagFilter([])}
                          className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-gray-400 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Clear All Tags ×
                        </button>
                      )}
                      {allTags.sort().map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (tagFilter.includes(tag)) {
                              setTagFilter(tagFilter.filter(t => t !== tag));
                            } else {
                              setTagFilter([...tagFilter, tag]);
                            }
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            tagFilter.includes(tag)
                              ? `border-2 ${isDarkMode ? 'border-blue-400 bg-blue-900/30 text-blue-300' : 'border-blue-600 bg-blue-50 text-blue-700'}`
                              : `border ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-gray-400 text-gray-700 hover:bg-gray-100'}`
                          }`}
                        >
                          {tag} ({guests.filter(g => g.tags?.includes(tag)).reduce((sum, g) => sum + (g.total_guests || 1), 0)})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`} style={{ tableLayout: 'fixed' }}>
              <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.name}px` }}>
                    Name
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'name')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.email}px` }}>
                    Email
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'email')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.tags}px` }}>
                    Tags
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'tags')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.language}px` }}>
                    Language
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'language')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.totalGuests}px` }}>
                    Total Guests
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'totalGuests')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.dateSent}px` }}>
                    Save the Date Sent
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'dateSent')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.attending}px` }}>
                    Attending
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'attending')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.notes}px` }}>
                    Notes
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'notes')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider relative ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ width: `${columnWidths.rsvpLink}px` }}>
                    RSVP Link
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'rsvpLink')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {guests
                  .filter(guest => {
                    // Filter by status
                    let statusMatch = true;
                    if (filter === 'pending') statusMatch = guest.save_the_date_sent !== true;
                    else if (filter === 'sent') statusMatch = guest.save_the_date_sent === true;
                    else if (filter === 'confirmed') statusMatch = guest.attending === 'yes';
                    else if (filter === 'declined') statusMatch = guest.attending === 'no';
                    else if (filter === 'maybe') statusMatch = guest.attending === 'perhaps';
                    else if (filter === 'no-response') statusMatch = !guest.attending;
                    
                    // Filter by tag (match if guest has ANY of the selected tags)
                    const tagMatch = tagFilter.length === 0 || (guest.tags && tagFilter.some(tag => guest.tags.includes(tag)));
                    
                    // Filter by name search
                    const nameMatch = !nameSearch || guest.name.toLowerCase().includes(nameSearch.toLowerCase());
                    
                    return statusMatch && tagMatch && nameMatch;
                  })
                  .map((guest, index) => (
                  <tr key={index} onClick={() => handleRowClick(guest)} className={`cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 text-sm font-medium overflow-hidden ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      <div className="truncate">{guest.name}</div>
                    </td>
                    <td className={`px-6 py-4 text-sm overflow-hidden ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div className="truncate">{guest.email || <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>}</div>
                    </td>
                    <td className={`px-6 py-4 text-sm overflow-hidden ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {guest.tags && guest.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {guest.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                        {guest.language?.toUpperCase() || 'EN'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {guest.total_guests || 1}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {guest.save_the_date_sent ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>
                          Yes
                        </span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          No
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {guest.attending ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          guest.attending === 'yes' ? (isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700') :
                          guest.attending === 'no' ? (isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700') :
                          (isDarkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : 'Maybe'}
                        </span>
                      ) : (
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm overflow-hidden ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {guest.notes ? (
                        <div className="truncate" title={guest.notes}>
                          {guest.notes}
                        </div>
                      ) : (
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm w-64 max-w-64 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <a 
                        href={guest.rsvp_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`block truncate ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                        title={guest.rsvp_link}
                      >
                        {guest.rsvp_link}
                      </a>
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)' }}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{isEditing ? 'Edit Guest' : 'Add New Guest'}</h2>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label htmlFor="name" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>

              <div>
                <label htmlFor="phone" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tags
                </label>
                
                {/* Selected Tags Display */}
                {newGuest.tags && newGuest.tags.length > 0 && (
                  <div className={`mb-3 p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Selected tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {newGuest.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getTagColor(tag)}`}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setNewGuest({ ...newGuest, tags: newGuest.tags.filter(t => t !== tag) })}
                              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Custom Tag Input */}
                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value.toLowerCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const tag = customTagInput.trim();
                          if (tag && !(newGuest.tags || []).includes(tag)) {
                            setNewGuest({ ...newGuest, tags: [...(newGuest.tags || []), tag] });
                            setCustomTagInput('');
                          }
                        }
                      }}
                      placeholder="Type custom tag and press Enter"
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = customTagInput.trim();
                        if (tag && !(newGuest.tags || []).includes(tag)) {
                          setNewGuest({ ...newGuest, tags: [...(newGuest.tags || []), tag] });
                          setCustomTagInput('');
                        }
                      }}
                      className={`px-4 py-2 border rounded-md transition-colors text-sm ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Add
                    </button>
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Create your own custom tags (e.g., bride, groom, family, padrinho, etc.)</p>
                </div>
              </div>

              <div>
                <label htmlFor="language" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Language *
                </label>
                <select
                  id="language"
                  value={newGuest.language}
                  onChange={(e) => setNewGuest({ ...newGuest, language: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  required
                >
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div>
                <label htmlFor="total_guests" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total Guests *
                </label>
                <input
                  type="number"
                  id="total_guests"
                  min="1"
                  value={newGuest.total_guests}
                  onChange={(e) => setNewGuest({ ...newGuest, total_guests: parseInt(e.target.value) || 1 })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  required
                />
              </div>

              <div>
                <label htmlFor="address" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Address
                </label>
                <textarea
                  id="address"
                  value={newGuest.address}
                  onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Update Guest' : 'Add Guest'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingGuestId(null);
                    setNewGuest({ name: '', email: '', phone: '', address: '', language: 'en', total_guests: 1, tags: [] });
                  }}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)' }}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Confirm Delete</h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Are you sure you want to delete <strong className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>{guestToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={handleDeleteCancel}
                className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Guest Details Modal */}
      {isDetailsModalOpen && selectedGuest && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)' }}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Guest Details</h2>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedGuest(null);
                }}
                className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!isEditingInDetails ? (
              /* View Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                    <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedGuest.name}</p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Guests</label>
                    <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedGuest.total_guests || 1}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                    <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>{selectedGuest.email || <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Not provided</span>}</p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                    <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>{selectedGuest.phone || <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Not provided</span>}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Language</label>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      {selectedGuest.language?.toUpperCase() || 'EN'}
                    </span>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>RSVP Status</label>
                    <div>
                      {selectedGuest.attending ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedGuest.attending === 'yes' ? (isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700') :
                          selectedGuest.attending === 'no' ? (isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700') :
                          (isDarkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {selectedGuest.attending === 'yes' ? 'Confirmed' : selectedGuest.attending === 'no' ? 'Declined' : 'Maybe'}
                        </span>
                      ) : (
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>No response yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
                  <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>{selectedGuest.address || <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Not provided</span>}</p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Save the Date Sent</label>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedGuest.save_the_date_sent ? (isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700') : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                  }`}>
                    {selectedGuest.save_the_date_sent ? 'Yes' : 'No'}
                  </span>
                </div>

                {selectedGuest.notes && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Notes</label>
                    <p className={`p-3 rounded border ${isDarkMode ? 'text-gray-100 bg-gray-700 border-gray-600' : 'text-gray-900 bg-gray-50 border-gray-200'}`}>{selectedGuest.notes}</p>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>RSVP Link</label>
                  <div className="flex items-center gap-2">
                    <a 
                      href={selectedGuest.rsvp_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`hover:underline break-all flex-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      {selectedGuest.rsvp_link}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedGuest.rsvp_link);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 border rounded-lg transition-all ${
                        isCopied 
                          ? (isDarkMode ? 'border-green-500 bg-green-900/40 text-green-300' : 'border-green-500 bg-green-50 text-green-700')
                          : (isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                      }`}
                      title={isCopied ? 'Copied!' : 'Copy link'}
                    >
                      {isCopied ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs font-medium">Copied</span>
                        </>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {selectedGuest.tags && selectedGuest.tags.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedGuest.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Language *</label>
                    <select
                      value={editFormData.language}
                      onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Guests *</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.total_guests}
                      onChange={(e) => setEditFormData({ ...editFormData, total_guests: parseInt(e.target.value) || 1 })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
                  <textarea
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tags</label>
                  
                  {editFormData.tags && editFormData.tags.length > 0 && (
                    <div className={`mb-3 p-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Selected tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {editFormData.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getTagColor(tag)}`}
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, tags: editFormData.tags.filter((t: string) => t !== tag) })}
                                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value.toLowerCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const tag = customTagInput.trim();
                          if (tag && !editFormData.tags.includes(tag)) {
                            setEditFormData({ ...editFormData, tags: [...editFormData.tags, tag] });
                            setCustomTagInput('');
                          }
                        }
                      }}
                      placeholder="Type custom tag and press Enter"
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = customTagInput.trim();
                        if (tag && !editFormData.tags.includes(tag)) {
                          setEditFormData({ ...editFormData, tags: [...editFormData.tags, tag] });
                          setCustomTagInput('');
                        }
                      }}
                      className={`px-4 py-2 border rounded-md transition-colors text-sm ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {!isEditingInDetails ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditClick(selectedGuest)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-blue-600 text-blue-400 hover:bg-blue-900/30' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                  {!selectedGuest.save_the_date_sent && (
                    <button
                      onClick={() => {
                        handleMarkAsSent(selectedGuest.id);
                        setIsDetailsModalOpen(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-green-600 text-green-400 hover:bg-green-900/30' : 'border-green-600 text-green-600 hover:bg-green-50'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Sent
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleDeleteClick(selectedGuest);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-red-600 text-red-400 hover:bg-red-900/30' : 'border-red-600 text-red-600 hover:bg-red-50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setSelectedGuest(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ml-auto ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}    </main>
  );
}
