import * as z from 'zod'

export const SignupSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'At least 8 characters.' })
    .regex(/[a-zA-Z]/, { error: 'At least one letter.' })
    .regex(/[0-9]/, { error: 'At least one digit.' }),
})

export const LoginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Enter your password.' }),
})
