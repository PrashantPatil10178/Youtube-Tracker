import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  /** Provider-neutral shape — was previously tied to Clerk's user object. */
  user: {
    imageUrl?: string | null;
    fullName?: string | null;
    email?: string | null;
  } | null;
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  const initials = (user?.fullName || user?.email || '').slice(0, 2).toUpperCase();

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
        <AvatarFallback className='rounded-lg'>{initials || 'CN'}</AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{user?.fullName || ''}</span>
          <span className='truncate text-xs'>{user?.email || ''}</span>
        </div>
      )}
    </div>
  );
}
