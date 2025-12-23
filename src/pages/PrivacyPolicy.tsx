import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Politique de Confidentialité RGPD - CreatorHub"
        description="Politique de confidentialité de CreatorHub conforme au RGPD. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles sur notre plateforme de contenu pour adultes."
        keywords="politique confidentialité, RGPD, protection données, vie privée, données personnelles, contenu adulte"
        url="https://crub.com/privacy"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-destructive">⚠️ SITE RÉSERVÉ AUX ADULTES</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub est une plateforme de contenu pour adultes. Cette politique de confidentialité 
              s'applique uniquement aux utilisateurs majeurs (18 ans et plus). 
              <strong> Les mineurs ne sont pas autorisés à utiliser nos services.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub s'engage à protéger la vie privée de ses utilisateurs conformément au 
              Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.<br /><br />
              Cette politique décrit comment nous collectons, utilisons et protégeons vos données personnelles 
              dans le cadre de notre plateforme de contenu pour adultes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Responsable du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le responsable du traitement des données est :<br />
              <strong>[Nom de votre société]</strong><br />
              [Adresse]<br />
              [Code postal, Ville]<br />
              Email : <a href="mailto:dpo@crub.com" className="text-primary hover:underline">dpo@crub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Nous collectons les données suivantes :</p>
            
            <h3 className="text-xl font-medium mb-3 mt-6">3.1 Données d'identification et de vérification d'âge</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nom d'utilisateur / Pseudo</li>
              <li>Adresse email</li>
              <li><strong>Date de naissance (obligatoire pour vérification de la majorité)</strong></li>
              <li>Photo de profil (optionnel)</li>
              <li>Pièce d'identité (pour les créateurs, à des fins de vérification)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Données financières (pour les créateurs)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Informations Stripe Connect (traitées par Stripe)</li>
              <li>Historique des transactions et revenus</li>
              <li>Coordonnées bancaires (IBAN) pour les virements</li>
              <li>Informations fiscales si requises (numéro de TVA, etc.)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 Données techniques et de sécurité</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Adresse IP</li>
              <li>Type de navigateur et appareil</li>
              <li>Logs de connexion (date, heure, IP)</li>
              <li>Données de watermark pour la protection du contenu</li>
              <li>Cookies essentiels</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.4 Données d'utilisation</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Contenu publié par les créateurs</li>
              <li>Historique d'abonnements</li>
              <li>Messages privés entre utilisateurs</li>
              <li>Interactions avec la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Finalités du traitement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Vos données sont traitées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Vérification de l'âge :</strong> S'assurer que tous les utilisateurs sont majeurs (obligation légale)</li>
              <li><strong>Exécution du contrat :</strong> Fourniture des services, gestion des comptes, traitement des paiements</li>
              <li><strong>Sécurité et modération :</strong> Protection contre la fraude, modération du contenu, protection des créateurs</li>
              <li><strong>Intérêt légitime :</strong> Amélioration des services, statistiques agrégées</li>
              <li><strong>Obligation légale :</strong> Conservation des données de transaction, réponse aux réquisitions judiciaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Base légale du traitement</h2>
            <table className="w-full text-muted-foreground border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Traitement</th>
                  <th className="text-left py-3 px-4">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Vérification de l'âge</td>
                  <td className="py-3 px-4"><strong>Obligation légale</strong></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Création de compte</td>
                  <td className="py-3 px-4">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Paiements et facturation</td>
                  <td className="py-3 px-4">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Protection du contenu (watermark)</td>
                  <td className="py-3 px-4">Intérêt légitime</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Modération et sécurité</td>
                  <td className="py-3 px-4">Intérêt légitime / Obligation légale</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Conservation données fiscales</td>
                  <td className="py-3 px-4">Obligation légale</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Destinataires des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Vos données peuvent être partagées avec :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Stripe :</strong> Traitement sécurisé des paiements (conforme PCI-DSS)</li>
              <li><strong>Supabase :</strong> Hébergement sécurisé des données</li>
              <li><strong>Autorités judiciaires :</strong> En cas d'obligation légale ou de réquisition</li>
              <li><strong>Forces de l'ordre :</strong> En cas de signalement de contenu illégal</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Durée de conservation</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Données de compte :</strong> Durée de l'utilisation + 3 ans après suppression</li>
              <li><strong>Données de vérification d'âge :</strong> Durée de l'utilisation + 1 an</li>
              <li><strong>Données de transaction :</strong> 10 ans (obligation comptable et fiscale)</li>
              <li><strong>Logs de connexion :</strong> 1 an (obligation légale LCEN)</li>
              <li><strong>Messages privés :</strong> Durée de l'utilisation du compte</li>
              <li><strong>Données de watermark :</strong> Durée de publication du contenu + 5 ans</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Vos droits (RGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données (sauf obligations légales)</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : 
              <a href="mailto:dpo@crub.com" className="text-primary hover:underline ml-1">dpo@crub.com</a><br /><br />
              <strong>Note :</strong> Certaines données ne peuvent être supprimées en raison d'obligations légales 
              (données fiscales, logs de connexion).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Sécurité des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Chiffrement SSL/TLS pour toutes les communications</li>
              <li>Chiffrement des données sensibles au repos</li>
              <li>Authentification à deux facteurs disponible</li>
              <li>Accès restreint aux données (principe du moindre privilège)</li>
              <li>Audits de sécurité réguliers</li>
              <li>Protection contre les attaques par force brute</li>
              <li>Watermarking invisible pour la protection du contenu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Transferts internationaux</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont principalement hébergées dans l'Union Européenne. En cas de transfert hors UE 
              (par exemple vers les serveurs de Stripe aux États-Unis), nous nous assurons que des garanties 
              appropriées sont en place (clauses contractuelles types, certification Privacy Shield remplacée 
              par le Data Privacy Framework).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous utilisons uniquement des cookies essentiels au fonctionnement du site :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Cookies de session (authentification)</li>
              <li>Cookies de préférences (thème, langue)</li>
              <li>Cookies de sécurité (CSRF, protection)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Consultez notre <a href="/cookies" className="text-primary hover:underline">Politique des Cookies</a> 
              pour plus d'informations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Protection des mineurs</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Notre plateforme est strictement interdite aux mineurs.</strong><br /><br />
              Nous ne collectons pas sciemment de données de personnes mineures. 
              Si nous découvrons qu'un utilisateur est mineur, son compte sera immédiatement 
              suspendu et ses données supprimées.<br /><br />
              Si vous êtes parent ou tuteur et pensez qu'un mineur a créé un compte, 
              contactez-nous immédiatement à <a href="mailto:abuse@crub.com" className="text-primary hover:underline">abuse@crub.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Réclamations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez :<br /><br />
              1. Nous contacter à <a href="mailto:dpo@crub.com" className="text-primary hover:underline">dpo@crub.com</a><br /><br />
              2. Déposer une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : 
              <a href="https://www.cnil.fr" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                www.cnil.fr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous nous réservons le droit de modifier cette politique. Toute modification 
              significative sera notifiée par email et sur la plateforme au moins 30 jours avant 
              son entrée en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact DPO</h2>
            <p className="text-muted-foreground leading-relaxed">
              Délégué à la Protection des Données :<br />
              Email : <a href="mailto:dpo@crub.com" className="text-primary hover:underline">dpo@crub.com</a><br /><br />
              Signalement de contenu illicite :<br />
              Email : <a href="mailto:abuse@crub.com" className="text-primary hover:underline">abuse@crub.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
