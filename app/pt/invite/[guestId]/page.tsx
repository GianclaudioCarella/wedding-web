import InviteContent from '@/components/invite/InviteContent';

export default async function InvitePagePT({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  return <InviteContent guestId={guestId} locale="pt" />;
}
