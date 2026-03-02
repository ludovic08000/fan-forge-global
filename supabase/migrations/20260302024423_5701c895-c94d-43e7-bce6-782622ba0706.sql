CREATE OR REPLACE FUNCTION public.increment_wishlist_amount(p_wishlist_id UUID, p_amount NUMERIC)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE creator_wishlists
  SET current_amount = current_amount + p_amount
  WHERE id = p_wishlist_id;
END;
$$;