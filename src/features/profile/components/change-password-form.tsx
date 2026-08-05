'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrors, useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { authClient } from '@/lib/auth-client';

import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/profile';

const EMPTY_VALUES: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export function ChangePasswordForm() {
  const changeMutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true
      })
  });

  const form = useAppForm({
    defaultValues: EMPTY_VALUES,
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      const result = await changeMutation.mutateAsync(value);
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to change password');
        return;
      }
      toast.success('Password changed — other devices have been signed out');
      form.reset();
    }
  });

  const { FormTextField } = useFormFields<ChangePasswordFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Choose a new password. Changing it signs you out of every other device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form.AppForm>
          <form.Form className='gap-4 p-0 md:p-0'>
            <FormErrors />

            <FormTextField
              name='currentPassword'
              label='Current password'
              type='password'
              autoComplete='current-password'
              required
              validators={{ onBlur: z.string().min(1, 'Current password is required') }}
            />
            <FormTextField
              name='newPassword'
              label='New password'
              type='password'
              autoComplete='new-password'
              required
              validators={{ onBlur: z.string().min(8, 'Must be at least 8 characters') }}
            />
            <FormTextField
              name='confirmPassword'
              label='Confirm new password'
              type='password'
              autoComplete='new-password'
              required
              validators={{ onBlur: z.string().min(1, 'Please confirm your new password') }}
            />

            <div>
              <form.SubmitButton>Update password</form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </CardContent>
    </Card>
  );
}
