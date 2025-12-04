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
  signUp: (email: string, password: string, firstName?: string, lastName?: string, username?: string, role?: 'subscriber' | 'creator', birthdate?: string, gender?: string, stageName?: string, category?: string) => Promise<{ error: any }>;
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

  /**
   * Enregistrer une connexion dans les logs
   * @param userId - ID de l'utilisateur
   * @param email - Email de l'utilisateur
   * @param method - Méthode de connexion
   */
  const logUserLogin = async (userId: string, email: string, method: string) => {
    try {
      // Obtenir le profil pour le username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', userId)
        .maybeSingle();

      // Créer un ID de session unique
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Insérer le log de connexion
      await supabase.from('user_login_logs').insert({
        user_id: userId,
        username: profile?.username || null,
        email: email,
        ip_address: null, // L'IP sera capturée côté serveur si nécessaire
        user_agent: navigator.userAgent,
        login_method: method,
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du log de connexion:', error);
    }
  };

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
            processIntendedRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        // Notifications utilisateur et logging
        if (event === 'SIGNED_IN') {
          toast.success('Connexion réussie!');
          // Logger la connexion
          if (session?.user) {
            logUserLogin(session.user.id, session.user.email || '', 'session_restored');
          }
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
        .maybeSingle();

      if (creatorData) {
        setUserRole('creator');
        return;
      }

      // Sinon, vérifier le rôle dans la table user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role as UserRole);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rôle utilisateur:', error);
      setUserRole('subscriber'); // Défaut en cas d'erreur
    }
  };

  // Traite le rôle choisi après confirmation email
  async function processIntendedRole(userId: string) {
    try {
      const pendingRole = localStorage.getItem('intended_role') || (session?.user?.user_metadata?.role as string | undefined) || undefined;
      const pendingBirthdate = localStorage.getItem('intended_birthdate') || (session?.user?.user_metadata?.birthdate as string | undefined) || undefined;
      const pendingGender = localStorage.getItem('intended_gender') || (session?.user?.user_metadata?.gender as string | undefined) || undefined;
      const pendingStageName = localStorage.getItem('intended_stageName') || (session?.user?.user_metadata?.stage_name as string | undefined) || undefined;
      const pendingCategory = localStorage.getItem('intended_category') || (session?.user?.user_metadata?.category as string | undefined) || undefined;
      
      if (pendingRole === 'creator') {
        // Créer le rôle dans user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'creator'
          });
        
        if (roleError && !roleError.message.includes('duplicate')) {
          console.error('Création rôle après confirmation échouée:', roleError);
        }

        // Vérifier s'il existe déjà un profil créateur
        const { data: existingCreator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingCreator) {
          const { error: creatorError } = await supabase
            .from('creators')
            .insert({ 
              user_id: userId, 
              subscription_price: 9.99,
              gender: pendingGender || null,
              stage_name: pendingStageName || null,
              category: pendingCategory || null
            });
          if (creatorError) {
            console.error('Création créateur après confirmation échouée:', creatorError);
            return;
          }
        }

        if (pendingBirthdate) {
          const { error: birthdateError } = await supabase
            .from('profiles')
            .update({ birthdate: pendingBirthdate })
            .eq('user_id', userId);
          if (birthdateError) {
            console.error('MAJ birthdate après confirmation échouée:', birthdateError);
          }
        }

        setUserRole('creator');
        localStorage.removeItem('intended_role');
        localStorage.removeItem('intended_birthdate');
        localStorage.removeItem('intended_gender');
        localStorage.removeItem('intended_stageName');
        localStorage.removeItem('intended_category');
      } else if (pendingRole === 'subscriber') {
        // Créer le rôle subscriber dans user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'subscriber'
          });
        
        if (roleError && !roleError.message.includes('duplicate')) {
          console.error('Création rôle subscriber après confirmation échouée:', roleError);
        }
        
        setUserRole('subscriber');
        localStorage.removeItem('intended_role');
      }
    } catch (e) {
      console.error('Erreur processIntendedRole:', e);
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   * @param email - Adresse email de l'utilisateur
   * @param password - Mot de passe de l'utilisateur
   * @param firstName - Prénom de l'utilisateur (optionnel)
   * @param lastName - Nom de famille de l'utilisateur (optionnel)
   * @param username - Pseudo de l'utilisateur (optionnel)
   * @param role - Rôle de l'utilisateur (subscriber ou creator)
   * @param birthdate - Date de naissance (requis pour les créateurs)
   * @returns Objet contenant l'erreur éventuelle
   */
  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, username?: string, role?: 'subscriber' | 'creator', birthdate?: string, gender?: string, stageName?: string, category?: string) => {
    try {
      // URL de redirection après inscription
      const redirectUrl = `${window.location.origin}/`;
      
      // Appel à l'API Supabase pour créer le compte
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            username,
            role,
            birthdate,
            gender,
            stage_name: stageName,
            category
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
        return { error };
      }

      // Cas Supabase: inscription répétée -> pas d'erreur mais pas d'utilisateur ni de session
      if (!data.user && !data.session) {
        toast.error('Cette adresse email est déjà utilisée. Veuillez vous connecter.');
        return { error: { message: 'User already exists' } };
      }

      // Mémoriser le rôle et le genre choisis pour post-confirmation
      try {
        if (role) localStorage.setItem('intended_role', role);
        if (birthdate) localStorage.setItem('intended_birthdate', birthdate);
        if (gender) localStorage.setItem('intended_gender', gender);
        if (stageName) localStorage.setItem('intended_stageName', stageName);
        if (category) localStorage.setItem('intended_category', category);
        if (username) localStorage.setItem('intended_username', username);
      } catch {}

      // Si l'inscription réussit, créer le rôle et le profil créateur si nécessaire
      if (data.user && role && data.session) {
        try {
          // Créer le rôle dans user_roles
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: role
            });

          if (roleError) {
            console.error('Erreur lors de la création du rôle:', roleError);
            toast.error('Erreur lors de la création du rôle utilisateur');
          }

          // Si créateur, créer l'entrée dans la table creators
          if (role === 'creator') {
            const { error: creatorError } = await supabase
              .from('creators')
              .insert({
                user_id: data.user.id,
                subscription_price: 9.99,
                gender: gender || null,
                stage_name: stageName || null,
                category: category || null
              });

            if (creatorError) {
              console.error('Erreur lors de la création du profil créateur:', creatorError);
              toast.error('Erreur lors de la création du profil créateur');
            } else {
              // Définir le rôle immédiatement après création réussie
              setUserRole('creator');
            }
          } else {
            setUserRole('subscriber');
          }

          // Mettre à jour le profil avec le pseudo et la date de naissance
          const profileUpdate: { birthdate?: string; username?: string; display_name?: string } = {};
          if (birthdate) profileUpdate.birthdate = birthdate;
          if (username) {
            profileUpdate.username = username;
            profileUpdate.display_name = username;
          }
          
          if (Object.keys(profileUpdate).length > 0) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update(profileUpdate)
              .eq('user_id', data.user.id);

            if (profileError) {
              console.error('Erreur lors de la mise à jour du profil:', profileError);
            }
          }
        } catch (err) {
          console.error('Erreur lors de la configuration du compte:', err);
        }
      }

      toast.success('Compte créé avec succès! Vérifiez votre email pour confirmer votre compte.');
      return { error: null };
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
      const { data, error } = await supabase.auth.signInWithPassword({
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
      } else if (data.user) {
        // Logger la connexion réussie
        await logUserLogin(data.user.id, data.user.email || '', 'email_password');
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
      const redirectUrl = `${window.location.origin}/dashboard`;
      
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
      const redirectUrl = `${window.location.origin}/dashboard`;
      
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