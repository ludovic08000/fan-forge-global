import { useEffect } from "react";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub s'engage à protéger la vie privée de ses utilisateurs conformément au 
              Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              Cette politique décrit comment nous collectons, utilisons et protégeons vos données personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Responsable du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le responsable du traitement des données est :<br />
              <strong>[Nom de votre société]</strong><br />
              [Adresse]<br />
              [Code postal, Ville]<br />
              Email : <a href="mailto:dpo@creatorhub.com" className="text-primary hover:underline">dpo@creatorhub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Nous collectons les données suivantes :</p>
            
            <h3 className="text-xl font-medium mb-3 mt-6">3.1 Données d'identification</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nom d'utilisateur</li>
              <li>Adresse email</li>
              <li>Date de naissance (pour vérification de l'âge)</li>
              <li>Photo de profil (optionnel)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Données financières (pour les créateurs)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Informations Stripe Connect</li>
              <li>Historique des transactions</li>
              <li>Informations fiscales si requises</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 Données techniques</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Adresse IP</li>
              <li>Type de navigateur et appareil</li>
              <li>Logs de connexion</li>
              <li>Cookies (voir notre politique des cookies)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.4 Données d'utilisation</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Contenu publié</li>
              <li>Historique d'abonnements</li>
              <li>Messages privés</li>
              <li>Interactions avec la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Finalités du traitement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Vos données sont traitées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Exécution du contrat :</strong> Fourniture des services, gestion des comptes, traitement des paiements</li>
              <li><strong>Intérêt légitime :</strong> Amélioration des services, sécurité, prévention de la fraude</li>
              <li><strong>Obligation légale :</strong> Vérification de l'âge, conservation des données de transaction</li>
              <li><strong>Consentement :</strong> Envoi de communications marketing (si vous y avez consenti)</li>
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
                  <td className="py-3 px-4">Création de compte</td>
                  <td className="py-3 px-4">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Paiements</td>
                  <td className="py-3 px-4">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Vérification d'âge</td>
                  <td className="py-3 px-4">Obligation légale</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Sécurité</td>
                  <td className="py-3 px-4">Intérêt légitime</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">Marketing</td>
                  <td className="py-3 px-4">Consentement</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Destinataires des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Vos données peuvent être partagées avec :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Stripe :</strong> Traitement des paiements</li>
              <li><strong>Supabase :</strong> Hébergement des données</li>
              <li><strong>Autorités :</strong> En cas d'obligation légale</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Nous ne vendons jamais vos données personnelles à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Durée de conservation</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Données de compte :</strong> Durée de l'utilisation + 3 ans après suppression</li>
              <li><strong>Données de transaction :</strong> 10 ans (obligation comptable)</li>
              <li><strong>Logs de connexion :</strong> 1 an</li>
              <li><strong>Messages privés :</strong> Durée de l'utilisation du compte</li>
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
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
              <li><strong>Droit de retrait du consentement :</strong> Retirer votre consentement à tout moment</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : 
              <a href="mailto:dpo@creatorhub.com" className="text-primary hover:underline ml-1">dpo@creatorhub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Sécurité des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour 
              protéger vos données : chiffrement SSL/TLS, authentification à deux facteurs disponible, 
              accès restreint aux données, audits de sécurité réguliers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Transferts internationaux</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont hébergées dans l'Union Européenne. En cas de transfert hors UE, 
              nous nous assurons que des garanties appropriées sont en place (clauses contractuelles types, 
              décisions d'adéquation).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous utilisons des cookies essentiels au fonctionnement du site et des cookies 
              analytiques (avec votre consentement). Consultez notre 
              <a href="/cookies" className="text-primary hover:underline ml-1">Politique des Cookies</a> 
              pour plus d'informations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Réclamations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation 
              auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : 
              <a href="https://www.cnil.fr" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                www.cnil.fr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous nous réservons le droit de modifier cette politique. Toute modification 
              sera notifiée par email et sur la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact DPO</h2>
            <p className="text-muted-foreground leading-relaxed">
              Délégué à la Protection des Données :<br />
              Email : <a href="mailto:dpo@creatorhub.com" className="text-primary hover:underline">dpo@creatorhub.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
