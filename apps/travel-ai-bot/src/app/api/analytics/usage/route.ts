import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

interface ChannelUsageMetrics {
  channel: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  peakUsageHour: number;
  languages: Record<string, number>;
  userSatisfactionScore?: number;
}

interface TransferMetrics {
  from: string;
  to: string;
  count: number;
  successRate: number;
  averageTime: number;
  commonReasons: Record<string, number>;
}

interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  channelUsage: ChannelUsageMetrics[];
  transfers: TransferMetrics[];
  timestamp: string;
  period: string;
}

// In-memory analytics storage (in production, use a proper analytics database)
let analyticsData = {
  sessions: new Map<string, {
    id: string;
    startTime: string;
    endTime?: string;
    messageCount: number;
    channels: string[];
    transfers: Array<{from: string; to: string; timestamp: string; reason: string}>;
    language: string;
  }>(),
  messages: [] as Array<{
    id: string;
    sessionId: string;
    channel: string;
    timestamp: string;
    responseTime: number;
    success: boolean;
    language: string;
    error?: string;
  }>,
  transfers: [] as Array<{
    sessionId: string;
    from: string;
    to: string;
    timestamp: string;
    reason: string;
    success: boolean;
    duration: number;
  }>
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '24h';
    const channel = searchParams.get('channel');
    const metric = searchParams.get('metric');

    console.log(`[Analytics] Usage request:`, { period, channel, metric });

    const timeRange = calculateTimeRange(period);
    const metrics = await calculateSystemMetrics(timeRange, channel || undefined);

    if (metric) {
      return NextResponse.json(getSpecificMetric(metrics, metric));
    }

    return NextResponse.json(metrics);

  } catch (error: any) {
    console.error("Error in GET /api/analytics/usage:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    console.log(`[Analytics] POST request:`, { action });

    switch (action) {
      case 'track_message':
        return await trackMessage(data);
      
      case 'track_session':
        return await trackSession(data);
      
      case 'track_transfer':
        return await trackTransfer(data);
      
      case 'get_real_time_stats':
        return await getRealTimeStats();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: track_message, track_session, track_transfer, get_real_time_stats' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in POST /api/analytics/usage:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateTimeRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (period) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

async function calculateSystemMetrics(timeRange: { start: Date; end: Date }, channelFilter?: string): Promise<SystemMetrics> {
  const { start, end } = timeRange;

  // Filter data by time range
  const filteredMessages = analyticsData.messages.filter(msg => {
    const msgTime = new Date(msg.timestamp);
    return msgTime >= start && msgTime <= end && (!channelFilter || msg.channel === channelFilter);
  });

  const filteredTransfers = analyticsData.transfers.filter(transfer => {
    const transferTime = new Date(transfer.timestamp);
    return transferTime >= start && transferTime <= end;
  });

  const filteredSessions = Array.from(analyticsData.sessions.values()).filter(session => {
    const sessionTime = new Date(session.startTime);
    return sessionTime >= start && sessionTime <= end;
  });

  // Calculate channel usage metrics
  const channelGroups = groupBy(filteredMessages, 'channel');
  const channelUsage: ChannelUsageMetrics[] = Object.entries(channelGroups).map(([channel, messages]) => {
    const successful = messages.filter(m => m.success).length;
    const failed = messages.length - successful;
    const avgResponseTime = messages.reduce((sum, m) => sum + m.responseTime, 0) / messages.length || 0;
    
    // Calculate peak usage hour
    const hourlyUsage = groupBy(messages, (msg: any) => new Date(msg.timestamp).getHours().toString());
    const peakHour = Object.entries(hourlyUsage).reduce(
      (peak, [hour, msgs]) => msgs.length > peak.count ? { hour: parseInt(hour), count: msgs.length } : peak,
      { hour: 0, count: 0 }
    );

    // Language distribution
    const languages = messages.reduce((acc, msg) => {
      acc[msg.language] = (acc[msg.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      channel,
      totalMessages: messages.length,
      successfulMessages: successful,
      failedMessages: failed,
      averageResponseTime: Math.round(avgResponseTime),
      peakUsageHour: peakHour.hour,
      languages,
      userSatisfactionScore: calculateSatisfactionScore(channel, successful, failed)
    };
  });

  // Calculate transfer metrics
  const transferGroups = groupBy(filteredTransfers, (transfer: any) => `${transfer.from}-${transfer.to}`);
  const transferMetrics: TransferMetrics[] = Object.entries(transferGroups).map(([route, transfers]) => {
    const [from, to] = route.split('-');
    const successful = transfers.filter(t => t.success).length;
    const avgTime = transfers.reduce((sum, t) => sum + t.duration, 0) / transfers.length || 0;
    
    const reasons = transfers.reduce((acc, t) => {
      acc[t.reason] = (acc[t.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      from,
      to,
      count: transfers.length,
      successRate: transfers.length > 0 ? successful / transfers.length : 0,
      averageTime: Math.round(avgTime),
      commonReasons: reasons
    };
  });

  // Calculate session metrics
  const activeSessions = filteredSessions.filter(s => !s.endTime).length;
  const completedSessions = filteredSessions.filter(s => s.endTime);
  const avgDuration = completedSessions.length > 0 
    ? completedSessions.reduce((sum, s) => {
        const duration = new Date(s.endTime!).getTime() - new Date(s.startTime).getTime();
        return sum + duration;
      }, 0) / completedSessions.length / 1000 / 60 // Convert to minutes
    : 0;

  return {
    totalSessions: filteredSessions.length,
    activeSessions,
    totalMessages: filteredMessages.length,
    averageSessionDuration: Math.round(avgDuration),
    channelUsage,
    transfers: transferMetrics,
    timestamp: new Date().toISOString(),
    period: `${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`
  };
}

function calculateSatisfactionScore(channel: string, successful: number, failed: number): number {
  const total = successful + failed;
  if (total === 0) return 0;
  
  const successRate = successful / total;
  
  // Channel-specific adjustments
  let baseScore = successRate * 100;
  
  switch (channel) {
    case 'human':
      baseScore = Math.min(baseScore + 10, 100); // Human channel gets bonus
      break;
    case 'realtime':
      baseScore = Math.max(baseScore - 5, 0); // Realtime might have more issues
      break;
    default:
      break;
  }
  
  return Math.round(baseScore);
}

async function trackMessage(data: any) {
  const messageData = {
    id: data.id || crypto.randomUUID(),
    sessionId: data.sessionId,
    channel: data.channel,
    timestamp: new Date().toISOString(),
    responseTime: data.responseTime || 0,
    success: data.success !== false,
    language: data.language || 'en-US',
    error: data.error
  };

  analyticsData.messages.push(messageData);

  // Keep only last 10000 messages to prevent memory overflow
  if (analyticsData.messages.length > 10000) {
    analyticsData.messages = analyticsData.messages.slice(-5000);
  }

  return NextResponse.json({
    success: true,
    messageId: messageData.id,
    timestamp: messageData.timestamp
  });
}

async function trackSession(data: any) {
  const { sessionId, action, ...sessionData } = data;

  if (action === 'start') {
    analyticsData.sessions.set(sessionId, {
      id: sessionId,
      startTime: new Date().toISOString(),
      messageCount: 0,
      channels: [sessionData.channel || 'normal'],
      transfers: [],
      language: sessionData.language || 'en-US'
    });
  } else if (action === 'end') {
    const session = analyticsData.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date().toISOString();
    }
  } else if (action === 'update') {
    const session = analyticsData.sessions.get(sessionId);
    if (session) {
      if (sessionData.messageCount !== undefined) {
        session.messageCount = sessionData.messageCount;
      }
      if (sessionData.channel && !session.channels.includes(sessionData.channel)) {
        session.channels.push(sessionData.channel);
      }
    }
  }

  return NextResponse.json({
    success: true,
    sessionId,
    action,
    timestamp: new Date().toISOString()
  });
}

async function trackTransfer(data: any) {
  const transferData = {
    sessionId: data.sessionId,
    from: data.from,
    to: data.to,
    timestamp: new Date().toISOString(),
    reason: data.reason || 'unknown',
    success: data.success !== false,
    duration: data.duration || 0
  };

  analyticsData.transfers.push(transferData);

  // Update session transfer history
  const session = analyticsData.sessions.get(data.sessionId);
  if (session) {
    session.transfers.push({
      from: transferData.from,
      to: transferData.to,
      timestamp: transferData.timestamp,
      reason: transferData.reason
    });
  }

  return NextResponse.json({
    success: true,
    transferId: `${transferData.sessionId}-${Date.now()}`,
    timestamp: transferData.timestamp
  });
}

async function getRealTimeStats() {
  const now = new Date();
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

  const recentMessages = analyticsData.messages.filter(msg => 
    new Date(msg.timestamp) >= last5Minutes
  );

  const recentTransfers = analyticsData.transfers.filter(transfer =>
    new Date(transfer.timestamp) >= last5Minutes
  );

  const activeSessions = Array.from(analyticsData.sessions.values()).filter(s => !s.endTime);

  return NextResponse.json({
    realTime: {
      activeSessions: activeSessions.length,
      messagesLast5Min: recentMessages.length,
      transfersLast5Min: recentTransfers.length,
      channelDistribution: recentMessages.reduce((acc, msg) => {
        acc[msg.channel] = (acc[msg.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageResponseTime: recentMessages.length > 0 
        ? Math.round(recentMessages.reduce((sum, msg) => sum + msg.responseTime, 0) / recentMessages.length)
        : 0,
      errorRate: recentMessages.length > 0
        ? recentMessages.filter(msg => !msg.success).length / recentMessages.length
        : 0
    },
    timestamp: new Date().toISOString()
  });
}

function getSpecificMetric(metrics: SystemMetrics, metric: string) {
  switch (metric) {
    case 'channels':
      return { channelUsage: metrics.channelUsage, timestamp: metrics.timestamp };
    case 'transfers':
      return { transfers: metrics.transfers, timestamp: metrics.timestamp };
    case 'sessions':
      return { 
        totalSessions: metrics.totalSessions,
        activeSessions: metrics.activeSessions,
        averageSessionDuration: metrics.averageSessionDuration,
        timestamp: metrics.timestamp 
      };
    case 'summary':
      return {
        totalSessions: metrics.totalSessions,
        totalMessages: metrics.totalMessages,
        channelCount: metrics.channelUsage.length,
        transferCount: metrics.transfers.reduce((sum, t) => sum + t.count, 0),
        timestamp: metrics.timestamp
      };
    default:
      return metrics;
  }
}

function groupBy<T>(array: T[], key: string | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : (item as any)[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey]!.push(item);
    return groups;
  }, {} as Record<string, T[]>);
} 