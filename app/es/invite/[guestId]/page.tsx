import InviteContent from '@/components/invite/InviteContent';

export default async function InvitePageES({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  return <InviteContent guestId={guestId} locale="es" />;
}
