import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

interface ChannelHealthStatus {
  channel: string;
  isHealthy: boolean;
  status: 'active' | 'degraded' | 'offline';
  responseTime: number; // in milliseconds
  lastChecked: string;
  errors: string[];
  capabilities: string[];
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  channels: ChannelHealthStatus[];
  timestamp: string;
  uptime: number; // in seconds
}

export async function GET(req: NextRequest) {
  try {
    console.log(`[Channel Health] Health check requested`);

    const healthChecks = await Promise.allSettled([
      checkRealtimeChannelHealth(),
      checkNormalAPIChannelHealth(),
      checkHumanStaffChannelHealth()
    ]);

    const channels: ChannelHealthStatus[] = [];
    
    // Process realtime channel health
    if (healthChecks[0].status === 'fulfilled') {
      channels.push(healthChecks[0].value);
    } else {
      channels.push({
        channel: 'realtime',
        isHealthy: false,
        status: 'offline',
        responseTime: -1,
        lastChecked: new Date().toISOString(),
        errors: [`Health check failed: ${healthChecks[0].reason}`],
        capabilities: []
      });
    }

    // Process normal API channel health
    if (healthChecks[1].status === 'fulfilled') {
      channels.push(healthChecks[1].value);
    } else {
      channels.push({
        channel: 'normal',
        isHealthy: false,
        status: 'offline',
        responseTime: -1,
        lastChecked: new Date().toISOString(),
        errors: [`Health check failed: ${healthChecks[1].reason}`],
        capabilities: []
      });
    }

    // Process human staff channel health
    if (healthChecks[2].status === 'fulfilled') {
      channels.push(healthChecks[2].value);
    } else {
      channels.push({
        channel: 'human',
        isHealthy: false,
        status: 'offline',
        responseTime: -1,
        lastChecked: new Date().toISOString(),
        errors: [`Health check failed: ${healthChecks[2].reason}`],
        capabilities: []
      });
    }

    // Calculate overall system health
    const healthyChannels = channels.filter(c => c.isHealthy).length;
    const totalChannels = channels.length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (healthyChannels === totalChannels) {
      overall = 'healthy';
    } else if (healthyChannels > 0) {
      overall = 'degraded';
    } else {
      overall = 'critical';
    }

    const systemHealth: SystemHealth = {
      overall,
      channels,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    return NextResponse.json(systemHealth);

  } catch (error: any) {
    console.error("Error in GET /api/channels/health:", error);
    return NextResponse.json({ 
      error: error.message,
      overall: 'critical',
      channels: [],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function checkRealtimeChannelHealth(): Promise<ChannelHealthStatus> {
  const startTime = Date.now();
  
  try {
    // Check if session endpoint is responsive (proxy for WebRTC health)
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/session`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.ok;
    
    return {
      channel: 'realtime',
      isHealthy,
      status: isHealthy ? 'active' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors: isHealthy ? [] : [`Session endpoint returned ${response.status}`],
      capabilities: ['voice', 'text', 'function_calls']
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      channel: 'realtime',
      isHealthy: false,
      status: 'offline',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      capabilities: []
    };
  }
}

async function checkNormalAPIChannelHealth(): Promise<ChannelHealthStatus> {
  const startTime = Date.now();
  
  try {
    // Test chat completions endpoint with minimal request
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.ok;
    
    let errors: string[] = [];
    if (!isHealthy) {
      const errorText = await response.text();
      errors.push(`API returned ${response.status}: ${errorText}`);
    }

    return {
      channel: 'normal',
      isHealthy,
      status: isHealthy ? 'active' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors,
      capabilities: ['text', 'function_calls']
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      channel: 'normal',
      isHealthy: false,
      status: 'offline',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      capabilities: []
    };
  }
}

async function checkHumanStaffChannelHealth(): Promise<ChannelHealthStatus> {
  const startTime = Date.now();
  
  try {
    // Check staff availability endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/staff/availability`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.ok;
    
    let errors: string[] = [];
    let staffAvailable = false;
    
    if (isHealthy) {
      try {
        const data = await response.json();
        staffAvailable = data.availability?.available > 0;
        if (!staffAvailable) {
          errors.push('No staff currently available');
        }
      } catch (e) {
        errors.push('Invalid response format from staff API');
      }
    } else {
      errors.push(`Staff API returned ${response.status}`);
    }

    return {
      channel: 'human',
      isHealthy: isHealthy && staffAvailable,
      status: isHealthy ? (staffAvailable ? 'active' : 'degraded') : 'offline',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors,
      capabilities: ['text', 'human_handoff']
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      channel: 'human',
      isHealthy: false,
      status: 'offline',
      responseTime,
      lastChecked: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      capabilities: []
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, channel } = body;

    console.log(`[Channel Health] POST request:`, { action, channel });

    switch (action) {
      case 'check_specific':
        return await checkSpecificChannel(channel);
      
      case 'force_health_check':
        return await forceHealthCheck();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: check_specific, force_health_check' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in POST /api/channels/health:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkSpecificChannel(channelName: string) {
  let healthStatus: ChannelHealthStatus;

  switch (channelName) {
    case 'realtime':
      healthStatus = await checkRealtimeChannelHealth();
      break;
    case 'normal':
      healthStatus = await checkNormalAPIChannelHealth();
      break;
    case 'human':
      healthStatus = await checkHumanStaffChannelHealth();
      break;
    default:
      return NextResponse.json(
        { error: 'Invalid channel name. Supported channels: realtime, normal, human' },
        { status: 400 }
      );
  }

  return NextResponse.json({
    channel: healthStatus,
    timestamp: new Date().toISOString()
  });
}

async function forceHealthCheck() {
  // Perform comprehensive health check
  const startTime = Date.now();
  
  const healthChecks = await Promise.allSettled([
    checkRealtimeChannelHealth(),
    checkNormalAPIChannelHealth(),
    checkHumanStaffChannelHealth()
  ]);

  const results = healthChecks.map((result, index) => {
    const channelNames = ['realtime', 'normal', 'human'];
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        channel: channelNames[index],
        isHealthy: false,
        status: 'offline' as const,
        responseTime: -1,
        lastChecked: new Date().toISOString(),
        errors: [`Health check failed: ${result.reason}`],
        capabilities: []
      };
    }
  });

  const totalTime = Date.now() - startTime;
  const healthyCount = results.filter(r => r.isHealthy).length;

  return NextResponse.json({
    forced: true,
    totalCheckTime: totalTime,
    results,
    summary: {
      total: results.length,
      healthy: healthyCount,
      degraded: results.length - healthyCount,
      overall: healthyCount === results.length ? 'healthy' : 
               healthyCount > 0 ? 'degraded' : 'critical'
    },
    timestamp: new Date().toISOString()
  });
} 