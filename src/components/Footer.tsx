import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { memo } from "react";
import { useTranslation } from "@/contexts/TranslationContext";

const Footer = memo(() => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card/50 backdrop-blur-sm border-t border-border" role="contentinfo">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
          {/* Brand */}
          <div className="max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-primary via-primary-glow to-primary p-2 rounded-lg" aria-hidden="true">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Crub
              </span>
            </div>
            <p className="text-muted-foreground mb-2">
              {t('footer.tagline')}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Legal Links */}
          <nav aria-label={t('footer.legalTitle')}>
            <h2 className="text-lg font-semibold mb-4">{t('footer.legalTitle')}</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
                  {t('footer.cookies')}
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
                  {t('footer.legal')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm">
              © {currentYear} Crub. {t('footer.copyright')}
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{t('footer.gdprCompliant')}</span>
              <span aria-hidden="true">•</span>
              <span>{t('footer.adultPlatform')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;