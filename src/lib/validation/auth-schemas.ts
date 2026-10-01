import * as z from 'zod'

export const SignupSchema = z.object({
  email: z.email({ error: 'Adresse email invalide.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Au moins 8 caractères.' })
    .regex(/[a-zA-Z]/, { error: 'Au moins une lettre.' })
    .regex(/[0-9]/, { error: 'Au moins un chiffre.' }),
})

export const LoginSchema = z.object({
  email: z.email({ error: 'Adresse email invalide.' }).trim(),
  password: z.string().min(1, { error: 'Mot de passe requis.' }),
})
