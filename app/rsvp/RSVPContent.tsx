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
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    attending: '',
    notes: '',
  });
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    address: false,
    attending: false,
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
          attending: data.attending || '',
        }));
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
      attending: !formData.attending,
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
            attending: formData.attending,
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
            attending: formData.attending,
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
      <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#f5f7fd' }}>
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-900">Loading...</p>
        </div>
      </main>
    );
  }

  if (guestNotFound) {
    return (
      <main className="flex h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: '#f5f7fd' }}>
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
    <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-md mx-auto">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <Image
              src="/save-the-date.png"
              alt="Save the Date"
              width={250}
              height={250}
              className="mx-auto rounded-lg"
              priority
            />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">Let us know if you can celebrate with us</h1>
            <p className="text-base md:text-md text-gray-700">Please fill in your information below</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mt-4">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                Full Name *
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
                <p className="mt-1 text-sm text-red-600">Name is required</p>
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
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                Address *
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
                placeholder="123 Main St, City, State, ZIP"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">Address is required</p>
              )}
            </div>

            <div>
              <label htmlFor="attending" className="block text-sm font-medium text-gray-900">
                Will you be attending? *
              </label>
              <select
                id="attending"
                name="attending"
                required
                value={formData.attending}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-gray-500 text-gray-900 ${
                  errors.attending ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                }`}
              >
                <option value="" disabled>Select an option</option>
                <option value="yes">Yes, I'll be there!</option>
                <option value="no">Sorry, I can't make it</option>
                <option value="perhaps">Perhaps</option>
              </select>
              {errors.attending && (
                <p className="mt-1 text-sm text-red-600">Please select an option</p>
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

            {submitStatus.type !== 'success' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
