import { describe, it, expect } from '@jest/globals';

describe('Marketplace API', () => {
  it('should return concerts when filtering by category', async () => {
    const response = await fetch('http://localhost:3300/api/marketplace/events?category=concerts');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.events).toHaveLength(3);
    expect(data.data.events.every((event: any) => event.category === 'concerts')).toBe(true);
  });

  it('should return all events when no category is specified', async () => {
    const response = await fetch('http://localhost:3300/api/marketplace/events');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.events).toHaveLength(9);
    expect(data.data.totalCount).toBe(9);
  });

  it('should paginate results correctly', async () => {
    const response = await fetch('http://localhost:3300/api/marketplace/events?page=1&limit=3');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.events).toHaveLength(3);
    expect(data.data.currentPage).toBe(1);
    expect(data.data.totalPages).toBe(3);
  });

  it('should sort events by price low to high', async () => {
    const response = await fetch('http://localhost:3300/api/marketplace/events?sortBy=price-low');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    const prices = data.data.events.map((event: any) => event.priceRange.min);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedPrices);
  });
});