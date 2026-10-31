'use client';

import { useEffect, useState } from 'react';
import type { AlbumPhoto } from '@/lib/album/photos';

type Filter = 'all' | 'visible' | 'hidden';
type MediaFilter = 'all' | 'image' | 'video';

export default function AdminAlbumPage() {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [uploader, setUploader] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const res = await fetch('/api/admin/album');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPhotos(data.photos);
    } catch {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const setHidden = async (photo: AlbumPhoto, hidden: boolean) => {
    setBusyId(photo.id);
    const res = await fetch(`/api/admin/album/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden }),
    });
    if (res.ok) setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, hidden } : p)));
    else setError('Failed to update photo');
    setBusyId(null);
  };

  const deletePhoto = async (photo: AlbumPhoto) => {
    if (!window.confirm('Delete this photo permanently? It will be removed from S3 too.')) return;
    setBusyId(photo.id);
    const res = await fetch(`/api/admin/album/${photo.id}`, { method: 'DELETE' });
    if (res.ok) setPhotos(prev => prev.filter(p => p.id !== photo.id));
    else setError('Failed to delete photo');
    setBusyId(null);
  };

  const uploaders = Array.from(new Set(photos.map(p => p.uploaderName ?? ''))).sort();
  const visible = photos.filter(p =>
    (filter === 'all' || p.hidden === (filter === 'hidden')) &&
    (!uploader || (p.uploaderName ?? '') === uploader) &&
    (mediaFilter === 'all' || p.mediaType === mediaFilter));
  const hiddenCount = photos.filter(p => p.hidden).length;
  const videoCount = photos.filter(p => p.mediaType === 'video').length;

  return (
    <div className="p-4 sm:p-8 mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Album</h1>
          <p className="text-sm text-gray-500">
            {photos.length - videoCount} photos · {videoCount} videos · {hiddenCount} hidden · <a href="/album" target="_blank" className="underline">open album</a>
          </p>
        </div>
        <div className="flex gap-2">
          <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value as MediaFilter)}
            className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
            <option value="all">Photos &amp; videos</option>
            <option value="image">Photos</option>
            <option value="video">Videos</option>
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value as Filter)}
            className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select value={uploader} onChange={e => setUploader(e.target.value)}
            className="max-w-48 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
            <option value="">Everyone</option>
            {uploaders.map(name => <option key={name} value={name}>{name || '(no name)'}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-gray-500">No photos.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {visible.map(photo => (
          <div key={photo.id} className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${photo.hidden ? 'opacity-50' : ''}`}>
            <a href={photo.videoUrl ?? photo.displayUrl} target="_blank" rel="noopener noreferrer" className="relative block">
              <img src={photo.thumbUrl} alt="" loading="lazy" className="w-full aspect-square object-cover" />
              {photo.mediaType === 'video' && (
                <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">▶ Video</span>
              )}
            </a>
            <div className="p-2 space-y-2">
              <p className="text-xs text-gray-500 truncate">
                {photo.uploaderName || '(no name)'} · {new Date(photo.createdAt).toLocaleDateString()}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setHidden(photo, !photo.hidden)} disabled={busyId === photo.id}
                  className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {photo.hidden ? 'Show' : 'Hide'}
                </button>
                <button onClick={() => deletePhoto(photo)} disabled={busyId === photo.id}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
