#!/usr/bin/env ts-node

/**
 * AI Function Execution Test Runner
 * Executes the complete test suite for AI function execution system
 */

import { AIFunctionExecutionTester } from './test-execution';

// Test configuration
const TEST_ENVIRONMENTS = {
  development: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rag_assistant',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    }
  },
  test: {
    database: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'rag_assistant_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password'
    }
  }
};

class TestRunner {
  private environment: string;
  private verbose: boolean;

  constructor(environment: string = 'development', verbose: boolean = false) {
    this.environment = environment;
    this.verbose = verbose;
  }

  async runTests(): Promise<void> {
    console.log(`🧪 Running AI Function Execution Tests`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Verbose: ${this.verbose}`);
    console.log('='.repeat(60));

    // Set environment variables for the test
    const config = TEST_ENVIRONMENTS[this.environment as keyof typeof TEST_ENVIRONMENTS];
    if (config) {
      Object.assign(process.env, {
        DB_HOST: config.database.host,
        DB_PORT: config.database.port.toString(),
        DB_NAME: config.database.database,
        DB_USER: config.database.user,
        DB_PASSWORD: config.database.password
      });
    }

    const tester = new AIFunctionExecutionTester();
    
    try {
      await tester.runAllTests();
      console.log('\n🎉 All tests completed successfully!');
    } catch (error) {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    }
  }

  async runSpecificTest(testName: string): Promise<void> {
    console.log(`🧪 Running specific test: ${testName}`);
    console.log('='.repeat(60));

    const tester = new AIFunctionExecutionTester();
    
    try {
      await tester.setup();
      
      switch (testName.toLowerCase()) {
        case 'database':
          await tester.runTest('Database Tool Retrieval', () => tester.testDatabaseToolRetrieval());
          break;
        case 'mapping':
          await tester.runTest('Parameter Mapping', () => tester.testParameterMapping());
          break;
        case 'handlers':
          await tester.runTest('Skill Handler Execution', () => tester.testSkillHandlerExecution());
          break;
        case 'complete':
          await tester.runTest('Complete Function Call Execution', () => tester.testCompleteFunctionCallExecution());
          break;
        case 'errors':
          await tester.runTest('Error Handling', () => tester.testErrorHandling());
          break;
        case 'performance':
          await tester.runTest('Performance Test', () => tester.testPerformance());
          break;
        default:
          console.error(`Unknown test: ${testName}`);
          console.log('Available tests: database, mapping, handlers, complete, errors, performance');
          process.exit(1);
      }
      
      await tester.cleanup();
      console.log('\n✅ Test completed successfully!');
      
    } catch (error) {
      console.error('\n💥 Test execution failed:', error);
      await tester.cleanup();
      process.exit(1);
    }
  }

  printHelp(): void {
    console.log(`
AI Function Execution Test Runner

Usage:
  npm run test:ai-functions [options]
  ts-node test-runner.ts [options]

Options:
  --env <environment>    Test environment (development, test) [default: development]
  --test <testName>      Run specific test (database, mapping, handlers, complete, errors, performance)
  --verbose              Enable verbose output
  --help                 Show this help message

Examples:
  npm run test:ai-functions
  npm run test:ai-functions -- --env test
  npm run test:ai-functions -- --test performance
  npm run test:ai-functions -- --test complete --verbose

Available Tests:
  database     - Test database tool retrieval functionality
  mapping      - Test parameter mapping between AI and handlers
  handlers     - Test individual skill handler execution
  complete     - Test complete end-to-end function call flow
  errors       - Test error handling scenarios
  performance  - Test performance benchmarks

Environment Variables:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  TEST_DB_HOST, TEST_DB_PORT, TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASSWORD
`);
  }
}

// CLI argument parsing
function parseArgs(): { environment: string; testName?: string; verbose: boolean; help: boolean } {
  const args = process.argv.slice(2);
  let environment = 'development';
  let testName: string | undefined;
  let verbose = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
        environment = args[++i] || 'development';
        break;
      case '--test':
        testName = args[++i];
        break;
      case '--verbose':
        verbose = true;
        break;
      case '--help':
        help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return { environment, testName, verbose, help };
}

// Main execution
async function main(): Promise<void> {
  const { environment, testName, verbose, help } = parseArgs();
  
  const runner = new TestRunner(environment, verbose);
  
  if (help) {
    runner.printHelp();
    return;
  }

  try {
    if (testName) {
      await runner.runSpecificTest(testName);
    } else {
      await runner.runTests();
    }
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner };
