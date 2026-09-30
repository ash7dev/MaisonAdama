'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from './require-admin';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password-policy';

export type LoginState = {
  error?: string;
  /** Réaffiché après un échec, pour ne pas le ressaisir. */
  email?: string;
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

/** N'autorise qu'une redirection interne à l'admin (pas de redirection ouverte). */
function safeNextPath(next?: string): string {
  if (!next || !/^\/admin(\/|$|\?)/.test(next) || next.startsWith('/admin/login')) return '/admin';
  return next;
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  const typedEmail = String(formData.get('email') ?? '');
  if (!parsed.success) {
    return { error: 'Saisissez une adresse e-mail valide et votre mot de passe.', email: typedEmail };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.status === 429) {
      return { error: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.', email };
    }
    // Message volontairement identique que le compte existe ou non.
    return { error: 'E-mail ou mot de passe incorrect.', email };
  }

  const profile = await prisma.adminProfile.findUnique({
    where: { id: data.user.id },
    select: { isActive: true },
  });
  if (!profile?.isActive) {
    await supabase.auth.signOut();
    return { error: 'Ce compte n’a pas accès à l’administration.', email };
  }

  redirect(safeNextPath(next));
}

/** Déconnexion de cet appareil uniquement (les autres sessions restent ouvertes). */
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

/** Téléphone perdu, ordinateur partagé : ferme toutes les sessions, partout. */
export async function logoutEverywhereAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/admin/login');
}

// -----------------------------------------------------------------------------
//  Changement de mot de passe
// -----------------------------------------------------------------------------

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type PasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<PasswordField, string>>;
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      .max(MAX_PASSWORD_LENGTH, `${MAX_PASSWORD_LENGTH} caractères au maximum.`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mots de passe ne correspondent pas.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choisissez un mot de passe différent de l’actuel.',
  });

export async function changePasswordAction(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await requireAdmin();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword') ?? '',
    newPassword: formData.get('newPassword') ?? '',
    confirmPassword: formData.get('confirmPassword') ?? '',
  });
  if (!parsed.success) {
    const fieldErrors: PasswordState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as PasswordField;
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;
  if (newPassword.toLowerCase().includes(admin.email.split('@')[0].toLowerCase())) {
    return { fieldErrors: { newPassword: 'Le mot de passe ne doit pas contenir votre adresse e-mail.' } };
  }

  const supabase = await createSupabaseServerClient();

  // Revérifie le mot de passe actuel : une session laissée ouverte ne suffit pas
  // pour prendre le contrôle du compte. Ouvre au passage une session récente,
  // exigée par Supabase pour changer de mot de passe.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: admin.email,
    password: currentPassword,
  });
  if (authError) {
    if (authError.status === 429) {
      return { error: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.' };
    }
    return { fieldErrors: { currentPassword: 'Mot de passe actuel incorrect.' } };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === 'same_password') {
      return { fieldErrors: { newPassword: 'Choisissez un mot de passe différent de l’actuel.' } };
    }
    if (error.code === 'weak_password') {
      return { fieldErrors: { newPassword: 'Mot de passe jugé trop faible : allongez-le ou variez les caractères.' } };
    }
    return { error: 'Le mot de passe n’a pas pu être modifié. Réessayez dans un instant.' };
  }

  // Les autres appareils doivent se reconnecter avec le nouveau mot de passe.
  await supabase.auth.signOut({ scope: 'others' });
  return { success: true };
}
