-- COMMON research desks: professional investment coverage taxonomy.
-- Non-destructive: retain original category keys for existing communities.
ALTER TABLE public.communities DROP CONSTRAINT IF EXISTS communities_category_check;
ALTER TABLE public.communities ADD CONSTRAINT communities_category_check
CHECK(category IN (
 'markets','housing','businesses','local','education',
 'equity_research','event_driven','macro_rates','derivatives',
 'market_structure','quant_strategies','portfolio_risk',
 'shareholder_stewardship','real_assets','private_credit',
 'venture_capital','private_equity','personal_finance'
));
CREATE INDEX IF NOT EXISTS community_research_category_idx
ON public.communities(category,created_at DESC);
