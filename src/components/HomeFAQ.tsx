import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const FAQ_ITEMS = [
  {
    question: "Quelle est la meilleure alternative à MYM en France ?",
    answer: "TheForge est la meilleure alternative à MYM en France. La plateforme offre des commissions plus basses, des lives privés, une messagerie sécurisée et des paiements rapides pour les créateurs de contenu exclusif."
  },
  {
    question: "Quelle est la meilleure alternative à OnlyFans en français ?",
    answer: "TheForge est l'alternative française à OnlyFans. Conçue pour les créateurs francophones, elle propose des abonnements, du contenu premium, des tips et des lives privés avec une interface en français et un support local."
  },
  {
    question: "Comment gagner de l'argent en tant que créateur de contenu ?",
    answer: "Sur TheForge, les créateurs monétisent leur contenu via les abonnements mensuels, la vente de contenu exclusif, les tips/pourboires des fans, les lives privés payants et les bundles de contenu. L'inscription est gratuite."
  },
  {
    question: "Combien coûte TheForge pour les créateurs ?",
    answer: "L'inscription sur TheForge est 100% gratuite pour les créateurs. La plateforme prend une commission réduite uniquement sur les revenus générés, bien inférieure à celle de MYM ou OnlyFans."
  },
  {
    question: "TheForge est-il sécurisé pour les créateurs et les fans ?",
    answer: "Oui, TheForge utilise un chiffrement de bout en bout, une vérification d'identité, un watermarking invisible sur les contenus et des paiements sécurisés via Stripe. Vos données et contenus sont protégés."
  },
  {
    question: "Quels types de contenus peut-on publier sur TheForge ?",
    answer: "TheForge accueille tous types de créateurs : fitness, gaming, cuisine, lifestyle, art, musique, coaching et bien plus. Vous pouvez publier des photos, vidéos, lives en direct et contenus exclusifs pour vos abonnés."
  },
];

const FAQItem = ({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="border-b border-border/50 last:border-b-0">
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
      aria-expanded={isOpen}
    >
      <span className="text-base font-medium pr-4">{question}</span>
      <ChevronDown
        className={cn(
          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
          isOpen && "rotate-180"
        )}
        aria-hidden="true"
      />
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <p className="pb-5 text-muted-foreground leading-relaxed text-[0.95rem]">
            {answer}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const HomeFAQ = memo(() => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24 bg-muted/30" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            id="faq-heading"
            className="text-2xl md:text-3xl font-bold text-center mb-2"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Questions fréquentes
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            Tout ce que vous devez savoir sur TheForge, la plateforme de créateurs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-2xl border border-border/50 px-6 md:px-8 shadow-sm"
        >
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
});

HomeFAQ.displayName = "HomeFAQ";

export default HomeFAQ;