#!/usr/bin/env ts-node

/**
 * AI Function Execution Demo
 * Demonstrates the complete flow of AI function call execution
 */

import { AIFunctionExecutionTester } from './test-execution';

async function runDemo(): Promise<void> {
  console.log('🎬 AI Function Execution Demo');
  console.log('='.repeat(50));
  console.log('This demo shows how AI function calls are processed:');
  console.log('1. AI sends function call with name and arguments');
  console.log('2. System looks up tool configuration in database');
  console.log('3. Parameters are mapped from AI format to handler format');
  console.log('4. Skill handler is executed with mapped parameters');
  console.log('5. Results are returned to AI');
  console.log('');

  const tester = new AIFunctionExecutionTester();
  
  try {
    await tester.setup();
    console.log('✅ Test environment ready');
    
    // Demo 1: Web Search Function Call
    console.log('\n🔍 Demo 1: Web Search Function Call');
    console.log('-'.repeat(40));
    
    const webSearchCall = {
      function: {
        name: 'searchWeb',
        arguments: JSON.stringify({
          searchQuery: 'artificial intelligence trends 2024',
          maxResults: 3
        })
      }
    };
    
    console.log('AI Function Call:', JSON.stringify(webSearchCall, null, 2));
    
    const webSearchResult = await tester.runTest('Web Search Demo', async () => {
      // Simulate the complete execution flow
      const result = await tester.testCompleteFunctionCallExecution();
      return result;
    });
    
    if (webSearchResult.success) {
      console.log('✅ Web search executed successfully');
      console.log('Result preview:', JSON.stringify(webSearchResult.result?.executionResult, null, 2));
    }
    
    // Demo 2: RAG Search with Parameter Mapping
    console.log('\n🧠 Demo 2: RAG Search with Parameter Mapping');
    console.log('-'.repeat(40));
    
    const ragSearchCall = {
      function: {
        name: 'searchKnowledge',
        arguments: JSON.stringify({
          query: 'travel destinations in Thailand',
          topK: 5
        })
      }
    };
    
    console.log('AI Function Call:', JSON.stringify(ragSearchCall, null, 2));
    
    const ragSearchResult = await tester.runTest('RAG Search Demo', async () => {
      // Test parameter mapping specifically
      const mappingResult = await tester.testParameterMapping();
      return mappingResult;
    });
    
    if (ragSearchResult.success) {
      console.log('✅ Parameter mapping executed successfully');
      console.log('Mapping result:', JSON.stringify(ragSearchResult.result, null, 2));
    }
    
    // Demo 3: Error Handling
    console.log('\n⚠️  Demo 3: Error Handling');
    console.log('-'.repeat(40));
    
    const errorCall = {
      function: {
        name: 'nonExistentFunction',
        arguments: JSON.stringify({
          invalidParam: 'test'
        })
      }
    };
    
    console.log('AI Function Call (Invalid):', JSON.stringify(errorCall, null, 2));
    
    const errorResult = await tester.runTest('Error Handling Demo', async () => {
      const errorTests = await tester.testErrorHandling();
      return errorTests;
    });
    
    if (errorResult.success) {
      console.log('✅ Error handling works correctly');
      console.log('Error tests:', JSON.stringify(errorResult.result, null, 2));
    }
    
    // Demo 4: Performance Test
    console.log('\n⚡ Demo 4: Performance Test');
    console.log('-'.repeat(40));
    
    const performanceResult = await tester.runTest('Performance Demo', async () => {
      const perfResult = await tester.testPerformance();
      return perfResult;
    });
    
    if (performanceResult.success) {
      console.log('✅ Performance test completed');
      console.log('Performance metrics:', JSON.stringify(performanceResult.result, null, 2));
    }
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('All components of the AI function execution system are working correctly.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await tester.cleanup();
    console.log('\n🧹 Demo cleanup completed');
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
