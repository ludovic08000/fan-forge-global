import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2, Share, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

    // Détecter iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('Application installée avec succès !');
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  const benefits = [
    {
      icon: CheckCircle2,
      title: 'Accès instantané',
      description: 'Lancez l\'application directement depuis votre écran d\'accueil'
    },
    {
      icon: CheckCircle2,
      title: 'Mode hors ligne',
      description: 'Consultez du contenu même sans connexion internet'
    },
    {
      icon: CheckCircle2,
      title: 'Notifications',
      description: 'Recevez des alertes pour les nouveaux lives et contenus'
    },
    {
      icon: CheckCircle2,
      title: 'Performances optimisées',
      description: 'Chargement plus rapide et expérience fluide'
    }
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Application installée !</CardTitle>
            <CardDescription>
              ContentHub est maintenant disponible sur votre appareil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full" size="lg">
              <Home className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Installer ContentHub</h1>
          <p className="text-xl text-muted-foreground">
            Profitez d'une meilleure expérience avec notre application
          </p>
        </div>

        {/* Install Button */}
        <Card className="mb-12">
          <CardContent className="p-6">
            {deferredPrompt && !isIOS ? (
              <Button onClick={handleInstall} size="lg" className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Installer l'application
              </Button>
            ) : isIOS ? (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Sur iOS, suivez ces étapes pour installer l'application :
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </span>
                    <span>
                      Appuyez sur le bouton <Share className="inline h-4 w-4" /> de partage dans Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      2
                    </span>
                    <span>Faites défiler et sélectionnez "Sur l'écran d'accueil"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      3
                    </span>
                    <span>Appuyez sur "Ajouter" pour confirmer</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>L'installation n'est pas disponible sur ce navigateur.</p>
                <p className="text-sm mt-2">Utilisez Chrome, Edge ou Safari pour installer l'application.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card key={benefit.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Button onClick={() => navigate('/')} variant="outline" size="lg">
            <Home className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
