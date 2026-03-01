import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Conditions Générales d'Utilisation (CGU) - TheForge"
        description="Lisez les Conditions Générales d'Utilisation de TheForge. Découvrez vos droits et obligations en tant qu'utilisateur de notre plateforme de créateurs de contenu."
        keywords="CGU, conditions utilisation, mentions légales, règlement, plateforme créateurs"
        url="https://crub.com/terms"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-primary">📋 RÉSUMÉ DES CONDITIONS</h2>
            <p className="text-muted-foreground leading-relaxed">
              TheForge est une plateforme de monétisation de contenu permettant aux créateurs de proposer des abonnements 
              et du contenu payant à leur communauté. En utilisant notre plateforme, vous acceptez de respecter 
              nos règles et la législation française et européenne en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Objet et acceptation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme TheForge, 
              accessible à l'adresse theforge.fr. TheForge est une plateforme de monétisation de contenu 
              permettant aux créateurs de proposer des abonnements et du contenu payant à leurs abonnés.<br /><br />
              <strong>En accédant à notre plateforme, vous acceptez sans réserve les présentes conditions et certifiez :</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Avoir la capacité juridique de conclure un contrat</li>
              <li>Fournir des informations exactes concernant votre identité</li>
              <li>Respecter les lois en vigueur dans votre pays de résidence</li>
              <li>Ne pas utiliser la plateforme à des fins illégales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Définitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Plateforme :</strong> Le site web et les services TheForge (theforge.fr)</li>
              <li><strong>Utilisateur :</strong> Toute personne accédant à la plateforme</li>
              <li><strong>Créateur :</strong> Utilisateur proposant du contenu sur la plateforme</li>
              <li><strong>Abonné :</strong> Utilisateur souscrivant à un abonnement auprès d'un Créateur</li>
              <li><strong>Contenu :</strong> Tout élément publié sur la plateforme (textes, images, vidéos)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Conditions d'accès</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'inscription sur la plateforme est gratuite et ouverte à tous.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              En vous inscrivant, vous vous engagez à :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fournir des informations exactes et à jour</li>
              <li>Protéger la confidentialité de vos identifiants de connexion</li>
              <li>Signaler immédiatement toute utilisation non autorisée de votre compte</li>
              <li>Ne pas créer plusieurs comptes pour la même personne</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              TheForge se réserve le droit de demander une vérification d'identité à tout moment et de 
              suspendre tout compte en cas de non-respect des conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Nature du contenu</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TheForge est une plateforme permettant aux créateurs de partager différents types de contenus :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Photos et images</li>
              <li>Vidéos</li>
              <li>Lives et diffusions en direct</li>
              <li>Messages privés et contenus exclusifs</li>
              <li>Tout autre format de création numérique</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contenu strictement interdit</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les contenus suivants sont <strong>strictement interdits</strong> et entraîneront la 
              suspension immédiate du compte et un signalement aux autorités compétentes :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contenu impliquant des mineurs</strong> (tolérance zéro)</li>
              <li>Violence, torture, abus</li>
              <li>Contenu zoophile</li>
              <li>Incitation à la haine ou discrimination</li>
              <li>Contenu représentant des actes illégaux</li>
              <li>Contenu non consenti ou revenge porn</li>
              <li>Usurpation d'identité ou deepfakes non consentis</li>
              <li>Activités illégales</li>
              <li>Trafic d'êtres humains</li>
              <li>Contenu violant les droits d'auteur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Obligations des Créateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les créateurs s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Publier uniquement du contenu dont ils détiennent tous les droits</li>
              <li>S'assurer que toutes les personnes figurant dans le contenu sont consentantes</li>
              <li>Respecter scrupuleusement les lois en vigueur</li>
              <li>Déclarer leurs revenus aux autorités fiscales compétentes</li>
              <li>Configurer correctement leur compte Stripe Connect pour recevoir les paiements</li>
              <li>Répondre à toute demande de vérification dans les 48 heures</li>
              <li>Ne pas publier de contenu trompeur ou mensonger</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Obligations des Abonnés</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les abonnés s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Ne jamais partager, copier ou distribuer le contenu</strong> des créateurs</li>
              <li>Ne pas capturer, enregistrer ou télécharger le contenu sans autorisation</li>
              <li>Respecter la vie privée et les droits des créateurs</li>
              <li>Ne pas contourner les mesures de protection du contenu (watermarks, etc.)</li>
              <li>Utiliser la plateforme de manière respectueuse</li>
              <li>Ne pas harceler les créateurs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Consentement et droits des participants</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TheForge exige le respect strict des droits de toutes les personnes apparaissant dans le contenu :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Tout contenu doit être créé avec le consentement éclairé de toutes les parties</li>
              <li>Les créateurs doivent conserver des preuves de consentement écrit</li>
              <li>Ces documents doivent être conservés pendant toute la durée de publication + 5 ans</li>
              <li>Ils doivent être fournis sur demande de la plateforme ou des autorités</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Paiements, Commission et Stripe</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les paiements sont traités exclusivement via <strong>Stripe</strong>, un prestataire de paiement sécurisé.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>La plateforme prélève une commission de <strong>15%</strong> sur les revenus des créateurs</li>
              <li>Cette commission s'applique aux abonnements, contenus privés payants et revenus de lives</li>
              <li>Les pourboires ne sont pas soumis à commission</li>
              <li>Les créateurs doivent configurer leur compte Stripe Connect pour recevoir les paiements</li>
              <li>Tous les paiements sont sécurisés et conformes aux normes PCI-DSS</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              En utilisant nos services de paiement, vous acceptez également les 
              <a href="https://stripe.com/fr/legal" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                Conditions d'utilisation de Stripe
              </a> et la 
              <a href="https://stripe.com/fr/privacy" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                Politique de confidentialité de Stripe
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Politique de remboursement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément à la nature du contenu numérique :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Les abonnements sont renouvelés automatiquement sauf annulation</li>
              <li>L'annulation prend effet à la fin de la période en cours</li>
              <li>Aucun remboursement n'est accordé pour les périodes déjà consommées</li>
              <li>Le contenu privé payant n'est pas remboursable une fois accédé</li>
              <li>En cas de fraude avérée, un remboursement peut être accordé</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Protection du contenu et Technologies de sécurité</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TheForge déploie un arsenal complet de technologies de protection pour sécuriser le contenu des créateurs et les données des utilisateurs :
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">11.1 Protection anti-capture et anti-copie</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Blocage des raccourcis clavier</strong> : Interception des combinaisons PrintScreen, Ctrl+S, Ctrl+P, Ctrl+Shift+S</li>
              <li><strong>Protection du menu contextuel</strong> : Désactivation du clic droit sur les médias protégés</li>
              <li><strong>Anti-glisser-déposer</strong> : Prévention du drag-and-drop sur les images et vidéos</li>
              <li><strong>Overlay invisible</strong> : Couche de protection empêchant l'interaction directe avec les médias</li>
              <li><strong>Désactivation de la sélection</strong> : Impossibilité de sélectionner ou copier les contenus protégés</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.2 Filigranes et traçabilité</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Filigrane forensique invisible</strong> : Watermark unique encodant l'identifiant utilisateur et l'horodatage</li>
              <li><strong>Identifiant court unique</strong> : Hash cryptographique permettant d'identifier la source de toute fuite</li>
              <li><strong>Filigrane visible optionnel</strong> : Possibilité d'afficher un watermark textuel sur les contenus</li>
              <li><strong>Multi-positionnement</strong> : Filigranes placés à différents endroits pour résister aux tentatives de suppression</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.3 Analyse antivirus et sécurité des fichiers</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Scan antivirus automatique</strong> : Tous les fichiers uploadés sont analysés avant publication</li>
              <li><strong>Détection multi-moteurs</strong> : Analyse par plusieurs moteurs antivirus simultanés</li>
              <li><strong>Blocage des fichiers infectés</strong> : Les fichiers contenant des menaces sont automatiquement rejetés</li>
              <li><strong>Validation des types de fichiers</strong> : Vérification stricte des formats autorisés</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.4 Protection des comptes et authentification</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Protection anti brute-force</strong> : Blocage automatique après plusieurs tentatives échouées</li>
              <li><strong>Détection par IP</strong> : Surveillance des tentatives suspectes par adresse IP</li>
              <li><strong>Jetons CSRF</strong> : Protection contre les attaques Cross-Site Request Forgery</li>
              <li><strong>Authentification à deux facteurs (2FA)</strong> : Option de sécurité renforcée disponible</li>
              <li><strong>Sessions sécurisées</strong> : Gestion des sessions avec expiration automatique</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.5 Sécurité des données et URLs</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>URLs signées temporaires</strong> : Les liens vers les médias expirent après un délai défini</li>
              <li><strong>Chiffrement des données</strong> : Transmission sécurisée via HTTPS/TLS</li>
              <li><strong>Row Level Security (RLS)</strong> : Politiques de sécurité au niveau de la base de données</li>
              <li><strong>Rate limiting</strong> : Limitation du nombre de requêtes pour prévenir les abus</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.6 Détection et réponse aux fuites</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Système de signalement</strong> : Interface dédiée pour reporter les fuites de contenu</li>
              <li><strong>Décodage des watermarks</strong> : Capacité d'identifier l'utilisateur source via le filigrane</li>
              <li><strong>Suspension automatique</strong> : Les utilisateurs identifiés comme source de fuites sont suspendus</li>
              <li><strong>Actions légales</strong> : Conservation des preuves pour d'éventuelles poursuites judiciaires</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed mt-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <strong>⚠️ AVERTISSEMENT :</strong> Tout partage non autorisé de contenu entraînera la suspension immédiate du compte. 
              Grâce à notre système de filigrane forensique, nous sommes en mesure d'identifier la source de toute fuite et de prendre 
              les mesures légales appropriées.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les créateurs conservent l'intégralité de leurs droits de propriété intellectuelle sur leur contenu. 
              En publiant sur TheForge, ils accordent à la plateforme une licence limitée et non exclusive pour 
              héberger et diffuser le contenu aux abonnés autorisés.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La marque TheForge, le logo et tous les éléments graphiques sont la propriété exclusive de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Modération et Signalements</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TheForge dispose d'une équipe de modération active :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Tout contenu illicite peut être signalé via le bouton dédié</li>
              <li>Les signalements sont traités sous 24 heures</li>
              <li>Le contenu illégal est supprimé immédiatement</li>
              <li>Les infractions graves sont signalées aux autorités</li>
              <li>Les comptes en infraction sont suspendus sans préavis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Résiliation et suspension</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'utilisateur peut supprimer son compte à tout moment. La plateforme se réserve le droit 
              de suspendre ou supprimer tout compte en cas de :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violation des présentes CGU</li>
              <li>Publication de contenu illégal</li>
              <li>Fraude ou tentative de fraude</li>
              <li>Harcèlement d'autres utilisateurs</li>
              <li>Partage non autorisé de contenu</li>
              <li>Usurpation d'identité</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              En cas de résiliation normale, les gains non versés seront transférés au créateur dans un délai de 30 jours.
              En cas de suspension pour violation, les gains peuvent être retenus.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              TheForge agit en qualité d'hébergeur au sens de la LCEN et ne peut être tenu responsable 
              des contenus publiés par les utilisateurs. La plateforme s'engage à retirer promptement 
              tout contenu manifestement illicite qui lui serait signalé.<br /><br />
              TheForge ne garantit pas une disponibilité continue du service et ne pourra être tenu 
              responsable des interruptions temporaires.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Conformité RGPD</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément au Règlement Général sur la Protection des Données (RGPD) :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Vos données personnelles sont protégées et traitées de manière transparente</li>
              <li>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données</li>
              <li>Vous pouvez exercer votre droit à la portabilité des données</li>
              <li>Consultez notre <a href="/privacy" className="text-primary hover:underline">Politique de Confidentialité</a> pour plus de détails</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont soumises au droit français et au droit de l'Union Européenne. 
              En cas de litige, les parties s'engagent à rechercher une solution amiable. 
              À défaut, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Modifications des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              TheForge se réserve le droit de modifier les présentes CGU à tout moment. 
              Les utilisateurs seront informés par email et notification sur la plateforme. 
              La continuation de l'utilisation vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">19. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant ces CGU :<br />
              Email : <a href="mailto:contact@theforge.com" className="text-primary hover:underline">contact@theforge.com</a><br />
              Signalement de contenu illicite : <a href="mailto:abuse@theforge.com" className="text-primary hover:underline">abuse@theforge.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default TermsOfService;
