import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// In-memory store for demonstration (in production, use a database)
interface StaffMessage {
  id: string;
  sessionId: string;
  staffId: string;
  customerMessage: string;
  staffResponse?: string;
  timestamp: string;
  status: 'pending' | 'responded' | 'escalated';
  language: string;
}

interface StaffMember {
  id: string;
  name: string;
  isAvailable: boolean;
  languages: string[];
  expertise: string[];
  currentSessions: string[];
}

// Mock staff members for demonstration
const mockStaffMembers: StaffMember[] = [
  {
    id: 'staff_001',
    name: 'Sarah Johnson',
    isAvailable: true,
    languages: ['en-US', 'es-ES'],
    expertise: ['general_support', 'billing'],
    currentSessions: []
  },
  {
    id: 'staff_002', 
    name: 'Mike Chen',
    isAvailable: true,
    languages: ['en-US', 'zh-CN'],
    expertise: ['technical_support', 'api_integration'],
    currentSessions: []
  },
  {
    id: 'staff_003',
    name: 'Anna Williams',
    isAvailable: false,
    languages: ['en-US', 'fr-FR'],
    expertise: ['general_support', 'account_management'],
    currentSessions: ['session_123']
  }
];

// In-memory storage (in production, use a proper database)
let staffMessages: StaffMessage[] = [];
let staffMembers: StaffMember[] = [...mockStaffMembers];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, customerMessage, language, staffId, staffResponse } = body;

    console.log(`[Staff API] ${action} request:`, { sessionId, staffId, language });

    switch (action) {
      case 'send_to_staff':
        return await handleSendToStaff(sessionId, customerMessage, language);
      
      case 'staff_response':
        return await handleStaffResponse(sessionId, staffId, staffResponse);
      
      case 'get_messages':
        return await handleGetMessages(sessionId, staffId);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: send_to_staff, staff_response, get_messages' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in /api/staff/messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const staffId = searchParams.get('staffId');

    if (sessionId) {
      // Get messages for a specific session
      const sessionMessages = staffMessages.filter(msg => msg.sessionId === sessionId);
      return NextResponse.json({ 
        messages: sessionMessages,
        count: sessionMessages.length
      });
    }

    if (staffId) {
      // Get messages for a specific staff member
      const staffMessages_filtered = staffMessages.filter(msg => msg.staffId === staffId);
      return NextResponse.json({ 
        messages: staffMessages_filtered,
        count: staffMessages_filtered.length
      });
    }

    // Get all pending messages
    const pendingMessages = staffMessages.filter(msg => msg.status === 'pending');
    return NextResponse.json({ 
      messages: pendingMessages,
      count: pendingMessages.length
    });

  } catch (error: any) {
    console.error("Error in GET /api/staff/messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSendToStaff(sessionId: string, customerMessage: string, language: string) {
  // Find available staff member
  const availableStaff = staffMembers.find(staff => 
    staff.isAvailable && 
    staff.languages.includes(language) &&
    staff.currentSessions.length < 3 // Max 3 concurrent sessions
  );

  if (!availableStaff) {
    return NextResponse.json({
      error: 'No staff available',
      message: 'All staff members are currently busy. Please try again later.',
      availableAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Estimate 5 min wait
    }, { status: 503 });
  }

  // Assign staff to session
  const staffMessage: StaffMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    staffId: availableStaff.id,
    customerMessage,
    timestamp: new Date().toISOString(),
    status: 'pending',
    language
  };

  // Add to storage
  staffMessages.push(staffMessage);
  
  // Update staff availability
  const staff = staffMembers.find(s => s.id === availableStaff.id);
  if (staff && !staff.currentSessions.includes(sessionId)) {
    staff.currentSessions.push(sessionId);
  }

  // Simulate staff processing time
  setTimeout(async () => {
    await generateStaffResponse(staffMessage.id, customerMessage, language);
  }, 2000 + Math.random() * 3000); // 2-5 second response time

  return NextResponse.json({
    success: true,
    messageId: staffMessage.id,
    staffId: availableStaff.id,
    staffName: availableStaff.name,
    estimatedResponseTime: '2-5 minutes',
    message: `Your message has been sent to ${availableStaff.name}. They will respond shortly.`
  });
}

async function handleStaffResponse(sessionId: string, staffId: string, staffResponse: string) {
  const message = staffMessages.find(msg => 
    msg.sessionId === sessionId && 
    msg.staffId === staffId && 
    msg.status === 'pending'
  );

  if (!message) {
    return NextResponse.json(
      { error: 'Message not found or already responded' },
      { status: 404 }
    );
  }

  // Update message with staff response
  message.staffResponse = staffResponse;
  message.status = 'responded';

  console.log(`[Staff API] Staff ${staffId} responded to session ${sessionId}`);

  return NextResponse.json({
    success: true,
    messageId: message.id,
    response: staffResponse,
    timestamp: new Date().toISOString()
  });
}

async function handleGetMessages(sessionId?: string, staffId?: string) {
  let filteredMessages = staffMessages;

  if (sessionId) {
    filteredMessages = filteredMessages.filter(msg => msg.sessionId === sessionId);
  }

  if (staffId) {
    filteredMessages = filteredMessages.filter(msg => msg.staffId === staffId);
  }

  return NextResponse.json({
    messages: filteredMessages,
    count: filteredMessages.length
  });
}

async function generateStaffResponse(messageId: string, customerMessage: string, language: string) {
  const message = staffMessages.find(msg => msg.id === messageId);
  if (!message || message.status !== 'pending') return;

  // Generate appropriate staff response based on message content
  let response = '';
  const lowerMessage = customerMessage.toLowerCase();

  if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('refund')) {
    response = "I understand you have a billing inquiry. Let me review your account details and assist you with this matter. Could you please provide your account email or customer ID?";
  } else if (lowerMessage.includes('technical') || lowerMessage.includes('api') || lowerMessage.includes('integration')) {
    response = "I see you're experiencing a technical issue. I'm here to help you resolve this. Could you please provide more details about the specific problem you're encountering?";
  } else if (lowerMessage.includes('cancel') || lowerMessage.includes('close account')) {
    response = "I'm sorry to hear you're considering canceling your account. Before we proceed, is there anything specific that's causing you to want to cancel? I'd like to see if we can address your concerns.";
  } else {
    response = `Thank you for contacting our support team. I've received your message: "${customerMessage.substring(0, 50)}${customerMessage.length > 50 ? '...' : ''}". I'm here to help you with whatever you need. How can I assist you today?`;
  }

  // Add language-specific greeting if not English
  if (language === 'es-ES') {
    response = "Hola, " + response;
  } else if (language === 'fr-FR') {
    response = "Bonjour, " + response;
  } else if (language === 'zh-CN') {
    response = "您好，" + response;
  }

  message.staffResponse = response;
  message.status = 'responded';

  console.log(`[Staff API] Generated response for message ${messageId}`);
} 