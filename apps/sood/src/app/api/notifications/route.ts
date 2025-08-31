/**
 * Notifications API Endpoint
 * 
 * Handles user notifications, preferences, and real-time updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { notificationService } from '@/app/lib/realTimeNotificationService';
import { APIResponse } from '@/app/types/marketplace';

// Notification preferences schema
const PreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  marketing: z.boolean().optional(),
  priceAlerts: z.boolean().optional(),
  transactionUpdates: z.boolean().optional()
});

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'userId is required' }
      } as APIResponse, { status: 400 });
    }

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        hasMore: notifications.length === limit
      },
      metadata: {
        timestamp: new Date().toISOString(),
        pagination: { limit, offset, count: notifications.length }
      }
    } as APIResponse);
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch notifications' }
    } as APIResponse, { status: 500 });
  }
}

// POST - Send notification or update preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'mark_read':
        const { notificationId, userId } = body;
        if (!notificationId || !userId) {
          return NextResponse.json({
            success: false,
            error: { code: 'MISSING_PARAMETERS', message: 'notificationId and userId are required' }
          } as APIResponse, { status: 400 });
        }
        
        const marked = await notificationService.markAsRead(notificationId, userId);
        return NextResponse.json({
          success: marked,
          message: marked ? 'Notification marked as read' : 'Failed to mark notification'
        } as APIResponse);
        
      case 'update_preferences':
        const { userId: prefUserId, preferences } = body;
        if (!prefUserId) {
          return NextResponse.json({
            success: false,
            error: { code: 'MISSING_PARAMETER', message: 'userId is required' }
          } as APIResponse, { status: 400 });
        }
        
        const validation = PreferencesSchema.safeParse(preferences);
        if (!validation.success) {
          return NextResponse.json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid preferences', details: validation.error }
          } as APIResponse, { status: 400 });
        }
        
        const updated = await notificationService.updateUserPreferences(prefUserId, validation.data);
        return NextResponse.json({
          success: updated,
          message: updated ? 'Preferences updated successfully' : 'Failed to update preferences'
        } as APIResponse);
        
      case 'send_test':
        // Admin-only test notification
        const { testUserId, testMessage } = body;
        if (!testUserId || !testMessage) {
          return NextResponse.json({
            success: false,
            error: { code: 'MISSING_PARAMETERS', message: 'testUserId and testMessage are required' }
          } as APIResponse, { status: 400 });
        }
        
        const testNotificationId = await notificationService.sendNotification({
          userId: testUserId,
          type: 'NEW_MESSAGE',
          title: '🗋 Test Notification',
          message: testMessage,
          priority: 'LOW',
          channels: ['WEBSOCKET', 'EMAIL']
        });
        
        return NextResponse.json({
          success: true,
          data: { notificationId: testNotificationId },
          message: 'Test notification sent'
        } as APIResponse);
        
      default:
        return NextResponse.json({
          success: false,
          error: { code: 'INVALID_ACTION', message: 'Unknown action' }
        } as APIResponse, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { 
        code: 'ACTION_ERROR', 
        message: error instanceof Error ? error.message : 'Action failed'
      }
    } as APIResponse, { status: 500 });
  }
}

// PUT - Bulk mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationIds } = body;
    
    if (!userId || !Array.isArray(notificationIds)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'userId and notificationIds array are required' }
      } as APIResponse, { status: 400 });
    }
    
    const results = await Promise.allSettled(
      notificationIds.map(id => notificationService.markAsRead(id, userId))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    return NextResponse.json({
      success: true,
      data: {
        total: notificationIds.length,
        successful: successCount,
        failed: notificationIds.length - successCount
      },
      message: `${successCount}/${notificationIds.length} notifications marked as read`
    } as APIResponse);
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'BULK_UPDATE_ERROR', message: 'Failed to update notifications' }
    } as APIResponse, { status: 500 });
  }
}