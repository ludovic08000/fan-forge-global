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
        description="Lisez les Conditions Générales d'Utilisation de CreatorHub. Découvrez vos droits et obligations en tant qu'utilisateur de notre plateforme de créateurs de contenu."
        keywords="CGU, conditions utilisation, mentions légales, règlement, plateforme créateurs"
        url="https://creatorhub.com/terms"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme CreatorHub, 
              accessible à l'adresse [votre-domaine.com]. En accédant à notre plateforme, vous acceptez sans réserve 
              les présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Définitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Plateforme :</strong> Le site web et les services CreatorHub</li>
              <li><strong>Utilisateur :</strong> Toute personne accédant à la plateforme</li>
              <li><strong>Créateur :</strong> Utilisateur proposant du contenu sur la plateforme</li>
              <li><strong>Abonné :</strong> Utilisateur souscrivant à un abonnement auprès d'un Créateur</li>
              <li><strong>Contenu :</strong> Tout élément publié sur la plateforme (textes, images, vidéos, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Accès à la plateforme</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'accès à la plateforme est réservé aux personnes majeures (18 ans et plus). 
              En vous inscrivant, vous certifiez avoir l'âge légal requis.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La création d'un compte nécessite une adresse email valide. Vous êtes responsable 
              de la confidentialité de vos identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Services proposés</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub permet aux créateurs de :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Publier du contenu (photos, vidéos, lives)</li>
              <li>Proposer des abonnements payants</li>
              <li>Recevoir des pourboires</li>
              <li>Communiquer avec leurs abonnés via messagerie privée</li>
              <li>Vendre du contenu privé payant</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Obligations des Créateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les créateurs s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Publier uniquement du contenu dont ils détiennent les droits</li>
              <li>Respecter les lois en vigueur, notamment concernant le contenu pour adultes</li>
              <li>Ne pas publier de contenu illégal (mineurs, violence non consentie, etc.)</li>
              <li>Déclarer leurs revenus aux autorités fiscales compétentes</li>
              <li>Configurer correctement leur compte Stripe Connect pour recevoir les paiements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Obligations des Abonnés</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Les abonnés s'engagent à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Ne pas partager, copier ou distribuer le contenu des créateurs</li>
              <li>Respecter la vie privée et les droits des créateurs</li>
              <li>Ne pas contourner les mesures de protection du contenu</li>
              <li>Utiliser la plateforme de manière respectueuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Paiements et Commission</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les paiements sont traités via Stripe. La plateforme prélève une commission de <strong>15%</strong> 
              sur les revenus des créateurs (abonnements, contenu privé payant, revenus de lives).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les pourboires ne sont pas soumis à commission.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les créateurs peuvent demander le versement de leurs gains à tout moment, 
              sous réserve d'avoir configuré leur compte Stripe Connect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les créateurs conservent l'intégralité de leurs droits de propriété intellectuelle sur leur contenu. 
              En publiant sur CreatorHub, ils accordent à la plateforme une licence limitée pour héberger et 
              diffuser le contenu aux abonnés autorisés.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La marque CreatorHub, le logo et tous les éléments graphiques sont la propriété exclusive de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modération et Signalements</h2>
            <p className="text-muted-foreground leading-relaxed">
              Tout contenu illicite peut être signalé. L'équipe de modération examine les signalements 
              et peut supprimer le contenu et/ou suspendre les comptes en infraction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Résiliation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'utilisateur peut supprimer son compte à tout moment. La plateforme se réserve le droit 
              de suspendre ou supprimer tout compte en cas de violation des présentes CGU.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En cas de résiliation, les gains non versés seront transférés au créateur dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub ne peut être tenu responsable des contenus publiés par les utilisateurs. 
              La plateforme s'engage à faire ses meilleurs efforts pour assurer la disponibilité 
              du service mais ne garantit pas une disponibilité continue.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Droit applicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux 
              français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant ces CGU, vous pouvez nous contacter à : 
              <a href="mailto:contact@creatorhub.com" className="text-primary hover:underline ml-1">
                contact@creatorhub.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default TermsOfService;
