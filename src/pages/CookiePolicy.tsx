import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const CookiePolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Politique des Cookies - CreatorHub"
        description="Politique des cookies de CreatorHub. Découvrez les cookies utilisés sur notre plateforme de contenu pour adultes et comment les gérer."
        keywords="cookies, politique cookies, traceurs, RGPD cookies, consentement cookies, contenu adulte"
        url="https://crub.com/cookies"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique des Cookies</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-destructive">⚠️ SITE RÉSERVÉ AUX ADULTES</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub est une plateforme de contenu pour adultes. L'utilisation de cookies essentiels, 
              notamment pour la vérification de l'âge et l'authentification, est <strong>obligatoire</strong> 
              pour accéder au site.<br /><br />
              <strong>Si vous êtes mineur, quittez immédiatement ce site.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette, smartphone) 
              lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, 
              comme vos préférences et votre statut de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Cookies strictement nécessaires (obligatoires)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies sont <strong>essentiels</strong> au fonctionnement du site et ne peuvent pas être désactivés. 
              Sans eux, vous ne pouvez pas accéder au contenu de la plateforme.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Cookies de vérification d'âge</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies sont <strong>obligatoires</strong> conformément à la législation sur les sites pour adultes.
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
                  <td className="py-3 px-4 font-mono text-sm">age_verified</td>
                  <td className="py-3 px-4">Mémorise que vous avez confirmé être majeur (18+)</td>
                  <td className="py-3 px-4">Session du navigateur</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">adult_content_accepted</td>
                  <td className="py-3 px-4">Mémorise votre acceptation d'accéder au contenu adulte</td>
                  <td className="py-3 px-4">30 jours</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Cookies d'authentification</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies permettent de vous identifier et de sécuriser votre session.
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
                  <td className="py-3 px-4 font-mono text-sm">sb-access-token</td>
                  <td className="py-3 px-4">Token d'accès pour l'authentification Supabase</td>
                  <td className="py-3 px-4">1 heure (renouvelé automatiquement)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">sb-refresh-token</td>
                  <td className="py-3 px-4">Token de rafraîchissement pour maintenir la session</td>
                  <td className="py-3 px-4">7 jours (ou jusqu'à déconnexion)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">sb-auth-token</td>
                  <td className="py-3 px-4">Cookie de session d'authentification principal</td>
                  <td className="py-3 px-4">Session</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Cookies de sécurité</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies protègent contre les attaques et les fraudes.
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
                  <td className="py-3 px-4 font-mono text-sm">csrf_token</td>
                  <td className="py-3 px-4">Protection contre les attaques CSRF (Cross-Site Request Forgery)</td>
                  <td className="py-3 px-4">Session</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">rate_limit</td>
                  <td className="py-3 px-4">Protection contre les tentatives de connexion par force brute</td>
                  <td className="py-3 px-4">15 minutes</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-medium mb-3 mt-6">2.4 Cookies de préférences</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies mémorisent vos préférences d'affichage.
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
                  <td className="py-3 px-4 font-mono text-sm">theme</td>
                  <td className="py-3 px-4">Préférence thème clair/sombre</td>
                  <td className="py-3 px-4">1 an</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">language</td>
                  <td className="py-3 px-4">Préférence de langue</td>
                  <td className="py-3 px-4">1 an</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookies tiers</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Certains services tiers essentiels déposent des cookies pour assurer la sécurité et le bon fonctionnement :
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.1 Stripe (Paiements)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Stripe utilise des cookies pour sécuriser les transactions et prévenir la fraude.
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
                  <td className="py-3 px-4 font-mono text-sm">__stripe_mid</td>
                  <td className="py-3 px-4">Identification unique pour la prévention de la fraude</td>
                  <td className="py-3 px-4">1 an</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">__stripe_sid</td>
                  <td className="py-3 px-4">Session Stripe pour les paiements sécurisés</td>
                  <td className="py-3 px-4">30 minutes</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">m</td>
                  <td className="py-3 px-4">Détection de fraude et sécurité des paiements</td>
                  <td className="py-3 px-4">2 ans</td>
                </tr>
              </tbody>
            </table>
            <p className="text-muted-foreground leading-relaxed">
              Pour plus d'informations : <a href="https://stripe.com/fr/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Politique de confidentialité Stripe</a>
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Supabase (Authentification et base de données)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Supabase gère l'authentification sécurisée des utilisateurs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pour plus d'informations : <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Politique de confidentialité Supabase</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cookies que nous n'utilisons PAS</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nous respectons votre vie privée. Nous <strong>n'utilisons pas</strong> :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>❌ Cookies publicitaires ou de retargeting</li>
              <li>❌ Cookies de réseaux sociaux (Facebook, Twitter, etc.)</li>
              <li>❌ Cookies de profilage comportemental</li>
              <li>❌ Cookies de suivi inter-sites</li>
              <li>❌ Google Analytics ou autres outils de tracking tiers</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Nous ne vendons pas vos données et ne partageons pas votre activité avec des tiers publicitaires.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Pourquoi les cookies de vérification d'âge sont obligatoires ?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément à la législation française et européenne sur les sites pour adultes :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nous devons vérifier que vous êtes majeur avant de vous donner accès au contenu</li>
              <li>Cette vérification doit être effectuée à chaque session ou mémorisée avec votre consentement</li>
              <li>Le cookie de vérification d'âge est une exigence légale, pas un choix</li>
              <li>Sans ce cookie, vous ne pouvez pas accéder au contenu de la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Gestion des cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Cookies essentiels :</strong> Ces cookies ne peuvent pas être désactivés car ils sont nécessaires au fonctionnement du site et au respect de la loi.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Cookies de préférences :</strong> Vous pouvez les supprimer via les paramètres de votre navigateur, mais vos préférences (thème, langue) ne seront pas mémorisées.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Note importante :</strong> La suppression des cookies d'authentification vous déconnectera de la plateforme. La suppression du cookie de vérification d'âge vous obligera à reconfirmer votre majorité.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Comment gérer les cookies via votre navigateur</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chaque navigateur offre des options pour contrôler les cookies :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies et autres données des sites
              </li>
              <li>
                <strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies et données de sites
              </li>
              <li>
                <strong>Safari :</strong> Préférences → Confidentialité → Gérer les données de sites web
              </li>
              <li>
                <strong>Edge :</strong> Paramètres → Cookies et autorisations de site → Gérer et supprimer les cookies
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4 bg-muted/30 p-4 rounded-lg">
              <strong>⚠️ Attention :</strong> La suppression ou le blocage des cookies essentiels rendra 
              l'utilisation du site impossible. Vous devrez reconfirmer votre âge et vous reconnecter.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Durée de conservation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les durées de conservation des cookies varient selon leur fonction :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Cookies de session :</strong> Supprimés à la fermeture du navigateur</li>
              <li><strong>Cookies d'authentification :</strong> 7 jours maximum (renouvelés à chaque connexion)</li>
              <li><strong>Cookie de vérification d'âge :</strong> 30 jours maximum</li>
              <li><strong>Cookies de préférences :</strong> 1 an maximum</li>
              <li><strong>Cookies Stripe :</strong> Selon la politique Stripe (jusqu'à 2 ans)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Base légale</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Notre utilisation des cookies repose sur les bases légales suivantes :
            </p>
            <table className="w-full text-muted-foreground border-collapse mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Type de cookie</th>
                  <th className="text-left py-3 px-4">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Vérification d'âge</td>
                  <td className="py-3 px-4"><strong>Obligation légale</strong> (Art. 227-24 Code pénal)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Authentification</td>
                  <td className="py-3 px-4">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Sécurité (CSRF, rate limit)</td>
                  <td className="py-3 px-4">Intérêt légitime (sécurité)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Paiements Stripe</td>
                  <td className="py-3 px-4">Exécution du contrat / Intérêt légitime (fraude)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Préférences</td>
                  <td className="py-3 px-4">Consentement implicite (utilisation du site)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Mise à jour de cette politique</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous pouvons mettre à jour cette politique périodiquement. Toute modification 
              sera indiquée par la date de mise à jour en haut de cette page. Les modifications 
              importantes seront notifiées par email ou notification sur la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant notre utilisation des cookies :<br /><br />
              <strong>Email DPO :</strong> <a href="mailto:dpo@crub.com" className="text-primary hover:underline">dpo@crub.com</a><br />
              <strong>Email général :</strong> <a href="mailto:contact@crub.com" className="text-primary hover:underline">contact@crub.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CookiePolicy;
