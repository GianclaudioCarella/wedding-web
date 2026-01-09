'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminInspirationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [boardUrl, setBoardUrl] = useState('https://www.pinterest.com/YOUR_USERNAME/YOUR_BOARD_NAME/');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Theme helper functions
  const bg = (dark: string, light: string) => isDarkMode ? dark : light;
  const text = (dark: string, light: string) => isDarkMode ? dark : light;

  useEffect(() => {
    checkAuth();
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('adminTheme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('adminTheme', newTheme ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isAuthenticated && boardUrl && !boardUrl.includes('YOUR_USERNAME')) {
      // Remove existing Pinterest widgets
      const existingWidgets = document.querySelectorAll('[data-pin-do="embedBoard"]');
      existingWidgets.forEach(widget => {
        const parent = widget.parentElement;
        if (parent && parent !== widget) {
          // Remove all children except the original anchor tag
          while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
          }
          parent.appendChild(widget);
        }
      });

      // Remove existing script if any
      const existingScript = document.querySelector('script[src="https://assets.pinterest.com/js/pinit.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Load Pinterest embed script
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = 'https://assets.pinterest.com/js/pinit.js';
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isAuthenticated, boardUrl]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin/login');
      return;
    }

    setUserId(user.id);
    setIsAuthenticated(true);
    await loadBoardUrl(user.id);
    setIsLoading(false);
  };

  const loadBoardUrl = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('pinterest_board_url')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading board URL:', error);
        return;
      }

      if (data?.pinterest_board_url) {
        console.log('Loaded Pinterest URL:', data.pinterest_board_url);
        setBoardUrl(data.pinterest_board_url);
      } else {
        console.log('No Pinterest URL found in database');
      }
    } catch (error) {
      console.error('Error loading board URL:', error);
    }
  };

  const handleSaveUrl = async () => {
    if (!userId || !editUrl.trim()) return;

    setIsSaving(true);
    try {
      // Check if user_settings exists
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingSettings) {
        // Update existing
        const { error } = await supabase
          .from('user_settings')
          .update({ pinterest_board_url: editUrl.trim() })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: userId, pinterest_board_url: editUrl.trim() });

        if (error) throw error;
      }

      setBoardUrl(editUrl.trim());
      setIsEditMode(false);
      setEditUrl('');
      
      // Force reload of the page to refresh Pinterest widget
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error saving board URL:', error);
      alert('Error saving Pinterest board URL. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    setEditUrl(boardUrl);
    setIsEditMode(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${bg('bg-gray-900', 'bg-gray-50')}`}>
        <p className={text('text-gray-100', 'text-gray-900')}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${bg('bg-gray-900', 'bg-gradient-to-b from-rose-50 to-white')}`}>
      {/* Header */}
      <div className={`${bg('bg-gray-800 border-gray-700', 'bg-white border-rose-100')} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className={`${
                isDarkMode 
                  ? 'text-rose-400 hover:text-rose-300' 
                  : 'text-rose-600 hover:text-rose-700'
              } transition-colors flex items-center gap-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditClick}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border rounded-lg transition-colors ${
                  isDarkMode
                    ? 'border-rose-600 text-rose-400 hover:bg-rose-900/30'
                    : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                }`}
                title="Edit board URL"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit URL</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-2 border-yellow-500 text-yellow-500 rounded-lg hover:bg-yellow-500/10 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
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
                <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${text('text-gray-100', 'text-gray-900')}`}>
            Wedding Inspiration Board
          </h1>
          <p className={`text-lg max-w-2xl mx-auto ${text('text-gray-400', 'text-gray-600')}`}>
            Our Pinterest board with all the ideas and inspiration for the wedding
          </p>
        </div>

        {/* Edit URL Modal */}
        {isEditMode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${bg('bg-gray-800', 'bg-white')} rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8`}>
              <h2 className={`text-2xl font-bold mb-4 ${text('text-gray-100', 'text-gray-900')}`}>
                Configure Pinterest Board URL
              </h2>
              <p className={`mb-6 ${text('text-gray-400', 'text-gray-600')}`}>
                Paste the full URL of your Pinterest board (e.g., https://www.pinterest.com/username/board-name/)
              </p>
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://www.pinterest.com/username/board-name/"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-6 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setEditUrl('');
                  }}
                  disabled={isSaving}
                  className={`px-6 py-2 border rounded-lg transition-colors disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUrl}
                  disabled={isSaving || !editUrl.trim()}
                  className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pinterest Board Embed */}
        <div className={`${bg('bg-gray-800', 'bg-white')} rounded-2xl shadow-lg p-6 md:p-8`}>
          {boardUrl.includes('YOUR_USERNAME') ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${text('text-gray-600', 'text-gray-400')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className={`text-xl font-semibold mb-2 ${text('text-gray-100', 'text-gray-900')}`}>
                No Pinterest Board Configured
              </h3>
              <p className={`mb-6 ${text('text-gray-400', 'text-gray-600')}`}>
                Click the edit button above to configure your Pinterest board URL
              </p>
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Configure Board URL
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <a 
                  key={boardUrl}
                  data-pin-do="embedBoard" 
                  data-pin-board-width="900" 
                  data-pin-scale-height="600" 
                  data-pin-scale-width="115" 
                  href={boardUrl}
                ></a>
              </div>
              
              <div className="mt-8 text-center">
                <p className={`mb-4 ${text('text-gray-400', 'text-gray-600')}`}>
                  View and manage the full board on Pinterest
                </p>
                <a
                  href={boardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0a12 12 0 0 0-4.37 23.16c-.1-.91-.19-2.32 0-3.32l1.43-6.05s-.37-.73-.37-1.82c0-1.7 1-3 2.23-3 1.05 0 1.56.79 1.56 1.73 0 1.06-.67 2.64-1 4.1-.29 1.21.61 2.2 1.8 2.2 2.16 0 3.83-2.28 3.83-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.9 2.78.1.12.11.22.08.35l-.33 1.36c-.05.22-.18.27-.42.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.36 8.05-7.36 4.23 0 7.51 3 7.51 7.03 0 4.19-2.64 7.56-6.31 7.56-1.23 0-2.39-.64-2.79-1.4l-.76 2.9c-.28 1.07-1.03 2.41-1.53 3.23A12 12 0 1 0 12 0z"/>
                  </svg>
                  Open in Pinterest
                </a>
              </div>
            </>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className={`text-sm ${text('text-gray-500', 'text-gray-500')}`}>
            💡 Tip: Make sure your Pinterest board is set to public so the embed works correctly
          </p>
        </div>
      </div>
    </main>
  );
}
