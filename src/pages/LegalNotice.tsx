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
        description="Mentions légales de CreatorHub. Informations sur l'éditeur, l'hébergeur, la propriété intellectuelle et les conditions d'utilisation du site."
        keywords="mentions légales, éditeur site, hébergeur, propriété intellectuelle, informations légales"
        url="https://creatorhub.com/legal"
        noindex={false}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Mentions Légales</h1>
        <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Éditeur du site</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le site CreatorHub est édité par :<br /><br />
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
              Email : <a href="mailto:contact@creatorhub.com" className="text-primary hover:underline">contact@creatorhub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Directeur de la publication</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le directeur de la publication est : <strong>[Nom du dirigeant]</strong><br />
              En qualité de : [Fonction - ex: Président / Gérant]
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
            <h2 className="text-2xl font-semibold mb-4">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              L'ensemble du contenu de ce site (structure, textes, logos, images, éléments graphiques, 
              charte graphique, base de données, logiciels) est la propriété exclusive de [Nom de la société] 
              ou fait l'objet d'une autorisation d'utilisation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
              des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf 
              autorisation écrite préalable de [Nom de la société].
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contenu généré par les utilisateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CreatorHub est une plateforme permettant aux utilisateurs de publier du contenu. 
              Les créateurs sont seuls responsables du contenu qu'ils publient.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Conformément à la loi pour la confiance dans l'économie numérique (LCEN), 
              CreatorHub agit en qualité d'hébergeur et n'est pas responsable du contenu 
              publié par les utilisateurs, sous réserve de retirer promptement tout contenu 
              manifestement illicite qui lui serait signalé.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Signalement de contenu illicite</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément à l'article 6-I-5 de la LCEN, vous pouvez nous signaler tout contenu 
              manifestement illicite en nous contactant à :
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Email : <a href="mailto:abuse@creatorhub.com" className="text-primary hover:underline">abuse@creatorhub.com</a><br /><br />
              Votre signalement doit contenir :<br />
              - Vos coordonnées complètes<br />
              - La description du contenu litigieux et sa localisation précise<br />
              - Les motifs pour lesquels ce contenu doit être retiré<br />
              - Une copie de la correspondance avec l'auteur (si applicable)
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Données personnelles</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement des données personnelles est détaillé dans notre 
              <a href="/privacy" className="text-primary hover:underline ml-1">Politique de Confidentialité</a>.
              <br /><br />
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression 
              de vos données. Pour exercer ces droits, contactez notre DPO : 
              <a href="mailto:dpo@creatorhub.com" className="text-primary hover:underline ml-1">dpo@creatorhub.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ce site utilise des cookies. Pour en savoir plus sur leur utilisation et les gérer, 
              consultez notre <a href="/cookies" className="text-primary hover:underline">Politique des Cookies</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contenu pour adultes</h2>
            <p className="text-muted-foreground leading-relaxed">
              CreatorHub peut contenir du contenu réservé aux adultes. L'accès à ce contenu 
              est strictement réservé aux personnes majeures (18 ans et plus).
              Une vérification de l'âge est effectuée lors de l'accès au site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation de responsabilité</h2>
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
            <h2 className="text-2xl font-semibold mb-4">11. Droit applicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes mentions légales sont soumises au droit français. 
              En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Médiation de la consommation</h2>
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
            <h2 className="text-2xl font-semibold mb-4">13. Crédits</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conception et développement : [Nom de l'agence / développeur]<br />
              Icônes : Lucide React<br />
              Hébergement : Supabase / Lovable
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LegalNotice;
