import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const CookiePolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Politique des Cookies - TheForge"
        description="Politique des cookies de TheForge. Découvrez les cookies utilisés sur notre plateforme et comment les gérer conformément au RGPD."
        keywords="cookies, politique cookies, traceurs, RGPD cookies, consentement cookies"
        url="https://theforge.fans/cookies"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique des Cookies</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-primary">📋 RÉSUMÉ</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>✅ Nous utilisons des cookies essentiels pour le fonctionnement du site</li>
              <li>✅ Vous pouvez personnaliser vos préférences via notre bannière de consentement</li>
              <li>❌ Nous n'utilisons PAS de cookies publicitaires ou de tracking tiers</li>
              <li>🔒 Vos données restent confidentielles et ne sont jamais vendues</li>
            </ul>
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
              Sans eux, certaines fonctionnalités ne seraient pas disponibles.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Cookies d'authentification</h3>
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

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Cookies de sécurité</h3>
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

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Cookies de consentement RGPD</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies mémorisent vos choix concernant les cookies.
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
                  <td className="py-3 px-4 font-mono text-sm">rgpd_cookie_consent</td>
                  <td className="py-3 px-4">Enregistre votre consentement aux cookies avec horodatage</td>
                  <td className="py-3 px-4">365 jours</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 font-mono text-sm">rgpd_cookie_preferences</td>
                  <td className="py-3 px-4">Mémorise vos préférences granulaires (fonctionnels, analytiques, marketing)</td>
                  <td className="py-3 px-4">365 jours</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookies fonctionnels (optionnels)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ces cookies améliorent votre expérience mais ne sont pas indispensables. Vous pouvez les désactiver via notre bannière de consentement.
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
            <h2 className="text-2xl font-semibold mb-4">4. Cookies tiers</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Certains services tiers essentiels déposent des cookies pour assurer la sécurité et le bon fonctionnement :
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.1 Stripe (Paiements)</h3>
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

            <h3 className="text-xl font-medium mb-3 mt-6">4.2 Supabase (Authentification et base de données)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Supabase gère l'authentification sécurisée des utilisateurs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pour plus d'informations : <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Politique de confidentialité Supabase</a>
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.3 Sentry (Monitoring d'erreurs)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sentry nous aide à détecter et corriger les bugs pour améliorer la qualité du service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pour plus d'informations : <a href="https://sentry.io/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Politique de confidentialité Sentry</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies que nous n'utilisons PAS</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nous respectons votre vie privée. Nous <strong>n'utilisons pas</strong> :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>❌ Cookies publicitaires ou de retargeting</li>
              <li>❌ Cookies de réseaux sociaux (Facebook, Twitter, etc.)</li>
              <li>❌ Cookies de profilage comportemental</li>
              <li>❌ Cookies de suivi inter-sites</li>
              <li>❌ Google Analytics ou autres outils de tracking tiers invasifs</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Nous ne vendons pas vos données et ne partageons pas votre activité avec des tiers publicitaires.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Gestion de vos préférences</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vous avez le contrôle total sur vos préférences de cookies :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Bannière de consentement :</strong> Lors de votre première visite, vous pouvez accepter tous les cookies, refuser les optionnels, ou personnaliser vos choix.</li>
              <li><strong>Paramètres du compte :</strong> Si vous êtes connecté, vous pouvez modifier vos préférences à tout moment dans vos paramètres.</li>
              <li><strong>Synchronisation cross-browser :</strong> Pour les utilisateurs connectés, vos préférences sont synchronisées sur tous vos appareils.</li>
            </ul>
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
              <strong>⚠️ Attention :</strong> La suppression ou le blocage des cookies essentiels peut 
              affecter le fonctionnement du site. Vous devrez vous reconnecter après avoir supprimé les cookies d'authentification.
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
              <li><strong>Cookies de consentement RGPD :</strong> 365 jours</li>
              <li><strong>Cookies de préférences :</strong> 1 an maximum</li>
              <li><strong>Cookies Stripe :</strong> Selon la politique Stripe (jusqu'à 2 ans)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Base légale</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Notre utilisation des cookies repose sur les bases légales suivantes conformément au RGPD :
            </p>
            <table className="w-full text-muted-foreground border-collapse mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Type de cookie</th>
                  <th className="text-left py-3 px-4">Base légale (RGPD Art. 6)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Authentification</td>
                  <td className="py-3 px-4">Exécution du contrat (Art. 6.1.b)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Sécurité (CSRF, rate limit)</td>
                  <td className="py-3 px-4">Intérêt légitime (Art. 6.1.f)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Consentement RGPD</td>
                  <td className="py-3 px-4">Obligation légale (Art. 6.1.c)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Paiements Stripe</td>
                  <td className="py-3 px-4">Exécution du contrat / Intérêt légitime (fraude)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Fonctionnels (thème, langue)</td>
                  <td className="py-3 px-4">Consentement (Art. 6.1.a)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Analytiques</td>
                  <td className="py-3 px-4">Consentement (Art. 6.1.a)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Vos droits RGPD</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants concernant vos données :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Droit d'accès :</strong> Savoir quelles données nous collectons</li>
              <li><strong>Droit de rectification :</strong> Corriger vos données</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format lisible</li>
              <li><strong>Droit de retirer votre consentement :</strong> À tout moment via la bannière de cookies</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@theforge.com" className="text-primary hover:underline">privacy@theforge.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Modifications de cette politique</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous pouvons mettre à jour cette politique pour refléter des changements dans nos pratiques 
              ou pour des raisons légales. En cas de modification significative, nous vous en informerons 
              via une notification sur le site. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Pour toute question concernant cette politique des cookies ou l'utilisation de vos données :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Email :</strong> <a href="mailto:privacy@theforge.com" className="text-primary hover:underline">privacy@theforge.com</a></li>
              <li><strong>Délégué à la Protection des Données (DPO) :</strong> <a href="mailto:dpo@theforge.com" className="text-primary hover:underline">dpo@theforge.com</a></li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Vous pouvez également introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : 
              <a href="https://www.cnil.fr" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CookiePolicy;
