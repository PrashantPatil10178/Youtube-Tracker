'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';

import { ChangePasswordForm } from './change-password-form';
import { ProfileDetailsForm } from './profile-details-form';

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
};

/**
 * `useSession` starts as the source of truth so a name/avatar change made
 * below reflects here (and in the sidebar) immediately — falling back to the
 * server-fetched user only until the client store hydrates.
 */
export function ProfileView({ user: initialUser }: { user: ProfileUser }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const user: ProfileUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        createdAt: initialUser.createdAt
      }
    : initialUser;

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/auth/sign-in');
    router.refresh();
  };

  return (
    <div className='flex max-w-2xl flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-wrap items-center gap-4'>
          <Avatar className='size-16'>
            <AvatarImage src={user.image ?? ''} alt={user.name} />
            <AvatarFallback className='text-lg'>{initials || 'U'}</AvatarFallback>
          </Avatar>

          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='truncate text-lg font-semibold'>{user.name || 'Unnamed'}</span>
              {user.emailVerified ? (
                <Badge variant='secondary' className='gap-1 text-emerald-600 dark:text-emerald-400'>
                  <Icons.badgeCheck className='size-3.5' />
                  Verified
                </Badge>
              ) : (
                <Badge variant='outline' className='text-muted-foreground'>
                  Unverified
                </Badge>
              )}
            </div>
            <span className='text-muted-foreground truncate text-sm'>{user.email}</span>
            <span className='text-muted-foreground flex items-center gap-1 text-xs'>
              <Icons.calendar className='size-3.5' />
              Member since {format(new Date(user.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>

          <Button type='button' variant='outline' size='sm' onClick={handleSignOut}>
            <Icons.logout className='size-4' />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ProfileDetailsForm name={user.name} userId={user.id} />
      <ChangePasswordForm />
    </div>
  );
}
