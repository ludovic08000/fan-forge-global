-- Corriger la fonction generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Position 12 pour 6 caractères: INV-YYYYMM-XXXXXX
  -- Positions: 1234567890123456789
  --            INV-202512-000001
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 12 FOR 6) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM creator_invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  invoice_num := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$function$;