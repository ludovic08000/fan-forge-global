/**
 * Schémas de validation Zod pour tous les formulaires de l'application
 * Ces validations garantissent la sécurité et l'intégrité des données
 */

import { z } from 'zod';

/**
 * Schéma de validation pour l'authentification (connexion et inscription)
 */
export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Adresse email invalide" })
    .max(255, { message: "L'email doit contenir moins de 255 caractères" })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .max(100, { message: "Le mot de passe doit contenir moins de 100 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  firstName: z
    .string()
    .trim()
    .min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
    .max(50, { message: "Le prénom doit contenir moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, { message: "Le prénom ne peut contenir que des lettres" })
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
    .max(50, { message: "Le nom doit contenir moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, { message: "Le nom ne peut contenir que des lettres" })
    .optional(),
});

/**
 * Schéma de validation pour la confirmation du mot de passe
 */
export const signUpSchema = authSchema.extend({
  confirmPassword: z.string(),
  firstName: z
    .string()
    .trim()
    .min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
    .max(50, { message: "Le prénom doit contenir moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, { message: "Le prénom ne peut contenir que des lettres" }),
  lastName: z
    .string()
    .trim()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
    .max(50, { message: "Le nom doit contenir moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, { message: "Le nom ne peut contenir que des lettres" }),
  username: z
    .string()
    .trim()
    .min(3, { message: "Le pseudo doit contenir au moins 3 caractères" })
    .max(30, { message: "Le pseudo doit contenir moins de 30 caractères" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Le pseudo ne peut contenir que des lettres, chiffres et underscores" })
    .optional()
    .or(z.literal('')),
  role: z.enum(['subscriber', 'creator'], {
    errorMap: () => ({ message: "Rôle invalide" })
  }),
  birthdate: z.string().min(1, { message: "La date de naissance est requise" }),
  gender: z.string().optional(),
  stageName: z.string().trim().max(50, { message: "Le surnom doit contenir moins de 50 caractères" }).optional().or(z.literal('')),
  category: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, { message: "Vous devez accepter les conditions d'utilisation" }),
  privacyAccepted: z.boolean().refine(val => val === true, { message: "Vous devez accepter la politique de confidentialité" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
}).refine((data) => {
  // Vérification d'âge obligatoire pour TOUS les utilisateurs (18+)
  if (!data.birthdate) {
    return false;
  }
  const birthDate = new Date(data.birthdate);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  return actualAge >= 18;
}, {
  message: "Vous devez avoir au moins 18 ans pour vous inscrire sur cette plateforme",
  path: ["birthdate"],
}).refine((data) => {
  if (data.role === 'creator') {
    if (!data.birthdate) {
      return false;
    }
    const birthDate = new Date(data.birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18;
  }
  return true;
}, {
  message: "Vous devez avoir au moins 18 ans pour devenir créateur",
  path: ["birthdate"],
}).refine((data) => {
  if (data.role === 'creator' && !data.gender) {
    return false;
  }
  return true;
}, {
  message: "Le genre est requis pour les créateurs",
  path: ["gender"],
}).refine((data) => {
  if (data.role === 'creator' && !data.stageName) {
    return false;
  }
  return true;
}, {
  message: "Le surnom est requis pour les créateurs",
  path: ["stageName"],
}).refine((data) => {
  if (data.role === 'creator' && !data.category) {
    return false;
  }
  return true;
}, {
  message: "La catégorie est requise pour les créateurs",
  path: ["category"],
});

/**
 * Schéma de validation pour le profil créateur
 */
export const creatorProfileSchema = z.object({
  stageName: z
    .string()
    .trim()
    .min(3, { message: "Le nom de scène doit contenir au moins 3 caractères" })
    .max(50, { message: "Le nom de scène doit contenir moins de 50 caractères" })
    .regex(/^[a-zA-Z0-9À-ÿ\s-_]+$/, { message: "Le nom de scène contient des caractères invalides" }),
  category: z
    .string()
    .trim()
    .min(2, { message: "La catégorie doit contenir au moins 2 caractères" })
    .max(50, { message: "La catégorie doit contenir moins de 50 caractères" }),
  subscriptionPrice: z
    .number()
    .min(0, { message: "Le prix ne peut pas être négatif" })
    .max(999.99, { message: "Le prix maximum est de 999.99€" }),
  currency: z
    .enum(['EUR', 'USD', 'GBP'], {
      errorMap: () => ({ message: "Devise invalide" })
    })
    .default('EUR'),
  bio: z
    .string()
    .trim()
    .max(500, { message: "La biographie doit contenir moins de 500 caractères" })
    .optional(),
  gender: z
    .enum(['male', 'female', 'other', 'prefer_not_to_say'], {
      errorMap: () => ({ message: "Genre invalide" })
    })
    .optional(),
  orientation: z
    .enum(['straight', 'gay', 'lesbian', 'bisexual', 'other', 'prefer_not_to_say'], {
      errorMap: () => ({ message: "Orientation invalide" })
    })
    .optional(),
});

/**
 * Schéma de validation pour l'upload de contenu
 */
export const contentUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Le titre doit contenir au moins 3 caractères" })
    .max(100, { message: "Le titre doit contenir moins de 100 caractères" }),
  description: z
    .string()
    .trim()
    .max(1000, { message: "La description doit contenir moins de 1000 caractères" })
    .optional(),
  tags: z
    .array(z.string().trim().max(30, { message: "Un tag ne peut pas dépasser 30 caractères" }))
    .max(10, { message: "Maximum 10 tags autorisés" })
    .optional(),
  isPremium: z.boolean(),
  price: z
    .number()
    .min(0, { message: "Le prix ne peut pas être négatif" })
    .max(999.99, { message: "Le prix maximum est de 999.99€" })
    .optional(),
});

/**
 * Schéma de validation pour les messages privés
 */
export const privateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Le message ne peut pas être vide" })
    .max(1000, { message: "Le message doit contenir moins de 1000 caractères" }),
  price: z
    .number()
    .min(0, { message: "Le prix ne peut pas être négatif" })
    .max(999.99, { message: "Le prix maximum est de 999.99€" })
    .optional(),
});

/**
 * Schéma de validation pour la recherche
 */
export const searchSchema = z.object({
  searchTerm: z
    .string()
    .trim()
    .max(100, { message: "La recherche doit contenir moins de 100 caractères" })
    .regex(/^[a-zA-Z0-9À-ÿ\s-_]+$/, { message: "La recherche contient des caractères invalides" })
    .optional(),
});

/**
 * Types TypeScript dérivés des schémas Zod
 */
export type AuthInput = z.infer<typeof authSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;
export type ContentUploadInput = z.infer<typeof contentUploadSchema>;
export type PrivateMessageInput = z.infer<typeof privateMessageSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

/**
 * Fonction utilitaire pour sanitiser les entrées HTML
 * @param input - La chaîne à sanitiser
 * @returns La chaîne nettoyée sans HTML dangereux
 */
export const sanitizeHtml = (input: string): string => {
  // Supprimer tous les tags HTML
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Fonction utilitaire pour encoder les URL de manière sécurisée
 * @param input - La chaîne à encoder
 * @returns La chaîne encodée pour utilisation dans une URL
 */
export const safeEncodeURIComponent = (input: string): string => {
  try {
    return encodeURIComponent(input);
  } catch (error) {
    console.error('Erreur lors de l\'encodage URL:', error);
    return '';
  }
};
