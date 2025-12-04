import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, Settings, Crown, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '@/components/SearchBar';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="font-bold text-xl bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent hover:scale-105 transition-transform">
            ContentHub
          </Link>
          
          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:block flex-1 max-w-lg">
            <SearchBar />
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/lives" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group">
            <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse group-hover:scale-110 transition-transform" />
            <span className="group-hover:text-primary transition-colors">Lives</span>
          </Link>
          <ThemeToggle />
          {user && <NotificationBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Tableau de bord</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Mon profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscriptions" className="flex items-center">
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Mes abonnements</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center text-orange-600">
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Admin (TEST)</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild className="hover:text-primary">
                <Link to="/auth">Connexion</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow hover:scale-105 transition-transform shadow-lg shadow-primary/30">
                <Link to="/auth">Inscription</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          className="md:hidden h-9 w-9 p-0"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4">
            {/* Mobile Search Bar */}
            <div className="mb-4">
              <SearchBar />
            </div>
            
            {/* Mobile Theme Toggle */}
            <div className="mb-4 px-3">
              <ThemeToggle />
            </div>
            
            <div className="space-y-2">
              <Link 
                to="/" 
                className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Accueil
              </Link>
              <Link 
                to="/lives" 
                className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
                Lives
              </Link>
              {!user ? (
                <>
                  <Link 
                    to="/auth" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/dashboard" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Tableau de bord
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <Link 
                    to="/subscriptions" 
                    className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mes abonnements
                  </Link>
                  <Link 
                    to="/admin" 
                    className="block px-3 py-2 text-orange-600 hover:text-orange-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin (TEST)
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;