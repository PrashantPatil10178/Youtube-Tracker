'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { authClient } from '@/lib/auth-client';

import { profileDetailsSchema, type ProfileDetailsFormValues } from '../schemas/profile';

export function ProfileDetailsForm({ name, userId }: { name: string; userId: string }) {
  const [copied, setCopied] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: ProfileDetailsFormValues) => authClient.updateUser({ name: values.name }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to update profile');
        return;
      }
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile')
  });

  const form = useAppForm({
    defaultValues: { name } as ProfileDetailsFormValues,
    validators: { onSubmit: profileDetailsSchema },
    onSubmit: ({ value }) => updateMutation.mutate(value)
  });

  const { FormTextField } = useFormFields<ProfileDetailsFormValues>();

  const copyId = async () => {
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
        <CardDescription>Update the name shown across the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form.AppForm>
          <form.Form className='gap-4 p-0 md:p-0'>
            <FormTextField
              name='name'
              label='Name'
              required
              validators={{ onBlur: profileDetailsSchema.shape.name }}
            />

            <div className='flex flex-col gap-1.5'>
              <span className='text-muted-foreground text-xs'>User ID</span>
              <div className='flex items-center gap-2'>
                <code className='bg-muted text-muted-foreground flex-1 truncate rounded px-2 py-1.5 text-xs'>
                  {userId}
                </code>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-8 shrink-0'
                  onClick={copyId}
                  aria-label='Copy user ID'
                >
                  {copied ? (
                    <Icons.check className='size-3.5' />
                  ) : (
                    <Icons.copy className='size-3.5' />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <form.SubmitButton>Save changes</form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </CardContent>
    </Card>
  );
}
