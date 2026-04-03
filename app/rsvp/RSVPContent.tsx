'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const TEXT  = 'var(--color-text)'
const MUTED = 'var(--color-muted)'
const SERIF = 'var(--font-serif)'
const SANS  = 'var(--font-sans)'

const inputStyle = {
  display: 'block',
  width: '100%',
  fontFamily: SANS,
  fontSize: 'var(--text-base)',
  color: TEXT,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '12px 16px',
  outline: 'none',
  boxSizing: 'border-box' as const,
  marginTop: 8,
}

const labelStyle = {
  fontFamily: SANS,
  fontSize: 'var(--text-sm)',
  color: TEXT,
  display: 'block',
}

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

    if (attending === 'yes') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const newErrors = {
        name: !formData.name.trim(),
        email: !formData.email.trim() || !emailRegex.test(formData.email),
        address: !formData.address.trim(),
      };
      setErrors(newErrors);
      if (Object.values(newErrors).some(error => error)) return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      if (guestId) {
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
        const { error } = await supabase.from('guests').insert([{
          name: formData.name,
          email: formData.email,
          address: formData.address,
          attending: attending,
          notes: formData.notes,
          created_at: new Date().toISOString(),
        }]);
        if (error) throw error;
      }

      if (attending === 'yes') {
        try {
          await fetch('/api/send-rsvp-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guestName: formData.name,
              guestEmail: formData.email,
              attending: attending,
              eventDate: 'Saturday, October 3, 2026',
              eventLocation: 'La Garriga de Castelladral, Barcelona',
              locale: 'en',
            }),
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }

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
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED }}>Loading…</p>
    </div>
  );

  if (guestNotFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, color: TEXT, marginBottom: 8, fontWeight: 400 }}>Invitation not found</h1>
        <p style={{ fontFamily: SANS, fontSize: 'var(--text-base)', color: MUTED }}>Please check your invitation link.</p>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 'var(--space-section)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Back link */}
        <Link
          href={guestId ? `/invite?guest=${guestId}` : '/invite'}
          style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, textDecoration: 'none', display: 'inline-block', marginBottom: 48 }}
        >
          ← Back to invitation
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', color: MUTED, margin: 0, marginBottom: 12 }}>
            RSVP
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 42px)', color: TEXT, margin: 0, fontWeight: 400, lineHeight: 1.2 }}>
            Let us know if you&rsquo;ll be joining us.
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Attending toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['yes', 'perhaps', 'no'] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAttending(val)}
                style={{
                  flex: 1,
                  fontFamily: SANS,
                  fontSize: 'var(--text-sm)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background var(--transition), color var(--transition)',
                  background: attending === val ? TEXT : 'var(--color-surface)',
                  color: attending === val ? '#ffffff' : TEXT,
                }}
              >
                {val === 'yes' ? 'Yes' : val === 'perhaps' ? 'Maybe' : 'No'}
              </button>
            ))}
          </div>

          {/* Fields for Yes */}
          {attending === 'yes' && (
            <>
              <div>
                <label htmlFor="name" style={labelStyle}>Your name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  style={{ ...inputStyle, borderColor: errors.name ? '#cc0000' : 'var(--color-border)' }}
                />
                {errors.name && <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: '#cc0000', margin: '6px 0 0' }}>Name is required.</p>}
              </div>

              <div>
                <label htmlFor="email" style={labelStyle}>Email address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  style={{ ...inputStyle, borderColor: errors.email ? '#cc0000' : 'var(--color-border)' }}
                />
                {errors.email && <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: '#cc0000', margin: '6px 0 0' }}>Please enter a valid email address.</p>}
              </div>

              <div>
                <label htmlFor="address" style={labelStyle}>Postal address *</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="So we can send you a formal invitation."
                  style={{ ...inputStyle, resize: 'vertical' as const, borderColor: errors.address ? '#cc0000' : 'var(--color-border)' }}
                />
                {errors.address && <p style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: '#cc0000', margin: '6px 0 0' }}>Address is required.</p>}
              </div>

              <div>
                <label htmlFor="notes" style={labelStyle}>
                  Notes <span style={{ color: MUTED }}>— optional</span>
                  <span style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: MUTED, marginLeft: 8 }}>{formData.notes.length}/500</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Dietary requirements, questions, anything at all…"
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
            </>
          )}

          {/* Notes for No / Maybe */}
          {(attending === 'no' || attending === 'perhaps') && (
            <div>
              <label htmlFor="notes" style={labelStyle}>
                Notes <span style={{ color: MUTED }}>— optional</span>
                <span style={{ fontFamily: SANS, fontSize: 'var(--text-xs)', color: MUTED, marginLeft: 8 }}>{formData.notes.length}/500</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={500}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Let us know if there's anything you'd like to share…"
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>
          )}

          {/* Error banner */}
          {submitStatus.type === 'error' && (
            <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: '#cc0000', margin: 0 }}>
              {submitStatus.message}
            </p>
          )}

          {/* Submit */}
          {attending && (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                fontFamily: SANS,
                fontSize: 'var(--text-sm)',
                color: '#ffffff',
                background: TEXT,
                border: 'none',
                padding: '14px 36px',
                borderRadius: 'var(--radius-pill)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase' as const,
                fontWeight: 500,
                transition: 'background var(--transition)',
                alignSelf: 'flex-start',
              }}
            >
              {isSubmitting ? 'Sending…' : 'Send response'}
            </button>
          )}

        </form>

        {/* Contact */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: MUTED, margin: 0, marginBottom: 4 }}>Any questions?</p>
          <a href="mailto:hello@giancat.com" style={{ fontFamily: SANS, fontSize: 'var(--text-sm)', color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            hello@giancat.com
          </a>
        </div>

      </div>
    </main>
  );
}
