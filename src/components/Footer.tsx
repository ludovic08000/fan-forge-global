import { Crown } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card/50 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
          {/* Brand */}
          <div className="max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-primary via-primary-glow to-primary p-2 rounded-lg">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                CreatorHub
              </span>
            </div>
            <p className="text-muted-foreground">
              La plateforme nouvelle génération pour créateurs de contenu.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Informations légales</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Conditions d'Utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Politique de Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-primary transition-colors">
                  Politique des Cookies
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-primary transition-colors">
                  Mentions Légales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} CreatorHub. Tous droits réservés.
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Conforme RGPD</span>
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
