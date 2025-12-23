import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const LegalNotice = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background py-16">
      <SEOHead 
        title="Mentions Légales - CreatorHub"
        description="Mentions légales de CreatorHub. Informations sur l'éditeur, l'hébergeur, la propriété intellectuelle et les conditions d'utilisation du site de contenu pour adultes."
        keywords="mentions légales, éditeur site, hébergeur, propriété intellectuelle, informations légales, contenu adulte"
        url="https://crub.com/legal"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Mentions Légales</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-destructive">⚠️ AVERTISSEMENT - SITE RÉSERVÉ AUX ADULTES</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Ce site contient du contenu explicite à caractère sexuel réservé exclusivement aux personnes majeures (18 ans et plus).</strong><br /><br />
              En poursuivant votre navigation, vous certifiez avoir l'âge légal requis pour accéder à ce type de contenu 
              dans votre pays de résidence.<br /><br />
              <strong>L'accès à ce site est strictement interdit aux mineurs.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Éditeur du site</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le site CreatorHub (crub.com) est édité par :<br /><br />
              <strong>[Nom de la société]</strong><br />
              Forme juridique : [SAS / SARL / etc.]<br />
              Capital social : [Montant] €<br />
              RCS : [Ville] B [Numéro]<br />
              SIRET : [Numéro SIRET]<br />
              Numéro TVA intracommunautaire : FR [Numéro]<br /><br />
              <strong>Siège social :</strong><br />
              [Adresse complète]<br />
              [Code postal] [Ville]<br />
              France<br /><br />
              <strong>Contact :</strong><br />
              Téléphone : [Numéro]<br />
              Email : <a href="mailto:contact@crub.com" className="text-primary hover:underline">contact@crub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Directeur de la publication</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le directeur de la publication est : <strong>[Nom du dirigeant]</strong><br />
              En qualité de : [Fonction - ex: Président / Gérant]<br />
              Email : <a href="mailto:direction@crub.com" className="text-primary hover:underline">direction@crub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Hébergeur</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le site est hébergé par :<br /><br />
              <strong>Supabase Inc.</strong><br />
              970 Toa Payoh North #07-04<br />
              Singapore 318992<br />
              Site web : <a href="https://supabase.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Nature du site et contenu pour adultes</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub est une plateforme de monétisation de contenu pour adultes. 
              Le site permet aux créateurs de contenu pour adultes de proposer des abonnements 
              et du contenu payant à leurs abonnés majeurs.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Type de contenu hébergé :</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Contenu à caractère sexuel explicite</li>
              <li>Nudité intégrale</li>
              <li>Contenu érotique et sensuel</li>
              <li>Lives pour adultes</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>L'accès à ce contenu est strictement réservé aux personnes majeures (18 ans et plus).</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Vérification d'âge</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément aux obligations légales relatives aux sites pour adultes :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Une vérification d'âge est effectuée à l'entrée du site</li>
              <li>L'utilisateur doit certifier sa majorité pour accéder au contenu</li>
              <li>Des vérifications complémentaires peuvent être demandées</li>
              <li>Les créateurs doivent prouver leur majorité lors de l'inscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prestataire de paiement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements sont traités par :<br /><br />
              <strong>Stripe Payments Europe, Ltd.</strong><br />
              1 Grand Canal Street Lower, Grand Canal Dock<br />
              Dublin, D02 H210, Irlande<br />
              Site web : <a href="https://stripe.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://stripe.com</a><br /><br />
              Stripe est un prestataire de paiement agréé, conforme aux normes PCI-DSS pour la sécurité des paiements.
              Les transactions sont sécurisées par chiffrement SSL/TLS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'ensemble du contenu de ce site (structure, textes, logos, images, éléments graphiques, 
              charte graphique, base de données, logiciels) est la propriété exclusive de [Nom de la société] 
              ou fait l'objet d'une autorisation d'utilisation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
              des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf 
              autorisation écrite préalable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contenu généré par les utilisateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub est une plateforme permettant aux utilisateurs majeurs de publier du contenu pour adultes. 
              Les créateurs sont seuls responsables du contenu qu'ils publient et doivent :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Être majeurs (18 ans minimum)</li>
              <li>Détenir tous les droits sur le contenu publié</li>
              <li>S'assurer que toute personne figurant dans le contenu est majeure et consentante</li>
              <li>Conserver les preuves de consentement et de majorité</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Conformément à la loi pour la confiance dans l'économie numérique (LCEN), 
              CreatorHub agit en qualité d'hébergeur et n'est pas responsable a priori du contenu 
              publié par les utilisateurs, sous réserve de retirer promptement tout contenu 
              manifestement illicite qui lui serait signalé.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contenu strictement interdit</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Les contenus suivants sont <strong>strictement interdits</strong> sur la plateforme :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Tout contenu impliquant des mineurs</strong> (tolérance zéro absolue)</li>
              <li>Violence, torture, abus non consentis</li>
              <li>Zoophilie et bestialité</li>
              <li>Incitation à la haine ou discrimination</li>
              <li>Revenge porn ou contenu non consenti</li>
              <li>Prostitution, escorting, trafic d'êtres humains</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Tout contenu illégal sera immédiatement supprimé et signalé aux autorités compétentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Signalement de contenu illicite</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément à l'article 6-I-5 de la LCEN, vous pouvez nous signaler tout contenu 
              manifestement illicite en nous contactant à :
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Email prioritaire :</strong> <a href="mailto:abuse@crub.com" className="text-primary hover:underline">abuse@crub.com</a><br /><br />
              Votre signalement doit contenir :<br />
              - Vos coordonnées complètes<br />
              - La description du contenu litigieux et sa localisation précise (URL)<br />
              - Les motifs pour lesquels ce contenu doit être retiré<br />
              - Une copie de la correspondance avec l'auteur (si applicable)<br /><br />
              <strong>Les signalements concernant des mineurs sont traités en priorité absolue.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Données personnelles</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement des données personnelles est détaillé dans notre 
              <a href="/privacy" className="text-primary hover:underline ml-1">Politique de Confidentialité</a>.
              <br /><br />
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression 
              de vos données. Pour exercer ces droits, contactez notre DPO : 
              <a href="mailto:dpo@crub.com" className="text-primary hover:underline ml-1">dpo@crub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ce site utilise des cookies essentiels au fonctionnement du service. 
              Pour en savoir plus sur leur utilisation et les gérer, 
              consultez notre <a href="/cookies" className="text-primary hover:underline">Politique des Cookies</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              [Nom de la société] ne pourra être tenue responsable des dommages directs ou indirects 
              résultant de l'utilisation du site ou de l'impossibilité de l'utiliser.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              [Nom de la société] ne garantit pas l'exactitude, la précision ou l'exhaustivité des 
              informations mises à disposition sur ce site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Droit applicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes mentions légales sont soumises au droit français. 
              En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Médiation de la consommation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, 
              en cas de litige non résolu, vous pouvez recourir gratuitement au service 
              de médiation de la consommation :<br /><br />
              <strong>[Nom du médiateur]</strong><br />
              [Adresse du médiateur]<br />
              Site web : [URL du médiateur]
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Crédits</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conception et développement : CreatorHub<br />
              Icônes : Lucide React<br />
              Hébergement : Supabase / Lovable<br />
              Paiements : Stripe
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LegalNotice;
