import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/session';

export default async function ProfileViewPage() {
  const { user } = await requireSession();

  const fields = [
    { label: 'Name', value: user.name || '—' },
    { label: 'Email', value: user.email },
    { label: 'Email verified', value: user.emailVerified ? 'Yes' : 'No' },
    { label: 'User ID', value: user.id }
  ];

  return (
    <Card className='max-w-xl'>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your ChannelIQ account details.</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {fields.map((field) => (
          <div key={field.label} className='flex flex-col gap-1'>
            <span className='text-muted-foreground text-xs'>{field.label}</span>
            <span className='text-sm font-medium break-all'>{field.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
