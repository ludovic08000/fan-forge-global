-- Créer un bucket pour les documents d'identité (privé pour la sécurité)
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs d'uploader leurs propres documents
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique pour permettre aux utilisateurs de voir leurs propres documents
CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique pour permettre aux admins de voir tous les documents
CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Table pour les demandes de vérification d'identité
CREATE TABLE public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Documents uploadés
  id_front_url TEXT NOT NULL,
  id_back_url TEXT,
  selfie_with_id_url TEXT NOT NULL,
  
  -- Informations déclarées
  full_name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'id_card', 'driver_license')),
  document_number TEXT,
  
  -- Statut de vérification
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  rejection_reason TEXT,
  
  -- Métadonnées
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Activer RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own verification"
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own verification"
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending verification"
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view all verifications"
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all verifications"
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ajouter colonne is_identity_verified dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false;

-- Index pour les performances
CREATE INDEX idx_identity_verifications_user_id ON public.identity_verifications(user_id);
CREATE INDEX idx_identity_verifications_status ON public.identity_verifications(status);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_identity_verifications_updated_at
BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();