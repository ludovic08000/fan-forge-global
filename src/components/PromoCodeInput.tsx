import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PromoCodeInputProps {
  creatorId: string;
  onCodeValidated: (code: string | null, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  onInitialCheckComplete?: () => void;
  className?: string;
}

const PROMO_CODE_STORAGE_KEY = 'crub_promo_code';

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  creatorId,
  onCodeValidated,
  onInitialCheckComplete,
  className
}) => {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    discount?: { type: 'percentage' | 'fixed'; value: number };
    code?: string;
  } | null>(null);

  // Load saved promo code from localStorage
  useEffect(() => {
    const checkSavedCode = async () => {
      const savedCode = localStorage.getItem(PROMO_CODE_STORAGE_KEY);
      if (savedCode) {
        try {
          const parsed = JSON.parse(savedCode);
          if (parsed.creatorId === creatorId && parsed.code) {
            setCode(parsed.code);
            // Auto-validate saved code
            await validateCode(parsed.code, true);
            return; // onInitialCheckComplete sera appelé par validateCode
          }
        } catch {
          localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
        }
      }
      // Pas de code sauvegardé, signaler que la vérification est terminée
      onInitialCheckComplete?.();
    };
    
    checkSavedCode();
  }, [creatorId]);

  const validateCode = async (codeToValidate: string, isInitialCheck = false) => {
    if (!codeToValidate.trim()) {
      setValidationResult(null);
      onCodeValidated(null, null);
      if (isInitialCheck) onInitialCheckComplete?.();
      return;
    }

    setIsValidating(true);
    
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('code', codeToValidate.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setValidationResult({
          valid: false,
          message: 'Code invalide ou expiré'
        });
        onCodeValidated(null, null);
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
        if (isInitialCheck) onInitialCheckComplete?.();
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setValidationResult({
          valid: false,
          message: 'Code expiré'
        });
        onCodeValidated(null, null);
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
        if (isInitialCheck) onInitialCheckComplete?.();
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setValidationResult({
          valid: false,
          message: 'Code épuisé'
        });
        onCodeValidated(null, null);
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
        if (isInitialCheck) onInitialCheckComplete?.();
        return;
      }

      // Valid code
      const discount = data.discount_percentage 
        ? { type: 'percentage' as const, value: data.discount_percentage }
        : { type: 'fixed' as const, value: data.discount_amount || 0 };

      setValidationResult({
        valid: true,
        message: discount.type === 'percentage' 
          ? `-${discount.value}% sur le premier mois`
          : `-${discount.value}€ sur le premier mois`,
        discount,
        code: data.code
      });

      // Save to localStorage for persistence
      localStorage.setItem(PROMO_CODE_STORAGE_KEY, JSON.stringify({
        creatorId,
        code: data.code
      }));

      onCodeValidated(data.code, discount);

    } catch (error) {
      console.error('Error validating promo code:', error);
      setValidationResult({
        valid: false,
        message: 'Erreur de validation'
      });
      onCodeValidated(null, null);
    } finally {
      setIsValidating(false);
      if (isInitialCheck) onInitialCheckComplete?.();
    }
  };

  const handleApply = () => {
    validateCode(code);
  };

  const handleClear = () => {
    setCode('');
    setValidationResult(null);
    onCodeValidated(null, null);
    localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (validationResult) {
                setValidationResult(null);
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Code promo ou parrainage"
            className={cn(
              "pl-10 pr-10 uppercase",
              validationResult?.valid && "border-green-500 focus-visible:ring-green-500",
              validationResult && !validationResult.valid && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={isValidating}
          />
          {validationResult?.valid && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
          {validationResult && !validationResult.valid && (
            <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
        </div>
        
        {validationResult?.valid ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleApply}
            disabled={!code.trim() || isValidating}
            className="shrink-0"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Appliquer'
            )}
          </Button>
        )}
      </div>

      {validationResult && (
        <div className={cn(
          "text-sm flex items-center gap-2",
          validationResult.valid ? "text-green-600" : "text-destructive"
        )}>
          {validationResult.valid ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              {validationResult.message}
            </Badge>
          ) : (
            <span>{validationResult.message}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;
