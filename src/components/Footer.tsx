import { Crown, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { memo } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Language } from "@/hooks/useLanguageDetection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { code: 'fr' as Language, name: 'Français', flag: '🇫🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
];

const Footer = memo(() => {
  const { t, language, changeLanguage } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentLang = LANGUAGES.find(l => l.code === language);
  
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

          {/* Language Selector */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('footer.language') || 'Language'}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <span>{currentLang?.flag}</span>
                  <span>{currentLang?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGUAGES.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={language === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
