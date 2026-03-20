import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SEOHead 
        title="Page introuvable – TheForge"
        description="Cette page n'existe pas sur TheForge. Retournez à l'accueil pour découvrir nos créateurs de contenu exclusif."
        noindex={true}
      />
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Cette page n'existe pas</p>
        <Link to="/" className="inline-block mt-4 text-primary underline hover:text-primary/80 font-medium">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
