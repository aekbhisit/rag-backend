import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Import staff data structure (in production, this would be from a database)
interface StaffMember {
  id: string;
  name: string;
  isAvailable: boolean;
  languages: string[];
  expertise: string[];
  currentSessions: string[];
  status: 'online' | 'busy' | 'away' | 'offline';
  lastActivity: string;
}

// Mock staff members (in production, fetch from database)
let staffMembers: StaffMember[] = [
  {
    id: 'staff_001',
    name: 'Sarah Johnson',
    isAvailable: true,
    languages: ['en-US', 'es-ES'],
    expertise: ['general_support', 'billing'],
    currentSessions: [],
    status: 'online',
    lastActivity: new Date().toISOString()
  },
  {
    id: 'staff_002', 
    name: 'Mike Chen',
    isAvailable: true,
    languages: ['en-US', 'zh-CN'],
    expertise: ['technical_support', 'api_integration'],
    currentSessions: [],
    status: 'online',
    lastActivity: new Date().toISOString()
  },
  {
    id: 'staff_003',
    name: 'Anna Williams',
    isAvailable: false,
    languages: ['en-US', 'fr-FR'],
    expertise: ['general_support', 'account_management'],
    currentSessions: ['session_123'],
    status: 'busy',
    lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 min ago
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');
    const expertise = searchParams.get('expertise');
    const includeUnavailable = searchParams.get('includeUnavailable') === 'true';

    console.log(`[Staff Availability] GET request:`, { language, expertise, includeUnavailable });

    let filteredStaff = staffMembers;

    // Filter by language
    if (language) {
      filteredStaff = filteredStaff.filter(staff => 
        staff.languages.includes(language)
      );
    }

    // Filter by expertise
    if (expertise) {
      filteredStaff = filteredStaff.filter(staff => 
        staff.expertise.includes(expertise)
      );
    }

    // Filter by availability unless includeUnavailable is true
    if (!includeUnavailable) {
      filteredStaff = filteredStaff.filter(staff => 
        staff.isAvailable && staff.currentSessions.length < 3
      );
    }

    // Calculate availability statistics
    const totalStaff = staffMembers.length;
    const availableStaff = staffMembers.filter(s => s.isAvailable && s.currentSessions.length < 3).length;
    const busyStaff = staffMembers.filter(s => !s.isAvailable || s.currentSessions.length >= 3).length;
    const onlineStaff = staffMembers.filter(s => s.status === 'online').length;

    const availability = {
      total: totalStaff,
      available: availableStaff,
      busy: busyStaff,
      online: onlineStaff,
      offline: totalStaff - onlineStaff,
      averageResponseTime: calculateAverageResponseTime(),
      estimatedWaitTime: calculateEstimatedWaitTime(availableStaff)
    };

    return NextResponse.json({
      staff: filteredStaff.map(staff => ({
        id: staff.id,
        name: staff.name,
        isAvailable: staff.isAvailable,
        languages: staff.languages,
        expertise: staff.expertise,
        currentSessionCount: staff.currentSessions.length,
        status: staff.status,
        lastActivity: staff.lastActivity
      })),
      availability,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error in GET /api/staff/availability:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, staffId, status, sessionId } = body;

    console.log(`[Staff Availability] POST request:`, { action, staffId, status, sessionId });

    switch (action) {
      case 'update_status':
        return await updateStaffStatus(staffId, status);
      
      case 'assign_session':
        return await assignSessionToStaff(staffId, sessionId);
      
      case 'remove_session':
        return await removeSessionFromStaff(staffId, sessionId);
      
      case 'find_best_match':
        return await findBestStaffMatch(body.language, body.expertise, body.priority);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: update_status, assign_session, remove_session, find_best_match' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in POST /api/staff/availability:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateStaffStatus(staffId: string, status: 'online' | 'busy' | 'away' | 'offline') {
  const staff = staffMembers.find(s => s.id === staffId);
  
  if (!staff) {
    return NextResponse.json(
      { error: 'Staff member not found' },
      { status: 404 }
    );
  }

  staff.status = status;
  staff.lastActivity = new Date().toISOString();
  
  // Update availability based on status
  staff.isAvailable = status === 'online' && staff.currentSessions.length < 3;

  console.log(`[Staff Availability] Updated ${staffId} status to ${status}`);

  return NextResponse.json({
    success: true,
    staffId,
    status,
    isAvailable: staff.isAvailable,
    timestamp: staff.lastActivity
  });
}

async function assignSessionToStaff(staffId: string, sessionId: string) {
  const staff = staffMembers.find(s => s.id === staffId);
  
  if (!staff) {
    return NextResponse.json(
      { error: 'Staff member not found' },
      { status: 404 }
    );
  }

  if (staff.currentSessions.includes(sessionId)) {
    return NextResponse.json(
      { error: 'Session already assigned to this staff member' },
      { status: 400 }
    );
  }

  if (staff.currentSessions.length >= 3) {
    return NextResponse.json(
      { error: 'Staff member at maximum capacity (3 sessions)' },
      { status: 409 }
    );
  }

  staff.currentSessions.push(sessionId);
  staff.lastActivity = new Date().toISOString();
  
  // Update availability if at capacity
  if (staff.currentSessions.length >= 3) {
    staff.isAvailable = false;
  }

  console.log(`[Staff Availability] Assigned session ${sessionId} to ${staffId}`);

  return NextResponse.json({
    success: true,
    staffId,
    sessionId,
    currentSessionCount: staff.currentSessions.length,
    isAvailable: staff.isAvailable,
    timestamp: staff.lastActivity
  });
}

async function removeSessionFromStaff(staffId: string, sessionId: string) {
  const staff = staffMembers.find(s => s.id === staffId);
  
  if (!staff) {
    return NextResponse.json(
      { error: 'Staff member not found' },
      { status: 404 }
    );
  }

  const sessionIndex = staff.currentSessions.indexOf(sessionId);
  if (sessionIndex === -1) {
    return NextResponse.json(
      { error: 'Session not found for this staff member' },
      { status: 404 }
    );
  }

  staff.currentSessions.splice(sessionIndex, 1);
  staff.lastActivity = new Date().toISOString();
  
  // Update availability if was at capacity
  if (staff.status === 'online') {
    staff.isAvailable = staff.currentSessions.length < 3;
  }

  console.log(`[Staff Availability] Removed session ${sessionId} from ${staffId}`);

  return NextResponse.json({
    success: true,
    staffId,
    sessionId,
    currentSessionCount: staff.currentSessions.length,
    isAvailable: staff.isAvailable,
    timestamp: staff.lastActivity
  });
}

async function findBestStaffMatch(language?: string, expertise?: string, priority: 'speed' | 'expertise' | 'language' = 'speed') {
  let availableStaff = staffMembers.filter(staff => 
    staff.isAvailable && staff.status === 'online' && staff.currentSessions.length < 3
  );

  if (availableStaff.length === 0) {
    return NextResponse.json({
      match: null,
      reason: 'No staff currently available',
      estimatedWaitTime: calculateEstimatedWaitTime(0),
      alternatives: {
        totalStaff: staffMembers.length,
        busyStaff: staffMembers.filter(s => s.currentSessions.length > 0).length,
        nextAvailableAt: estimateNextAvailability()
      }
    });
  }

  // Filter by language if specified
  if (language) {
    const languageMatches = availableStaff.filter(staff => staff.languages.includes(language));
    if (languageMatches.length > 0) {
      availableStaff = languageMatches;
    }
  }

  // Filter by expertise if specified
  if (expertise) {
    const expertiseMatches = availableStaff.filter(staff => staff.expertise.includes(expertise));
    if (expertiseMatches.length > 0) {
      availableStaff = expertiseMatches;
    }
  }

  // Sort by priority
  switch (priority) {
    case 'speed':
      // Sort by lowest current session count, then by last activity
      availableStaff.sort((a, b) => {
        if (a.currentSessions.length !== b.currentSessions.length) {
          return a.currentSessions.length - b.currentSessions.length;
        }
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
      break;
    
    case 'expertise':
      // Sort by expertise match, then by session count
      availableStaff.sort((a, b) => {
        const aExpertiseMatch = expertise ? (a.expertise.includes(expertise) ? 1 : 0) : 0;
        const bExpertiseMatch = expertise ? (b.expertise.includes(expertise) ? 1 : 0) : 0;
        if (aExpertiseMatch !== bExpertiseMatch) {
          return bExpertiseMatch - aExpertiseMatch;
        }
        return a.currentSessions.length - b.currentSessions.length;
      });
      break;
    
    case 'language':
      // Sort by language match, then by session count
      availableStaff.sort((a, b) => {
        const aLanguageMatch = language ? (a.languages.includes(language) ? 1 : 0) : 0;
        const bLanguageMatch = language ? (b.languages.includes(language) ? 1 : 0) : 0;
        if (aLanguageMatch !== bLanguageMatch) {
          return bLanguageMatch - aLanguageMatch;
        }
        return a.currentSessions.length - b.currentSessions.length;
      });
      break;
  }

  const bestMatch = availableStaff[0];

  return NextResponse.json({
    match: {
      id: bestMatch.id,
      name: bestMatch.name,
      languages: bestMatch.languages,
      expertise: bestMatch.expertise,
      currentSessionCount: bestMatch.currentSessions.length,
      estimatedResponseTime: calculateResponseTimeForStaff(bestMatch),
      matchReasons: getMatchReasons(bestMatch, language, expertise)
    },
    alternatives: availableStaff.slice(1, 3).map(staff => ({
      id: staff.id,
      name: staff.name,
      currentSessionCount: staff.currentSessions.length,
      estimatedResponseTime: calculateResponseTimeForStaff(staff)
    })),
    timestamp: new Date().toISOString()
  });
}

function calculateAverageResponseTime(): string {
  // Simulate calculation based on staff workload
  const totalSessions = staffMembers.reduce((sum, staff) => sum + staff.currentSessions.length, 0);
  const availableStaff = staffMembers.filter(s => s.isAvailable).length;
  
  if (availableStaff === 0) return '10-15 minutes';
  
  const avgLoad = totalSessions / availableStaff;
  if (avgLoad < 1) return '30 seconds - 2 minutes';
  if (avgLoad < 2) return '2-5 minutes';
  return '5-10 minutes';
}

function calculateEstimatedWaitTime(availableCount: number): string {
  if (availableCount === 0) return '10-15 minutes';
  if (availableCount >= 2) return 'Immediate';
  return '1-3 minutes';
}

function calculateResponseTimeForStaff(staff: StaffMember): string {
  switch (staff.currentSessions.length) {
    case 0: return '30 seconds - 1 minute';
    case 1: return '1-3 minutes';
    case 2: return '3-5 minutes';
    default: return '5-10 minutes';
  }
}

function getMatchReasons(staff: StaffMember, language?: string, expertise?: string): string[] {
  const reasons: string[] = [];
  
  if (staff.currentSessions.length === 0) {
    reasons.push('Immediately available');
  } else {
    reasons.push(`Low workload (${staff.currentSessions.length} active sessions)`);
  }
  
  if (language && staff.languages.includes(language)) {
    reasons.push(`Speaks ${language}`);
  }
  
  if (expertise && staff.expertise.includes(expertise)) {
    reasons.push(`Expert in ${expertise}`);
  }
  
  return reasons;
}

function estimateNextAvailability(): string {
  // Estimate when next staff member will be available
  const busyStaff = staffMembers.filter(s => s.currentSessions.length > 0);
  if (busyStaff.length === 0) return new Date().toISOString();
  
  // Assume average session length of 10 minutes
  const nextAvailable = new Date(Date.now() + 10 * 60 * 1000);
  return nextAvailable.toISOString();
} 