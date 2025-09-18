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
              The next-generation platform empowering content creators and connecting them with their audience worldwide.
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
            <h3 className="text-lg font-semibold mb-6">For Creators</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Getting Started</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Creator Tools</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Monetization</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Analytics</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Best Practices</a></li>
            </ul>
          </div>

          {/* Subscribers */}
          <div>
            <h3 className="text-lg font-semibold mb-6">For Subscribers</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Browse Content</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Subscription Plans</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Mobile App</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Account Settings</a></li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Company</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Press Kit</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Safety</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Report Content</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Legal</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">DMCA</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Age Verification</a></li>
            </ul>
          </div>

          {/* Global */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Global</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">🇺🇸 United States</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇬🇧 United Kingdom</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇫🇷 France</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🇩🇪 Germany</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">🌍 View All Countries</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-muted-foreground text-sm mb-4 md:mb-0">
              © 2024 CreatorHub. All rights reserved. Built with ❤️ for creators worldwide.
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>SOC 2 Certified</span>
              <span>•</span>
              <span>18+ Platform</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;