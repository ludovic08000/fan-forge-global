import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, User, Crown, Globe, LogOut } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import type { Language } from "@/hooks/useLanguageDetection";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { language, changeLanguage, t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary via-primary-glow to-primary p-2 rounded-lg">
              <Crown className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              CreatorHub
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#creators" className="text-foreground hover:text-primary transition-colors">
              {t('header.forCreators')}
            </a>
            <a href="#features" className="text-foreground hover:text-primary transition-colors">
              {t('header.features')}
            </a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
              {t('header.pricing')}
            </a>
            <a href="#support" className="text-foreground hover:text-primary transition-colors">
              {t('header.support')}
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors p-2"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm">{languages.find(l => l.code === language)?.flag}</span>
              </button>
              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-background border border-border rounded-lg shadow-lg min-w-[150px] z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        language === lang.code ? 'bg-muted' : ''
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">
                    <User className="h-4 w-4 mr-2" />
                    {t('header.signIn')}
                  </Link>
                </Button>
                <Button variant="premium" size="sm" asChild>
                  <Link to="/auth">
                    {t('header.getStarted')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              <a href="#creators" className="text-foreground hover:text-primary transition-colors">
                {t('header.forCreators')}
              </a>
              <a href="#features" className="text-foreground hover:text-primary transition-colors">
                {t('header.features')}
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
                {t('header.pricing')}
              </a>
              <a href="#support" className="text-foreground hover:text-primary transition-colors">
                {t('header.support')}
              </a>
              {/* Mobile Language Selector */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center space-x-2 mb-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Langue / Language</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`flex items-center space-x-2 px-2 py-1 text-sm rounded transition-colors ${
                        language === lang.code ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/dashboard">
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={signOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Déconnexion
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/auth">
                        <User className="h-4 w-4 mr-2" />
                        {t('header.signIn')}
                      </Link>
                    </Button>
                    <Button variant="premium" size="sm" asChild>
                      <Link to="/auth">
                        {t('header.getStarted')}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;