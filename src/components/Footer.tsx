import { Crown, Twitter, Instagram, Youtube, Linkedin } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-card/50 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-primary via-primary-glow to-primary p-2 rounded-lg">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                CreatorHub
              </span>
            </div>
            <p className="text-muted-foreground text-lg mb-6 max-w-md">
              La plateforme nouvelle génération qui permet aux créateurs de contenu de se connecter avec leur audience dans le monde entier.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-card hover:bg-accent p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="bg-card hover:bg-accent p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="bg-card hover:bg-accent p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <Youtube className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="bg-card hover:bg-accent p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </a>
            </div>
          </div>

          {/* Creators */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Pour les Créateurs</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Commencer</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Outils Créateurs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Monétisation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Statistiques</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Bonnes Pratiques</a></li>
            </ul>
          </div>

          {/* Subscribers */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Pour les Abonnés</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Explorer le Contenu</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Plans d&apos;Abonnement</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Application Mobile</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Centre d&apos;Aide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Paramètres du Compte</a></li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Entreprise</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">À Propos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carrières</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Kit Presse</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Centre d&apos;Aide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Communauté</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sécurité</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Signaler du Contenu</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Statut</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Légal</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Conditions d&apos;Utilisation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Politique de Confidentialité</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Politique des Cookies</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">DMCA</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Vérification d&apos;Âge</a></li>
            </ul>
          </div>

          {/* Global */}
          <div>
            <h3 className="text-lg font-semibold mb-6">International</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">🇺🇸 États-Unis</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇬🇧 Royaume-Uni</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇫🇷 France</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇩🇪 Allemagne</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🌍 Voir Tous les Pays</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-muted-foreground text-sm mb-4 md:mb-0">
              © 2024 CreatorHub. Tous droits réservés. Créé avec ❤️ pour les créateurs du monde entier.
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>Conforme RGPD</span>
              <span>•</span>
              <span>Certifié SOC 2</span>
              <span>•</span>
              <span>Plateforme 18+</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;