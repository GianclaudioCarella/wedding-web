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
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-yellow-100 text-yellow-700',
      'bg-teal-100 text-teal-700',
      'bg-orange-100 text-orange-700',
      'bg-cyan-100 text-cyan-700',
      'bg-rose-100 text-rose-700',
      'bg-lime-100 text-lime-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-violet-100 text-violet-700',
      'bg-fuchsia-100 text-fuchsia-700',
      'bg-sky-100 text-sky-700',
      'bg-red-100 text-red-700',
      'bg-slate-100 text-slate-700',
      'bg-stone-100 text-stone-700',
      'bg-zinc-100 text-zinc-700',
    ];
    
    // Use simple hash of tag name for consistent color
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

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
              onClick={() => router.push('/admin/events')}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Events
            </button>
            <button
              onClick={() => router.push('/admin/chat')}
              className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              AI Assistant
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Guest
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Confirmed (Yes)</h2>
            <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Declined (No)</h2>
            <p className="text-3xl font-bold text-red-600">{declinedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Maybe</h2>
            <p className="text-3xl font-bold text-yellow-600">{maybeCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">RSVP Sent Status</h2>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
              <span className="text-xs text-gray-500">sent</span>
              <span className="text-gray-400">/</span>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <span className="text-xs text-gray-500">pending</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Total Guests</h2>
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
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Guests List</h2>
            
            {/* Name Search Input */}
            <div className="mb-3">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {nameSearch && (
                  <button
                    onClick={() => setNameSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    ? 'border-2 border-blue-400 bg-blue-50 text-blue-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All ({guests.reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'pending' 
                    ? 'border-2 border-orange-400 bg-orange-50 text-orange-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                RSVP Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('sent')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'sent' 
                    ? 'border-2 border-blue-400 bg-blue-50 text-blue-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                RSVP Sent ({sentCount})
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'confirmed' 
                    ? 'border-2 border-green-400 bg-green-50 text-green-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Confirmed ({guests.filter(g => g.attending === 'yes').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('declined')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'declined' 
                    ? 'border-2 border-red-400 bg-red-50 text-red-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Declined ({guests.filter(g => g.attending === 'no').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('maybe')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'maybe' 
                    ? 'border-2 border-yellow-400 bg-yellow-50 text-yellow-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Maybe ({guests.filter(g => g.attending === 'perhaps').reduce((sum, g) => sum + (g.total_guests || 1), 0)})
              </button>
              <button
                onClick={() => setFilter('no-response')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === 'no-response' 
                    ? 'border-2 border-gray-400 bg-gray-50 text-gray-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Filter by Tag:</p>
                    <div className="flex flex-wrap gap-2">
                      {tagFilter.length > 0 && (
                        <button
                          onClick={() => setTagFilter([])}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
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
                              ? 'border-2 border-blue-400 bg-blue-50 text-blue-700'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
            <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.name}px` }}>
                    Name
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'name')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.email}px` }}>
                    Email
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'email')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.tags}px` }}>
                    Tags
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'tags')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.language}px` }}>
                    Language
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'language')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.totalGuests}px` }}>
                    Total Guests
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'totalGuests')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.dateSent}px` }}>
                    Save the Date Sent
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'dateSent')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.attending}px` }}>
                    Attending
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'attending')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.notes}px` }}>
                    Notes
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'notes')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider relative" style={{ width: `${columnWidths.rsvpLink}px` }}>
                    RSVP Link
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'rsvpLink')}
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                  <tr key={index} onClick={() => handleRowClick(guest)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 overflow-hidden">
                      <div className="truncate">{guest.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden">
                      <div className="truncate">{guest.email || <span className="text-gray-400">-</span>}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden">
                      {guest.tags && guest.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {guest.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {guest.language?.toUpperCase() || 'EN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">
                      {guest.total_guests || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
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
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden">
                      {guest.notes ? (
                        <div className="truncate" title={guest.notes}>
                          {guest.notes}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
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
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Tags
                </label>
                
                {/* Selected Tags Display */}
                {newGuest.tags && newGuest.tags.length > 0 && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">Selected tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {newGuest.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getTagColor(tag)}`}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
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
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Create your own custom tags (e.g., bride, groom, family, padrinho, etc.)</p>
                </div>
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
                  <option value="es">Español</option>
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Guest Details Modal */}
      {isDetailsModalOpen && selectedGuest && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Guest Details</h2>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedGuest(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
                    <p className="text-gray-900 font-medium">{selectedGuest.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Total Guests</label>
                    <p className="text-gray-900 font-medium">{selectedGuest.total_guests || 1}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                    <p className="text-gray-900">{selectedGuest.email || <span className="text-gray-400">Not provided</span>}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                    <p className="text-gray-900">{selectedGuest.phone || <span className="text-gray-400">Not provided</span>}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Language</label>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {selectedGuest.language?.toUpperCase() || 'EN'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">RSVP Status</label>
                    <div>
                      {selectedGuest.attending ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedGuest.attending === 'yes' ? 'bg-green-100 text-green-800' :
                          selectedGuest.attending === 'no' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedGuest.attending === 'yes' ? 'Confirmed' : selectedGuest.attending === 'no' ? 'Declined' : 'Maybe'}
                        </span>
                      ) : (
                        <span className="text-gray-400">No response yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Address</label>
                  <p className="text-gray-900">{selectedGuest.address || <span className="text-gray-400">Not provided</span>}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Save the Date Sent</label>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedGuest.save_the_date_sent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedGuest.save_the_date_sent ? 'Yes' : 'No'}
                  </span>
                </div>

                {selectedGuest.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedGuest.notes}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">RSVP Link</label>
                  <div className="flex items-center gap-2">
                    <a 
                      href={selectedGuest.rsvp_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
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
                          ? 'border-green-300 bg-green-50 text-green-600' 
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedGuest.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Language *</label>
                    <select
                      value={editFormData.language}
                      onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Total Guests *</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.total_guests}
                      onChange={(e) => setEditFormData({ ...editFormData, total_guests: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Address</label>
                  <textarea
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Tags</label>
                  
                  {editFormData.tags && editFormData.tags.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-500 mb-1">Selected tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {editFormData.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getTagColor(tag)}`}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
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
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {!isEditingInDetails ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditClick(selectedGuest)}
                    className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
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
