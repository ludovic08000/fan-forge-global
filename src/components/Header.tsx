import React, { useState, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, Settings, Crown, MessageCircle, Receipt, Handshake, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';
import { useTranslation } from '@/contexts/TranslationContext';

const Header = memo(() => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, userRole, userProfile } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Déterminer la destination du logo selon le rôle
  const getHomeDestination = () => {
    if (!user) return "/";
    if (userRole === 'creator' || userRole === 'admin') return "/dashboard";
    return "/subscriptions";
  };

  // Obtenir l'avatar à afficher (priorité: profil DB > metadata > fallback)
  const getAvatarUrl = () => {
    return userProfile?.avatar_url || user?.user_metadata?.avatar_url || null;
  };

  // Obtenir le nom à afficher
  const getDisplayName = () => {
    return userProfile?.stage_name || userProfile?.display_name || userProfile?.username || user?.email;
  };

  // Obtenir les initiales pour le fallback
  const getInitials = () => {
    const name = userProfile?.stage_name || userProfile?.display_name || userProfile?.username;
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || '??';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to={getHomeDestination()} 
            className="font-bold text-xl bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            aria-label="Crub - Accueil"
          >
            Crub
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6" aria-label="Navigation principale">
          {user && <NotificationBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-14 w-14 rounded-full p-0 ring-2 ring-primary/50 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/40"
                  aria-label="Menu utilisateur"
                >
                  <Avatar className="h-14 w-14 border-2 border-primary/30 shadow-xl">
                    <AvatarImage 
                      src={getAvatarUrl() || undefined} 
                      alt={getDisplayName() || 'Avatar'} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground font-bold text-lg">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center">
                    <User className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('header.dashboard')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('header.myProfile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/messages" className="flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('header.messages')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscriptions" className="flex items-center">
                    <Crown className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('header.mySubscriptions')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-payments" className="flex items-center">
                    <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('header.myPurchases')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/live-calendar" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>Mes lives privés</span>
                  </Link>
                </DropdownMenuItem>
                {(userRole === 'creator' || userRole === 'admin') && (
                  <DropdownMenuItem asChild>
                    <Link to="/partnerships" className="flex items-center">
                      <Handshake className="mr-2 h-4 w-4" aria-hidden="true" />
                      <span>{t('header.partnerships')}</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  navigate('/');
                }}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>{t('header.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild className="hover:text-primary">
                <Link to="/login">{t('header.signIn')}</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow hover:scale-105 transition-transform shadow-lg shadow-primary/30">
                <Link to="/signup">{t('header.signUp')}</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          className="md:hidden h-9 w-9 p-0"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="md:hidden border-t bg-background" aria-label="Navigation mobile">
          <div className="container mx-auto px-4 py-4">
            <div className="space-y-2">
              <Link 
                to="/" 
                className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                onClick={closeMenu}
              >
                {t('header.home')}
              </Link>
              {!user ? (
                <>
                  <Link 
                    to="/login" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.signIn')}
                  </Link>
                  <Link 
                    to="/signup" 
                    className="block px-3 py-2 text-primary hover:text-primary/80 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.signUp')}
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/dashboard" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.dashboard')}
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.myProfile')}
                  </Link>
                  <Link 
                    to="/messages" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.messages')}
                  </Link>
                  <Link 
                    to="/subscriptions" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.mySubscriptions')}
                  </Link>
                  <Link 
                    to="/my-payments" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    {t('header.myPurchases')}
                  </Link>
                  <Link 
                    to="/live-calendar" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onClick={closeMenu}
                  >
                    Mes lives privés
                  </Link>
                  {(userRole === 'creator' || userRole === 'admin') && (
                    <Link 
                      to="/partnerships" 
                      className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      onClick={closeMenu}
                    >
                      {t('header.partnerships')}
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                      closeMenu();
                    }}
                    className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  >
                    {t('header.logout')}
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;