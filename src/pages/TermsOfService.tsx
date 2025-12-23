import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Conditions Générales d'Utilisation (CGU) - CreatorHub"
        description="Lisez les Conditions Générales d'Utilisation de CreatorHub. Découvrez vos droits et obligations en tant qu'utilisateur de notre plateforme de créateurs de contenu pour adultes."
        keywords="CGU, conditions utilisation, mentions légales, règlement, plateforme créateurs, contenu adulte"
        url="https://crub.com/terms"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-destructive">⚠️ AVERTISSEMENT - CONTENU POUR ADULTES</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Ce site contient du contenu explicite réservé exclusivement aux personnes majeures (18 ans et plus).</strong><br /><br />
              En accédant à ce site, vous certifiez sur l'honneur avoir l'âge légal requis dans votre pays de résidence 
              pour consulter du contenu pour adultes. L'accès à ce site est strictement interdit aux mineurs.<br /><br />
              <strong>Si vous êtes mineur, quittez immédiatement ce site.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Objet et acceptation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme CreatorHub, 
              accessible à l'adresse crub.com. CreatorHub est une plateforme de monétisation de contenu pour adultes 
              permettant aux créateurs de proposer des abonnements et du contenu payant à leurs abonnés.<br /><br />
              <strong>En accédant à notre plateforme, vous acceptez sans réserve les présentes conditions et certifiez :</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Être majeur(e) selon la législation de votre pays (minimum 18 ans)</li>
              <li>Ne pas être choqué(e) par du contenu explicite pour adultes</li>
              <li>Accéder à ce site depuis un lieu où le contenu pour adultes est légal</li>
              <li>Ne pas diffuser ce contenu à des mineurs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Définitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Plateforme :</strong> Le site web et les services CreatorHub (crub.com)</li>
              <li><strong>Utilisateur :</strong> Toute personne majeure accédant à la plateforme</li>
              <li><strong>Créateur :</strong> Utilisateur majeur proposant du contenu pour adultes sur la plateforme</li>
              <li><strong>Abonné :</strong> Utilisateur majeur souscrivant à un abonnement auprès d'un Créateur</li>
              <li><strong>Contenu :</strong> Tout élément publié sur la plateforme (textes, images, vidéos pour adultes)</li>
              <li><strong>Contenu pour adultes :</strong> Contenu à caractère sexuel explicite réservé aux personnes majeures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Conditions d'accès et vérification d'âge</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>L'accès à la plateforme est strictement réservé aux personnes majeures (18 ans et plus).</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              En vous inscrivant et à chaque connexion, vous certifiez sur l'honneur :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Avoir au minimum 18 ans révolus</li>
              <li>Avoir l'âge légal pour consulter du contenu pour adultes dans votre pays</li>
              <li>Agir en votre nom propre et non pour le compte d'un tiers</li>
              <li>Fournir des informations exactes concernant votre identité et votre âge</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              CreatorHub se réserve le droit de demander une vérification d'identité à tout moment et de 
              suspendre immédiatement tout compte en cas de doute sur l'âge de l'utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Nature du contenu</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub est une plateforme dédiée au contenu pour adultes. Le contenu publié peut inclure :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nudité intégrale</li>
              <li>Contenu à caractère sexuel explicite</li>
              <li>Contenu érotique et sensuel</li>
              <li>Lives pour adultes</li>
              <li>Messages et médias privés à caractère adulte</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Ce contenu est strictement réservé aux personnes majeures et consentantes.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contenu strictement interdit</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les contenus suivants sont <strong>strictement interdits</strong> et entraîneront la 
              suspension immédiate du compte et un signalement aux autorités compétentes :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contenu impliquant des mineurs</strong> (tolérance zéro)</li>
              <li>Violence non consentie, torture, abus</li>
              <li>Contenu zoophile ou bestialité</li>
              <li>Contenu scatologique extrême</li>
              <li>Incitation à la haine ou discrimination</li>
              <li>Contenu représentant des actes illégaux</li>
              <li>Revenge porn ou contenu non consenti</li>
              <li>Usurpation d'identité ou deepfakes non consentis</li>
              <li>Prostitution ou escorting</li>
              <li>Trafic d'êtres humains</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Obligations des Créateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les créateurs s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Être majeur(e) (18 ans minimum)</strong> et pouvoir le prouver sur demande</li>
              <li>Conserver les preuves de consentement et de majorité de toute personne apparaissant dans le contenu</li>
              <li>Publier uniquement du contenu dont ils détiennent tous les droits</li>
              <li>S'assurer que toutes les personnes figurant dans le contenu sont majeures et consentantes</li>
              <li>Ne publier aucun contenu impliquant des mineurs, même suggéré</li>
              <li>Respecter scrupuleusement les lois en vigueur concernant le contenu pour adultes</li>
              <li>Déclarer leurs revenus aux autorités fiscales compétentes</li>
              <li>Configurer correctement leur compte Stripe Connect pour recevoir les paiements</li>
              <li>Répondre à toute demande de vérification dans les 48 heures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Obligations des Abonnés</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les abonnés s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Être majeur(e) (18 ans minimum)</strong></li>
              <li><strong>Ne jamais partager, copier ou distribuer le contenu</strong> des créateurs</li>
              <li>Ne pas capturer, enregistrer ou télécharger le contenu</li>
              <li>Respecter la vie privée et les droits des créateurs</li>
              <li>Ne pas contourner les mesures de protection du contenu (watermarks, etc.)</li>
              <li>Ne pas diffuser le contenu à des mineurs</li>
              <li>Utiliser la plateforme de manière respectueuse</li>
              <li>Ne pas harceler les créateurs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Consentement et droits des performeurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub exige le respect strict des droits de toutes les personnes apparaissant dans le contenu :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Tout contenu doit être créé avec le consentement éclairé de toutes les parties</li>
              <li>Les créateurs doivent conserver des preuves de consentement écrit</li>
              <li>Les créateurs doivent conserver des preuves de majorité (copie de pièce d'identité)</li>
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
            <h2 className="text-2xl font-semibold mb-4">11. Protection du contenu</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub met en place des mesures de protection du contenu :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Filigrane (watermark) invisible sur les contenus</li>
              <li>Traçabilité des téléchargements et captures</li>
              <li>Système de signalement des fuites</li>
              <li>Suspension des comptes en cas de partage non autorisé</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Tout partage non autorisé de contenu entraînera la suspension immédiate du compte 
              et pourra faire l'objet de poursuites judiciaires.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les créateurs conservent l'intégralité de leurs droits de propriété intellectuelle sur leur contenu. 
              En publiant sur CreatorHub, ils accordent à la plateforme une licence limitée et non exclusive pour 
              héberger et diffuser le contenu aux abonnés autorisés.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La marque CreatorHub, le logo et tous les éléments graphiques sont la propriété exclusive de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Modération et Signalements</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub dispose d'une équipe de modération active :
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
              <li>Suspicion de minorité</li>
              <li>Fraude ou tentative de fraude</li>
              <li>Harcèlement d'autres utilisateurs</li>
              <li>Partage non autorisé de contenu</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              En cas de résiliation normale, les gains non versés seront transférés au créateur dans un délai de 30 jours.
              En cas de suspension pour violation, les gains peuvent être retenus.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub agit en qualité d'hébergeur au sens de la LCEN et ne peut être tenu responsable 
              des contenus publiés par les utilisateurs. La plateforme s'engage à retirer promptement 
              tout contenu manifestement illicite qui lui serait signalé.<br /><br />
              CreatorHub ne garantit pas une disponibilité continue du service et ne pourra être tenu 
              responsable des interruptions temporaires.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent 
              à rechercher une solution amiable. À défaut, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Modifications des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub se réserve le droit de modifier les présentes CGU à tout moment. 
              Les utilisateurs seront informés par email et notification sur la plateforme. 
              La continuation de l'utilisation vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant ces CGU :<br />
              Email : <a href="mailto:contact@crub.com" className="text-primary hover:underline">contact@crub.com</a><br />
              Signalement de contenu illicite : <a href="mailto:abuse@crub.com" className="text-primary hover:underline">abuse@crub.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default TermsOfService;
