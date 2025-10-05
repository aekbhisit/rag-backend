#!/usr/bin/env ts-node

/**
 * Test script specifically for RAG Place Search Handler
 * Tests the complete flow: AI Function Call → Parameter Mapping → ragPlaceSearchHandler → API Call
 */

import { ragPlaceSearchHandler } from './rag-place';

async function testRagPlaceHandler(): Promise<void> {
  console.log('🧪 Testing RAG Place Search Handler');
  console.log('='.repeat(50));

  // Test 1: Basic functionality
  console.log('\n📋 Test 1: Basic RAG Place Search');
  try {
    const result = await ragPlaceSearchHandler({
      searchQuery: 'restaurants in Bangkok',
      lat: 13.7563,
      long: 100.5018,
      category: 'restaurant',
      maxResults: 5,
      maxDistanceKm: 10
    });

    console.log('✅ Handler executed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Handler failed:', error);
  }

  // Test 2: Parameter mapping simulation (AI perspective)
  console.log('\n📋 Test 2: AI Parameter Mapping Simulation');
  try {
    // Simulate AI function call parameters
    const aiArgs = {
      searchQuery: 'hotels in Phuket',
      lat: 7.8804,
      long: 98.3923,
      category: 'hotel',
      maxResults: 3,
      maxDistanceKm: 15
    };

    console.log('AI Function Call Args:', JSON.stringify(aiArgs, null, 2));

    // Apply parameter mapping (this would be done by the system)
    const mappedArgs = {
      searchQuery: aiArgs.searchQuery,  // searchQuery → searchQuery (no change)
      lat: aiArgs.lat,                  // lat → lat (no change)
      long: aiArgs.long,                // long → long (no change)
      category: aiArgs.category,        // category → category (no change)
      maxResults: aiArgs.maxResults,    // maxResults → maxResults (no change)
      maxDistanceKm: aiArgs.maxDistanceKm // maxDistanceKm → maxDistanceKm (no change)
    };

    console.log('Mapped Args:', JSON.stringify(mappedArgs, null, 2));

    // Execute handler with mapped parameters
    const result = await ragPlaceSearchHandler(mappedArgs);

    console.log('✅ Handler executed with mapped parameters');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Handler failed with mapped parameters:', error);
  }

  // Test 3: Different parameter mapping (like searchQuery → text_query)
  console.log('\n📋 Test 3: Alternative Parameter Mapping');
  try {
    // Simulate different AI parameter names
    const aiArgs = {
      query: 'beaches in Krabi',        // AI uses 'query' instead of 'searchQuery'
      latitude: 8.0863,                 // AI uses 'latitude' instead of 'lat'
      longitude: 98.9063,               // AI uses 'longitude' instead of 'long'
      type: 'beach',                    // AI uses 'type' instead of 'category'
      limit: 4,                         // AI uses 'limit' instead of 'maxResults'
      radius: 20                        // AI uses 'radius' instead of 'maxDistanceKm'
    };

    console.log('AI Function Call Args (Alternative):', JSON.stringify(aiArgs, null, 2));

    // Apply parameter mapping (this would be done by the system)
    const mappedArgs = {
      searchQuery: aiArgs.query,        // query → searchQuery
      lat: aiArgs.latitude,             // latitude → lat
      long: aiArgs.longitude,           // longitude → long
      category: aiArgs.type,            // type → category
      maxResults: aiArgs.limit,         // limit → maxResults
      maxDistanceKm: aiArgs.radius      // radius → maxDistanceKm
    };

    console.log('Mapped Args:', JSON.stringify(mappedArgs, null, 2));

    // Execute handler with mapped parameters
    const result = await ragPlaceSearchHandler(mappedArgs);

    console.log('✅ Handler executed with alternative parameter mapping');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Handler failed with alternative mapping:', error);
  }

  // Test 4: Error handling
  console.log('\n📋 Test 4: Error Handling');
  try {
    const result = await ragPlaceSearchHandler({
      searchQuery: '',  // Empty search query
      lat: 999,         // Invalid latitude
      long: 999,        // Invalid longitude
      category: 'invalid',
      maxResults: -1,   // Invalid max results
      maxDistanceKm: -5 // Invalid distance
    });

    console.log('✅ Handler handled invalid parameters gracefully');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Handler failed with invalid parameters:', error);
  }

  console.log('\n🎉 RAG Place Handler Tests Completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRagPlaceHandler().catch(console.error);
}

export { testRagPlaceHandler };
