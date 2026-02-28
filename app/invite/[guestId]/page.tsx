import InviteContent from '@/components/invite/InviteContent';

export default async function InvitePage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  return <InviteContent guestId={guestId} locale="en" />;
}
