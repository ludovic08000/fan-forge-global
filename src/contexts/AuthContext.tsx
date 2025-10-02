import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'creator' | 'subscriber';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithFacebook: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Effet pour gérer l'authentification et charger le rôle utilisateur
  useEffect(() => {
    // Configuration de l'écouteur d'état d'authentification EN PREMIER
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Charger le rôle utilisateur après connexion
        if (session?.user) {
          // Utiliser setTimeout pour éviter les problèmes de deadlock
          setTimeout(() => {
            loadUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        // Notifications utilisateur
        if (event === 'SIGNED_IN') {
          toast.success('Connexion réussie!');
        } else if (event === 'SIGNED_OUT') {
          toast.success('Déconnexion réussie!');
          setUserRole(null);
        }
      }
    );

    // ENSUITE vérifier s'il existe déjà une session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Charger le rôle si l'utilisateur est déjà connecté
      if (session?.user) {
        loadUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Charge le rôle de l'utilisateur depuis la base de données
   * @param userId - L'identifiant de l'utilisateur
   */
  const loadUserRole = async (userId: string) => {
    try {
      // Vérifier d'abord si l'utilisateur est un créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (creatorData) {
        setUserRole('creator');
        return;
      }

      // Sinon, vérifier le rôle dans la table user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData) {
        setUserRole(roleData.role as UserRole);
      } else {
        // Par défaut, l'utilisateur est un abonné
        setUserRole('subscriber');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rôle utilisateur:', error);
      setUserRole('subscriber'); // Défaut en cas d'erreur
    }
  };

  /**
   * Inscription d'un nouvel utilisateur
   * @param email - Adresse email de l'utilisateur
   * @param password - Mot de passe de l'utilisateur
   * @param firstName - Prénom de l'utilisateur (optionnel)
   * @param lastName - Nom de famille de l'utilisateur (optionnel)
   * @returns Objet contenant l'erreur éventuelle
   */
  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      // URL de redirection après inscription
      const redirectUrl = `${window.location.origin}/`;
      
      // Appel à l'API Supabase pour créer le compte
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      // Gestion des erreurs
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Cette adresse email est déjà utilisée');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Compte créé avec succès! Vérifiez votre email pour confirmer votre compte.');
      }

      return { error };
    } catch (error: any) {
      toast.error('Une erreur est survenue lors de la création du compte');
      return { error };
    }
  };

  /**
   * Connexion d'un utilisateur existant
   * @param email - Adresse email de l'utilisateur
   * @param password - Mot de passe de l'utilisateur
   * @returns Objet contenant l'erreur éventuelle
   */
  const signIn = async (email: string, password: string) => {
    try {
      // Appel à l'API Supabase pour se connecter
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Gestion des erreurs de connexion
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou mot de passe incorrect');
        } else {
          toast.error(error.message);
        }
      }

      return { error };
    } catch (error: any) {
      toast.error('Une erreur est survenue lors de la connexion');
      return { error };
    }
  };

  /**
   * Connexion avec Google OAuth
   * @returns Objet contenant l'erreur éventuelle
   */
  const signInWithGoogle = async () => {
    try {
      // URL de redirection après authentification OAuth
      const redirectUrl = `${window.location.origin}/`;
      
      // Appel à l'API Supabase pour connexion OAuth Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        toast.error(error.message);
      }

      return { error };
    } catch (error: any) {
      toast.error('Une erreur est survenue lors de la connexion avec Google');
      return { error };
    }
  };

  /**
   * Connexion avec Facebook OAuth
   * @returns Objet contenant l'erreur éventuelle
   */
  const signInWithFacebook = async () => {
    try {
      // URL de redirection après authentification OAuth
      const redirectUrl = `${window.location.origin}/`;
      
      // Appel à l'API Supabase pour connexion OAuth Facebook
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        toast.error(error.message);
      }

      return { error };
    } catch (error: any) {
      toast.error('Une erreur est survenue lors de la connexion avec Facebook');
      return { error };
    }
  };

  /**
   * Déconnexion de l'utilisateur
   */
  const signOut = async () => {
    try {
      // Appel à l'API Supabase pour se déconnecter
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error('Une erreur est survenue lors de la déconnexion');
    }
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};