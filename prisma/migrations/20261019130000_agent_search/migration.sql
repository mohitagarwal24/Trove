CREATE INDEX "offer_metadata_search" ON "OfferVersion" USING GIN (to_tsvector('english', title || ' ' || description || ' ' || category || ' ' || coverage)) WHERE current = true;
