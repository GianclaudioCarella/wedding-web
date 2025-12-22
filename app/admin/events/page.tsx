'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
}

interface Guest {
  id: string;
  name: string;
  total_guests: number;
}

export default function EventsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [eventGuests, setEventGuests] = useState<any[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [eventGuestCounts, setEventGuestCounts] = useState<Record<string, { guests: number; people: number }>>({});
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    event_date: '',
    location: ''
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
    fetchEvents();
    fetchAllGuests();
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      
      // Fetch guest counts for all events
      if (data && data.length > 0) {
        await fetchEventGuestCounts(data.map(e => e.id));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventGuestCounts = async (eventIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('event_guests')
        .select(`
          event_id,
          guests (id, total_guests)
        `)
        .in('event_id', eventIds);

      if (error) throw error;

      const counts: Record<string, { guests: number; people: number }> = {};
      
      eventIds.forEach(eventId => {
        const eventGuestsData = data?.filter((eg: any) => eg.event_id === eventId) || [];
        const guestCount = eventGuestsData.length;
        const peopleCount = eventGuestsData.reduce((sum: number, eg: any) => 
          sum + (eg.guests?.total_guests || 1), 0
        );
        
        counts[eventId] = { guests: guestCount, people: peopleCount };
      });

      setEventGuestCounts(counts);
    } catch (error) {
      console.error('Error fetching event guest counts:', error);
    }
  };

  const fetchAllGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, name, total_guests')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const fetchEventGuests = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_guests')
        .select(`
          id,
          guest_id,
          guests (id, name, total_guests)
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setEventGuests(data || []);
    } catch (error) {
      console.error('Error fetching event guests:', error);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEvent.name.trim() || !newEvent.event_date) {
      alert('Name and date are required');
      return;
    }

    try {
      if (isEditing && editingEventId) {
        const { error } = await supabase
          .from('events')
          .update(newEvent)
          .eq('id', editingEventId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert([newEvent]);

        if (error) throw error;
      }

      setNewEvent({ name: '', description: '', event_date: '', event_time: '', location: '' });
      setIsEventModalOpen(false);
      setIsEditing(false);
      setEditingEventId(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  const handleEditEvent = (event: Event) => {
    setNewEvent({
      name: event.name,
      description: event.description || '',
      event_date: event.event_date,
      location: event.location || ''
    });
    setEditingEventId(event.id);
    setIsEditing(true);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleOpenGuestModal = async (eventId: string) => {
    setSelectedEventId(eventId);
    
    // Fetch current event guests
    const { data, error } = await supabase
      .from('event_guests')
      .select('guest_id')
      .eq('event_id', eventId);
    
    if (!error && data) {
      const currentGuestIds = data.map(eg => eg.guest_id);
      setSelectedGuests(currentGuestIds);
    }
    
    setIsGuestModalOpen(true);
  };

  const handleAddGuests = async () => {
    if (!selectedEventId) return;

    try {
      // Get current event guests
      const { data: currentData } = await supabase
        .from('event_guests')
        .select('guest_id')
        .eq('event_id', selectedEventId);

      const currentGuestIds = currentData?.map(eg => eg.guest_id) || [];

      // Find guests to add
      const guestsToAdd = selectedGuests.filter(gid => !currentGuestIds.includes(gid));
      
      // Find guests to remove
      const guestsToRemove = currentGuestIds.filter(gid => !selectedGuests.includes(gid));

      // Add new guests
      if (guestsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('event_guests')
          .insert(guestsToAdd.map(gid => ({
            event_id: selectedEventId,
            guest_id: gid
          })));

        if (addError) throw addError;
      }

      // Remove guests
      if (guestsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('event_guests')
          .delete()
          .eq('event_id', selectedEventId)
          .in('guest_id', guestsToRemove);

        if (removeError) throw removeError;
      }

      setIsGuestModalOpen(false);
      setSelectedEventId(null);
      setSelectedGuests([]);
      
      // Refresh counts for all events
      await fetchEventGuestCounts(events.map(e => e.id));
    } catch (error) {
      console.error('Error updating event guests:', error);
      alert('Failed to update guests');
    }
  };

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev =>
      prev.includes(guestId)
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const getEventGuestCount = (eventId: string) => {
    const count = eventGuestCounts[eventId];
    if (!count) return '0 people';
    return `${count.people} ${count.people === 1 ? 'person' : 'people'}`;
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
    <main className="min-h-screen py-8 px-6" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-[1800px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Secondary Events</h1>
            <p className="text-gray-600 mt-1">Manage dinners, lunches, and other events</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Event
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {event.description && (
                <p className="text-gray-600 text-sm mb-3">{event.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(event.event_date).toLocaleDateString()}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-2xl font-bold text-gray-900">
                    {eventGuestCounts[event.id]?.people || 0}
                  </span>
                  <span className="text-sm text-gray-500">
                    {(eventGuestCounts[event.id]?.people || 0) === 1 ? 'person' : 'people'}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenGuestModal(event.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Manage Guests
                </button>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No events yet. Create your first event!</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
                <input
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? 'Update Event' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEventModalOpen(false);
                    setIsEditing(false);
                    setEditingEventId(null);
                    setNewEvent({ name: '', description: '', event_date: '', location: '' });
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

      {/* Guest Selection Modal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Event Guests</h2>
            
            <div className="mb-4 text-sm text-gray-600">
              Select guests to add to this event. Selected guests are confirmed attendees.
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {allGuests.map((guest) => (
                <label
                  key={guest.id}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => toggleGuestSelection(guest.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="flex-1 text-gray-900">{guest.name}</span>
                  <span className="text-sm text-gray-500">
                    {guest.total_guests} {guest.total_guests === 1 ? 'person' : 'people'}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleAddGuests}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsGuestModalOpen(false);
                  setSelectedEventId(null);
                  setSelectedGuests([]);
                }}
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
