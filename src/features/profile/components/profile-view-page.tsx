import { requireSession } from '@/lib/session';

import { ProfileView } from './profile-view';

export default async function ProfileViewPage() {
  const { user } = await requireSession();

  return (
    <ProfileView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        createdAt: new Date(user.createdAt).toISOString()
      }}
    />
  );
}
