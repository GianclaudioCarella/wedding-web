'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';

export default function RSVPContent() {
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

      // Redirect to confirmation page
      const confirmationUrl = guestId ? `/rsvp/confirmation?guest=${guestId}` : '/rsvp/confirmation';
      router.push(confirmationUrl);
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      setSubmitStatus({
        type: 'error',
        message: 'There was an error submitting your RSVP. Please try again or contact us directly.',
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
          <p className="text-gray-900">Loading...</p>
        </div>
      </main>
    );
  }

  if (guestNotFound) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900" style={{ letterSpacing: '0.05em' }}>
            Not Found
          </h1>
          <p className="text-lg text-gray-700">
            We couldn't find your invitation. Please check your invitation link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center space-y-2 mb-6">
            <Link href={guestId ? `/?guest=${guestId}` : "/"} className="inline-block w-[98%] mx-auto">
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
              <h1 className="text-base md:text-md text-gray-900 font-semibold">Let us know if you can make it</h1>
              <p className="text-base text-sm text-gray-700">Any answer helps us plan – yes, no, or maybe.</p>
            </div>
            {/* First: Attending Question with Segmented Buttons */}
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
                  Yes
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
                  Maybe
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
                  No
                </button>
              </div>
            </div>

            {/* Conditional Fields: Show only if "Yes" */}
            {attending === 'yes' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                    Your Name *
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
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">How you’d like us to address you. It's required.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                    Email Address *
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
                    placeholder="Your email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                    Postal address *
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
                    placeholder="So we can send you a formal invitation."
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">Address is required</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                    Notes (Optional)
                    <span className="text-gray-500 text-xs ml-2">{formData.notes.length}/500</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    maxLength={500}
                    value={formData.notes}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                    placeholder="Any special requests or comments..."
                  />
                </div>
              </>
            )}

            {/* Notes field for "No" or "Maybe" response */}
            {(attending === 'no' || attending === 'perhaps') && (
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                  Notes (Optional)
                  <span className="text-gray-500 text-xs ml-2">{formData.notes.length}/500</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                  placeholder="Let us know if there's anything you'd like to share..."
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
                {isSubmitting ? 'Sending...' : 'Send response'}
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
