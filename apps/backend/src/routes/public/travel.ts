import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildPublicTravelRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // POST /api/travel/place - Get place details by ID
  router.post('/travel/place', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      const PlaceRequestSchema = z.object({
        placeId: z.string().min(1)
      });
      
      const { placeId } = PlaceRequestSchema.parse(req.body);
      
      // Get place details from contexts table
      const { rows } = await pg.query(
        `SELECT id, title, body, attributes, keywords, created_at, updated_at
         FROM contexts 
         WHERE tenant_id = $1 AND id = $2 AND type = 'place' AND status = 'active'
         LIMIT 1`,
        [tenantId, placeId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Place not found',
          placeId
        });
      }
      
      const row = rows[0];
      const attributes = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {});
      
      // Transform to frontend Place format
      const place = {
        id: row.id,
        name: row.title || 'Place',
        categories: Array.isArray(row.keywords) ? row.keywords : [],
        rating: typeof attributes.rating === 'number' ? attributes.rating : undefined,
        reviewCount: typeof attributes.review_count === 'number' ? attributes.review_count : undefined,
        priceLevel: typeof attributes.price_level === 'number' ? attributes.price_level : undefined,
        address: attributes.address,
        phone: attributes.phone,
        website: attributes.website,
        facebookUrl: attributes.facebook_url,
        lineId: attributes.line_id,
        photos: Array.isArray(attributes.images) ? attributes.images : [],
        openingHours: Array.isArray(attributes.opening_hours) ? attributes.opening_hours.map((hour: string) => {
          // Parse opening hours string format: "Monday: 8:00 AM – 3:30 PM"
          const match = hour.match(/(\w+):\s*(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/);
          if (match) {
            const dayMap: { [key: string]: number } = {
              'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 
              'Friday': 5, 'Saturday': 6, 'Sunday': 7
            };
            return {
              day: dayMap[match[1]] || 0,
              open: match[2],
              close: match[3]
            };
          }
          return null;
        }).filter(Boolean) : undefined,
        coordinates: (typeof attributes.lat === 'number' && typeof attributes.longitude === 'number') 
          ? { lat: attributes.lat, lng: attributes.longitude } 
          : undefined,
        attributes: {
          acceptsReservations: attributes.amenities?.accepts_reservations,
          hasDelivery: attributes.amenities?.has_delivery,
          hasTakeout: attributes.amenities?.has_takeout,
          wheelchairAccessible: attributes.amenities?.wheelchair_accessible,
        },
        longDescription: row.body || '',
        distanceMeters: undefined,
      };
      
      res.json({ place });
      
    } catch (error) {
      console.error('Error fetching place:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to fetch place',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/travel/nearby - Get nearby places
  router.post('/travel/nearby', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      const NearbyRequestSchema = z.object({
        placeId: z.string().min(1),
        category: z.string().optional(),
        radiusMeters: z.number().min(1).max(50000).default(5000)
      });
      
      const { placeId, category, radiusMeters } = NearbyRequestSchema.parse(req.body);
      
      // First get the reference place coordinates
      const { rows: placeRows } = await pg.query(
        `SELECT attributes FROM contexts 
         WHERE tenant_id = $1 AND id = $2 AND type = 'place' AND status = 'active'
         LIMIT 1`,
        [tenantId, placeId]
      );
      
      if (placeRows.length === 0) {
        return res.status(404).json({
          error: 'Reference place not found',
          placeId
        });
      }
      
      const placeAttrs = typeof placeRows[0].attributes === 'string' 
        ? JSON.parse(placeRows[0].attributes) 
        : (placeRows[0].attributes || {});
      
      const refLat = placeAttrs.lat;
      const refLng = placeAttrs.longitude;
      
      if (typeof refLat !== 'number' || typeof refLng !== 'number') {
        return res.status(400).json({
          error: 'Reference place has no valid coordinates',
          placeId
        });
      }
      
      // Calculate distance using Haversine formula
      const radiusKm = radiusMeters / 1000;
      const earthRadius = 6371; // Earth's radius in kilometers
      
      // Build category filter
      let categoryFilter = '';
      let categoryParams: any[] = [];
      if (category && category !== 'All') {
        categoryFilter = `AND EXISTS (
          SELECT 1 FROM context_categories cc 
          JOIN categories c ON c.id = cc.category_id 
          WHERE cc.context_id = contexts.id 
          AND cc.tenant_id = $1 
          AND (c.slug = $${categoryParams.length + 2} OR c.name ILIKE $${categoryParams.length + 2})
        )`;
        categoryParams = [category];
      }
      
      // Get nearby places with distance calculation
      const { rows } = await pg.query(
        `SELECT 
           id, title, body, attributes, keywords, created_at, updated_at,
           (
             6371 * acos(
               cos(radians($2)) * cos(radians((attributes->>'lat')::float)) * 
               cos(radians((attributes->>'longitude')::float) - radians($3)) + 
               sin(radians($2)) * sin(radians((attributes->>'lat')::float))
             )
           ) AS distance_km
         FROM contexts 
         WHERE tenant_id = $1 
         AND type = 'place' 
         AND status = 'active'
         AND id != $4
         AND (attributes->>'lat') IS NOT NULL 
         AND (attributes->>'longitude') IS NOT NULL
         ${categoryFilter}
         AND (
           6371 * acos(
             cos(radians($2)) * cos(radians((attributes->>'lat')::float)) * 
             cos(radians((attributes->>'longitude')::float) - radians($3)) + 
             sin(radians($2)) * sin(radians((attributes->>'lat')::float))
           )
         ) <= $5
         ORDER BY distance_km ASC
         LIMIT 50`,
        [tenantId, refLat, refLng, placeId, radiusKm, ...categoryParams]
      );
      
      // Transform to frontend NearbyItem format
      const results = rows.map(row => {
        const attributes = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {});
        const distanceMeters = Math.round((row.distance_km || 0) * 1000);
        
        return {
          placeId: row.id,
          name: row.title || 'Place',
          rating: typeof attributes.rating === 'number' ? attributes.rating : undefined,
          priceLevel: typeof attributes.price_level === 'number' ? attributes.price_level : undefined,
          distanceMeters,
          openNow: undefined, // Could be calculated from opening_hours if needed
          tags: Array.isArray(row.keywords) ? row.keywords : [],
          address: attributes.address,
          phone: attributes.phone,
          photos: Array.isArray(attributes.images) ? attributes.images : [],
          description: (row.body || '').slice(0, 160),
          detail: undefined,
          longDescription: row.body || '',
          openingHours: undefined, // Could be parsed from attributes.opening_hours if needed
        };
      });
      
      res.json({ results });
      
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to fetch nearby places',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
