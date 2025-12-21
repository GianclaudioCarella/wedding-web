'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function RSVPPagePT() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    attending: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.from('rsvp_responses').insert([
        {
          name: formData.name,
          email: formData.email,
          address: formData.address,
          attending: formData.attending,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setSubmitStatus({
        type: 'success',
        message: 'Obrigado pela sua confirmação! Mais detalhes em breve.',
      });
      setFormData({ name: '', email: '', address: '', attending: '' });
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Houve um erro ao enviar sua confirmação. Por favor tente novamente ou entre em contato conosco diretamente.',
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
  };

  return (
    <main className="min-h-screen pt-[30px] pb-[30px] px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#f5f7fd' }}>
      <div className="max-w-md mx-auto">
        <div className="text-center space-y-2">
          <Link href="/pt" className="inline-block">
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
            <h1 className="text-base md:text-md text-gray-900 font-semibold tracking-wide transform uppercase">Nos avise se você pode celebrar conosco</h1>
            <p className="text-base md:text-md text-gray-700">Por favor preencha suas informações abaixo</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                Nome Completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Endereço de Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                placeholder="joao@exemplo.com"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                Endereço *
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                required
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                placeholder="Rua Principal 123, Cidade, Estado, CEP"
              />
            </div>

            <div>
              <label htmlFor="attending" className="block text-sm font-medium text-gray-900">
                Você vai comparecer? *
              </label>
              <select
                id="attending"
                name="attending"
                required
                value={formData.attending}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-900"
              >
                <option value="" disabled>Selecione uma opção</option>
                <option value="yes">Sim, estarei lá!</option>
                <option value="no">Desculpe, não posso comparecer</option>
                <option value="perhaps">Talvez</option>
              </select>
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
                {isSubmitting ? 'Enviando...' : 'Enviar Confirmação'}
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
