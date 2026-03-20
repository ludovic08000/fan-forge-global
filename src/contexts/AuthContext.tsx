import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'creator' | 'subscriber';

export interface UserProfile {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
  stage_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, username?: string, role?: 'subscriber' | 'creator', birthdate?: string, gender?: string, stageName?: string, category?: string, categories?: string[]) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Charge le profil utilisateur depuis la base de données
   */
  const loadUserProfile = async (userId: string) => {
    try {
      // Charger profil + créateur en parallèle
      const [{ data: profile }, { data: creator }] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar_url, display_name, username')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('creators')
          .select('stage_name')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      setUserProfile({
        avatar_url: profile?.avatar_url || null,
        display_name: profile?.display_name || null,
        username: profile?.username || null,
        stage_name: creator?.stage_name || null,
      });
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

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

  /**
   * Vérifie si un utilisateur est suspendu et le déconnecte si c'est le cas
   * @param userId - L'identifiant de l'utilisateur
   * @returns true si l'utilisateur est suspendu
   */
  const checkAndHandleSuspension = async (userId: string): Promise<boolean> => {
    try {
      const { data: suspension } = await supabase
        .from('user_suspensions')
        .select('reason, suspended_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (suspension) {
        await supabase.auth.signOut();
        // Stocker les détails pour affichage sur la page /suspended
        sessionStorage.setItem('suspension_details', JSON.stringify(suspension));
        window.location.href = '/suspended';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification de suspension:', error);
      return false;
    }
  };

  /**
   * Vérifie et configure le profil créateur si nécessaire (cas où la session
   * n'était pas disponible à l'inscription car l'email n'était pas encore confirmé)
   */
  const ensureCreatorSetup = async (authUser: User) => {
    try {
      const metadata = authUser.user_metadata;
      if (metadata?.role !== 'creator') return;

      // Vérifier si l'entrée creators existe déjà
      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existingCreator) return; // Déjà configuré

      console.log('🔧 Configuration créateur manquante, création en cours...');

      // Créer l'entrée dans user_roles
      await supabase
        .from('user_roles')
        .upsert({ user_id: authUser.id, role: 'creator' }, { onConflict: 'user_id,role' });

      // Créer l'entrée dans creators
      const categoriesArray = metadata.categories && Array.isArray(metadata.categories) && metadata.categories.length > 0
        ? metadata.categories
        : (metadata.category ? [metadata.category] : []);
      const { error: creatorError } = await supabase
        .from('creators')
        .insert({
          user_id: authUser.id,
          subscription_price: 9.99,
          gender: metadata.gender || null,
          stage_name: metadata.stage_name || null,
          category: metadata.category || null,
          categories: categoriesArray,
        });

      if (creatorError) {
        console.error('Erreur création créateur différée:', creatorError);
      } else {
        console.log('✅ Profil créateur créé avec succès');
        setUserRole('creator');
      }

      // Mettre à jour le profil
      const profileUpdate: Record<string, string> = {};
      if (metadata.birthdate) profileUpdate.birthdate = metadata.birthdate;
      if (metadata.username) {
        profileUpdate.username = metadata.username;
        profileUpdate.display_name = metadata.username;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from('profiles').update(profileUpdate).eq('user_id', authUser.id);
      }
    } catch (error) {
      console.error('Erreur ensureCreatorSetup:', error);
    }
  };

  // Effet pour gérer l'authentification et charger le rôle utilisateur
  useEffect(() => {
    // Configuration de l'écouteur d'état d'authentification EN PREMIER
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event, session?.user?.id ? '[authenticated]' : '[unauthenticated]');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Vérifier la suspension et charger le rôle utilisateur après connexion
        if (session?.user) {
          // Utiliser setTimeout pour éviter les problèmes de deadlock
          setTimeout(async () => {
            // Vérifier si l'utilisateur est suspendu (surtout pour OAuth)
            const isSuspended = await checkAndHandleSuspension(session.user.id);
            if (isSuspended) return;
            
            loadUserRole(session.user.id);
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setUserProfile(null);
        }
        
        // Gérer la confirmation d'email via magic link
        // NOTE: On ne met PAS otp_verified = true ici car chaque connexion doit passer par l'OTP
        if (event === 'SIGNED_IN' && session?.user) {
          // Ne pas mettre otp_verified à true automatiquement
          // La vérification OTP sera demandée à chaque connexion
          console.log('📧 Connexion détectée, OTP sera demandé');
          
          // Vérifier si le créateur n'a pas été configuré à l'inscription (cas confirmation email)
          setTimeout(() => ensureCreatorSetup(session.user), 500);
          
          toast.success('Connexion réussie!');
          logUserLogin(session.user.id, session.user.email || '', 'email');
        } else if (event === 'SIGNED_OUT') {
          toast.success('Déconnexion réussie!');
          setUserRole(null);
          setUserProfile(null);
        }
      }
    );

    // ENSUITE vérifier s'il existe déjà une session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Charger le rôle et le profil si l'utilisateur est déjà connecté
      // NOTE: On ne modifie PAS otp_verified ici - il reste tel quel
      if (session?.user) {
        loadUserRole(session.user.id);
        loadUserProfile(session.user.id);
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
      // D'abord vérifier si admin (priorité maximale)
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        setUserRole('admin');
        return;
      }

      // Ensuite vérifier si créateur
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
        setUserRole('subscriber');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rôle utilisateur:', error);
      setUserRole('subscriber');
    }
  };

  // NOTE: Le flux pendingRole a été supprimé pour des raisons de sécurité.
  // L'attribution des rôles se fait désormais exclusivement côté serveur
  // via les triggers de base de données et les metadata utilisateur Supabase.
  // Les données sensibles ne sont plus stockées dans localStorage.

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
  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, username?: string, role?: 'subscriber' | 'creator', birthdate?: string, gender?: string, stageName?: string, category?: string, categories?: string[]) => {
    try {
      // URL de redirection après inscription - vers l'espace personnel
      const redirectUrl = `${window.location.origin}/subscriptions`;
      
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
            category,
            categories
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

      // NOTE: Le stockage localStorage du rôle a été supprimé pour des raisons de sécurité.
      // Le rôle est désormais uniquement géré via les metadata utilisateur Supabase
      // et les triggers serveur.

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
            const categoriesArray = categories && categories.length > 0 
              ? categories 
              : (category ? [category] : []);
            const { error: creatorError } = await supabase
              .from('creators')
              .insert({
                user_id: data.user.id,
                subscription_price: 9.99,
                gender: gender || null,
                stage_name: stageName || null,
                category: category || (categoriesArray[0] || null),
                categories: categoriesArray
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

          // Mettre à jour le profil avec le pseudo, date de naissance et acceptation CGU
          const now = new Date().toISOString();
          const profileUpdate: { 
            birthdate?: string; 
            username?: string; 
            display_name?: string;
            terms_accepted_at?: string;
            privacy_accepted_at?: string;
            terms_version?: string;
            privacy_version?: string;
          } = {
            terms_accepted_at: now,
            privacy_accepted_at: now,
            terms_version: '1.0',
            privacy_version: '1.0'
          };
          if (birthdate) profileUpdate.birthdate = birthdate;
          if (username) {
            profileUpdate.username = username;
            profileUpdate.display_name = username;
          }
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('user_id', data.user.id);

          if (profileError) {
            console.error('Erreur lors de la mise à jour du profil:', profileError);
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
   * Déconnexion de l'utilisateur
   */
  const signOut = async () => {
    try {
      // Réinitialiser otp_verified à false pour forcer la vérification à la prochaine connexion
      if (user) {
        await supabase
          .from('profiles')
          .update({ otp_verified: false })
          .eq('user_id', user.id);
      }
      
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
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};