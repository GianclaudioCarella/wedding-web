'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Locale } from '@/lib/i18n/locales';
import { getTranslation } from '@/lib/i18n/translations';

interface RSVPFormProps {
  locale: Locale;
}

export default function RSVPForm({ locale }: RSVPFormProps) {
  const t = getTranslation(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const guestId = searchParams.get('guest');
  
  const [attending, setAttending] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    address: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestNotFound, setGuestNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (!guestId) {
      setGuestNotFound(true);
      setIsLoading(false);
    } else {
      fetchGuestData(guestId);
    }
  }, [guestId]);

  const fetchGuestData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('name, email, address, attending')
        .eq('id', id)
        .single();

      if (error || !data) {
        setGuestNotFound(true);
      } else {
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          email: data.email || '',
          address: data.address || '',
        }));
        setAttending(data.attending || '');
      }
    } catch (error) {
      console.error('Error fetching guest:', error);
      setGuestNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Validate required fields
    const newErrors = {
      name: !formData.name.trim(),
      email: !formData.email.trim() || !emailRegex.test(formData.email),
      address: !formData.address.trim(),
    };
    
    setErrors(newErrors);
    
    // Check if there are any errors
    if (Object.values(newErrors).some(error => error)) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      if (guestId) {
        // Update existing guest
        const { error } = await supabase
          .from('guests')
          .update({
            name: formData.name,
            email: formData.email,
            address: formData.address,
            attending: attending,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', guestId);

        if (error) throw error;
      } else {
        // Insert new guest
        const { error } = await supabase.from('guests').insert([
          {
            name: formData.name,
            email: formData.email,
            address: formData.address,
            attending: attending,
            notes: formData.notes,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
      }

      // Redirect to confirmation page with locale prefix
      const baseUrl = locale === 'en' ? '' : `/${locale}`;
      const confirmationUrl = guestId 
        ? `${baseUrl}/rsvp/confirmation?guest=${guestId}` 
        : `${baseUrl}/rsvp/confirmation`;
      router.push(confirmationUrl);
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      setSubmitStatus({
        type: 'error',
        message: t.rsvp.submit.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-900">{t.common.loading}</p>
        </div>
      </main>
    );
  }

  if (guestNotFound) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900" style={{ letterSpacing: '0.05em' }}>
            {t.rsvp.notFound.title}
          </h1>
          <p className="text-lg text-gray-700">
            {t.rsvp.notFound.message}
          </p>
        </div>
      </main>
    );
  }

  const homeUrl = locale === 'en' 
    ? (guestId ? `/?guest=${guestId}` : "/")
    : (guestId ? `/${locale}?guest=${guestId}` : `/${locale}`);

  return (
    <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center space-y-2 mb-6">
            <Link href={homeUrl} className="inline-block w-[98%] mx-auto">
              <Image
                src="/savethedate.png"
                alt="Save the Date"
                width={300}
                height={300}
                className="rounded-lg w-full h-auto"
                priority
              />
            </Link>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="text-center mb-4">
              <h1 className="text-base md:text-md text-gray-900 font-semibold">{t.rsvp.title}</h1>
              <p className="text-base text-sm text-gray-700">{t.rsvp.subtitle}</p>
            </div>

            {/* Attending Question with Segmented Buttons */}
            <div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAttending('yes')}
                  className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                    attending === 'yes'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {t.rsvp.attending.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setAttending('perhaps')}
                  className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                    attending === 'perhaps'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {t.rsvp.attending.maybe}
                </button>
                <button
                  type="button"
                  onClick={() => setAttending('no')}
                  className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                    attending === 'no'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {t.rsvp.attending.no}
                </button>
              </div>
            </div>

            {/* Conditional Fields: Show only if "Yes" */}
            {attending === 'yes' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                    {t.rsvp.form.name.label} {t.rsvp.form.name.required && '*'}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-gray-500 text-gray-900 ${
                      errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                    }`}
                    placeholder={t.rsvp.form.name.placeholder}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{t.rsvp.form.name.error}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                    {t.rsvp.form.email.label} {t.rsvp.form.email.required && '*'}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-gray-500 text-gray-900 ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                    }`}
                    placeholder={t.rsvp.form.email.placeholder}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{t.rsvp.form.email.error}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                    {t.rsvp.form.address.label} {t.rsvp.form.address.required && '*'}
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-gray-500 text-gray-900 ${
                      errors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                    }`}
                    placeholder={t.rsvp.form.address.placeholder}
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{t.rsvp.form.address.error}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                    {t.rsvp.form.notes.label}
                    <span className="text-gray-500 text-xs ml-2">{t.rsvp.form.notes.counter(formData.notes.length)}</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    maxLength={500}
                    value={formData.notes}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                    placeholder={t.rsvp.form.notes.placeholder.yes}
                  />
                </div>
              </>
            )}

            {/* Notes field for "No" or "Maybe" response */}
            {(attending === 'no' || attending === 'perhaps') && (
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                  {t.rsvp.form.notes.label}
                  <span className="text-gray-500 text-xs ml-2">{t.rsvp.form.notes.counter(formData.notes.length)}</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                  placeholder={t.rsvp.form.notes.placeholder.default}
                />
              </div>
            )}

            {submitStatus.type && (
              <div
                className={`p-4 rounded-md ${
                  submitStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {submitStatus.type !== 'success' && attending && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? t.rsvp.submit.sending : t.rsvp.submit.button}
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
