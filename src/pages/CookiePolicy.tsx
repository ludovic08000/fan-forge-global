import { useEffect } from "react";

const CookiePolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique des Cookies</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette, smartphone) 
              lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, 
              comme vos préférences de langue et d'autres paramètres.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Les cookies que nous utilisons</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Cookies strictement nécessaires</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies sont essentiels au fonctionnement du site. Ils ne peuvent pas être désactivés.
            </p>
            <table className="w-full text-muted-foreground border-collapse mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Nom</th>
                  <th className="text-left py-3 px-4">Finalité</th>
                  <th className="text-left py-3 px-4">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">sb-auth-token</td>
                  <td className="py-3 px-4">Authentification utilisateur</td>
                  <td className="py-3 px-4">Session</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">age-verified</td>
                  <td className="py-3 px-4">Vérification de l'âge</td>
                  <td className="py-3 px-4">30 jours</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">theme</td>
                  <td className="py-3 px-4">Préférence thème clair/sombre</td>
                  <td className="py-3 px-4">1 an</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Cookies de performance (analytiques)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies nous aident à comprendre comment les visiteurs utilisent le site. 
              Ils sont utilisés uniquement avec votre consentement.
            </p>
            <table className="w-full text-muted-foreground border-collapse mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Nom</th>
                  <th className="text-left py-3 px-4">Finalité</th>
                  <th className="text-left py-3 px-4">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">_ga</td>
                  <td className="py-3 px-4">Google Analytics - Statistiques</td>
                  <td className="py-3 px-4">2 ans</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Cookies tiers</h3>
            <p className="text-muted-foreground leading-relaxed">
              Certains services tiers peuvent déposer des cookies :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Stripe :</strong> Sécurité des paiements</li>
              <li><strong>Supabase :</strong> Authentification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Gérer vos préférences</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vous pouvez gérer vos préférences de cookies de plusieurs façons :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Via la bannière de cookies affichée lors de votre première visite</li>
              <li>Via les paramètres de votre navigateur</li>
              <li>En nous contactant directement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Comment désactiver les cookies via votre navigateur</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chaque navigateur offre des options pour contrôler les cookies :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies
              </li>
              <li>
                <strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies
              </li>
              <li>
                <strong>Safari :</strong> Préférences → Confidentialité → Cookies
              </li>
              <li>
                <strong>Edge :</strong> Paramètres → Cookies et autorisations de site
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Attention :</strong> La désactivation de certains cookies peut affecter 
              le fonctionnement du site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Durée de conservation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les cookies ont des durées de vie variables. Les cookies de session sont supprimés 
              à la fermeture du navigateur. Les cookies persistants restent jusqu'à leur expiration 
              ou leur suppression manuelle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Mise à jour de cette politique</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous pouvons mettre à jour cette politique périodiquement. Toute modification 
              sera indiquée par la date de mise à jour en haut de cette page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant notre utilisation des cookies, contactez-nous à :
              <a href="mailto:dpo@creatorhub.com" className="text-primary hover:underline ml-1">
                dpo@creatorhub.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CookiePolicy;
