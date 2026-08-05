import * as z from 'zod';

export const profileDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long')
});

export type ProfileDetailsFormValues = z.infer<typeof profileDetailsSchema>;

// Mirrors `minPasswordLength: 8` in src/lib/auth.ts — keep in sync.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
