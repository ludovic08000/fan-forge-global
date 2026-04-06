import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      setStatus(data?.success ? "success" : "error");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === "valid" && <MailX className="h-12 w-12 text-primary" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === "already" && <CheckCircle className="h-12 w-12 text-muted-foreground" />}
            {(status === "invalid" || status === "error") && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle>
            {status === "loading" && "Vérification..."}
            {status === "valid" && "Se désabonner"}
            {status === "success" && "Désabonnement confirmé"}
            {status === "already" && "Déjà désabonné(e)"}
            {status === "invalid" && "Lien invalide"}
            {status === "error" && "Erreur"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Confirmez votre désabonnement des emails de notification TheForge.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmer le désabonnement
              </Button>
            </>
          )}
          {status === "success" && (
            <p className="text-muted-foreground">
              Vous ne recevrez plus d'emails de notification de TheForge.
            </p>
          )}
          {status === "already" && (
            <p className="text-muted-foreground">
              Vous êtes déjà désabonné(e) de nos emails.
            </p>
          )}
          {status === "invalid" && (
            <p className="text-muted-foreground">
              Ce lien de désabonnement est invalide ou a expiré.
            </p>
          )}
          {status === "error" && (
            <p className="text-muted-foreground">
              Une erreur est survenue. Veuillez réessayer plus tard.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;