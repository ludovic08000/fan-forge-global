import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, TrendingUp, MessageSquare, FileText, Lightbulb, 
  Copy, Loader2, BarChart3, Target, Zap, RefreshCw,
  ChevronRight, Star, Clock, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { motion } from 'framer-motion';

interface DashboardAIMarketingProps {
  creatorId: string;
  creatorStats: {
    totalEarnings: number;
    totalSubscribers: number;
    totalViews: number;
    totalLikes: number;
  };
  stageName?: string;
}

const DashboardAIMarketing: React.FC<DashboardAIMarketingProps> = ({
  creatorId,
  creatorStats,
  stageName
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);

  // Suggestions state
  const [suggestionsResult, setSuggestionsResult] = useState<any>(null);
  const [suggestionsContext, setSuggestionsContext] = useState('');

  // Descriptions state
  const [descriptionTitle, setDescriptionTitle] = useState('');
  const [descriptionType, setDescriptionType] = useState('photo');
  const [descriptionResult, setDescriptionResult] = useState<any>(null);

  // Revenue analysis state
  const [revenueResult, setRevenueResult] = useState<any>(null);

  // Promo messages state
  const [promoType, setPromoType] = useState('welcome');
  const [promoContext, setPromoContext] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);

  const callAIMarketing = async (marketingAction: string, extraParams: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'ai-marketing',
          marketingAction,
          creatorId,
          creatorStats,
          stageName: stageName || 'Créateur',
          ...extraParams,
        }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('AI Marketing error:', err);
      toast.error(err.message || "Erreur IA, réessayez plus tard");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    const data = await callAIMarketing('content-suggestions', { context: suggestionsContext });
    if (data) setSuggestionsResult(data);
  };

  const handleGetDescription = async () => {
    if (!descriptionTitle.trim()) {
      toast.error("Entrez un titre pour votre contenu");
      return;
    }
    const data = await callAIMarketing('generate-description', {
      contentTitle: descriptionTitle,
      contentType: descriptionType
    });
    if (data) setDescriptionResult(data);
  };

  const handleAnalyzeRevenue = async () => {
    const data = await callAIMarketing('revenue-analysis');
    if (data) setRevenueResult(data);
  };

  const handleGeneratePromo = async () => {
    const data = await callAIMarketing('promo-message', {
      promoType,
      promoContext
    });
    if (data) setPromoResult(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier !");
  };

  const CopyButton = ({ text }: { text: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text)}
      className="gap-1.5 text-xs"
    >
      <Copy className="h-3 w-3" />
      Copier
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
          <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold">IA Marketing</h2>
          <p className="text-muted-foreground text-sm">
            Optimisez votre stratégie et maximisez vos revenus avec l'intelligence artificielle
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="suggestions" className="gap-1.5 text-xs sm:text-sm">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Suggestions</span>
          </TabsTrigger>
          <TabsTrigger value="descriptions" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Descriptions</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Revenus</span>
          </TabsTrigger>
          <TabsTrigger value="promo" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages Promo</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: Suggestions de contenu ===== */}
        <TabsContent value="suggestions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Suggestions de contenu
              </CardTitle>
              <CardDescription>
                L'IA analyse vos stats et vous suggère le meilleur contenu à publier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{creatorStats.totalSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Abonnés</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{creatorStats.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Vues</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Star className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{creatorStats.totalLikes}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{creatorStats.totalEarnings.toFixed(0)}€</p>
                  <p className="text-xs text-muted-foreground">Revenus</p>
                </div>
              </div>

              <Textarea
                placeholder="Contexte optionnel : décrivez votre niche, votre style, vos objectifs..."
                value={suggestionsContext}
                onChange={e => setSuggestionsContext(e.target.value)}
                rows={2}
              />

              <Button onClick={handleGetSuggestions} disabled={loading} className="w-full gap-2">
                {loading && activeTab === 'suggestions' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Obtenir des suggestions IA
              </Button>

              {suggestionsResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <Separator />
                  {suggestionsResult.suggestions?.map((suggestion: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{suggestion.type || 'Contenu'}</Badge>
                          <h4 className="font-medium">{suggestion.title}</h4>
                        </div>
                        <CopyButton text={`${suggestion.title}\n${suggestion.description}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      {suggestion.bestTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Meilleur moment : {suggestion.bestTime}
                        </div>
                      )}
                      {suggestion.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.tags.map((tag: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">#{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Générateur de descriptions ===== */}
        <TabsContent value="descriptions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Générateur de descriptions
              </CardTitle>
              <CardDescription>
                Créez des titres accrocheurs et des descriptions optimisées pour vos contenus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Titre ou thème de votre contenu..."
                value={descriptionTitle}
                onChange={e => setDescriptionTitle(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {['photo', 'video', 'live', 'story'].map(type => (
                  <Button
                    key={type}
                    variant={descriptionType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDescriptionType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              <Button onClick={handleGetDescription} disabled={loading} className="w-full gap-2">
                {loading && activeTab === 'descriptions' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Générer des descriptions
              </Button>

              {descriptionResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Separator />
                  {descriptionResult.options?.map((option: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-lg">{option.title}</h4>
                        <CopyButton text={`${option.title}\n\n${option.description}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      {option.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {option.hashtags.map((tag: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">#{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Analyse des revenus ===== */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Analyse des revenus & conseils
              </CardTitle>
              <CardDescription>
                L'IA analyse vos tendances de revenus et donne des recommandations personnalisées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Revenus totaux</p>
                  <p className="text-2xl font-bold">{creatorStats.totalEarnings.toFixed(2)}€</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rev. / abonné</p>
                  <p className="text-2xl font-bold">
                    {creatorStats.totalSubscribers > 0
                      ? (creatorStats.totalEarnings / creatorStats.totalSubscribers).toFixed(2)
                      : '0.00'}€
                  </p>
                </div>
              </div>

              <Button onClick={handleAnalyzeRevenue} disabled={loading} className="w-full gap-2">
                {loading && activeTab === 'revenue' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Analyser et obtenir des conseils
              </Button>

              {revenueResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Separator />
                  
                  {revenueResult.analysis && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Analyse
                      </h4>
                      <p className="text-sm text-muted-foreground">{revenueResult.analysis}</p>
                    </div>
                  )}

                  {revenueResult.recommendations?.map((rec: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{rec.title}</h4>
                        {rec.impact && (
                          <Badge variant="secondary" className="text-xs">
                            Impact: {rec.impact}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{rec.description}</p>
                    </div>
                  ))}

                  {revenueResult.priceSuggestion && (
                    <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                      <h4 className="font-medium flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-primary" />
                        Prix d'abonnement suggéré
                      </h4>
                      <p className="text-2xl font-bold text-primary">{revenueResult.priceSuggestion}€/mois</p>
                      {revenueResult.priceReason && (
                        <p className="text-sm text-muted-foreground mt-1">{revenueResult.priceReason}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Messages promo ===== */}
        <TabsContent value="promo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-violet-500" />
                Générateur de messages promo
              </CardTitle>
              <CardDescription>
                Créez des messages marketing personnalisés pour attirer et retenir vos abonnés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'welcome', label: '👋 Bienvenue' },
                  { id: 'retention', label: '💝 Rétention' },
                  { id: 'reactivation', label: '🔥 Réactivation' },
                  { id: 'special_offer', label: '🎁 Offre spéciale' },
                  { id: 'new_content', label: '✨ Nouveau contenu' },
                ].map(type => (
                  <Button
                    key={type.id}
                    variant={promoType === type.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPromoType(type.id)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              <Textarea
                placeholder="Contexte optionnel : décrivez l'offre, l'événement, etc."
                value={promoContext}
                onChange={e => setPromoContext(e.target.value)}
                rows={2}
              />

              <Button onClick={handleGeneratePromo} disabled={loading} className="w-full gap-2">
                {loading && activeTab === 'promo' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Générer des messages
              </Button>

              {promoResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <Separator />
                  {promoResult.messages?.map((msg: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary">{msg.tone || 'Standard'}</Badge>
                        <CopyButton text={msg.text} />
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      {msg.callToAction && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Call to action suggéré :</p>
                          <p className="text-sm font-medium text-primary">{msg.callToAction}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAIMarketing;
