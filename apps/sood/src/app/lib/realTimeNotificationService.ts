/**
 * Real-Time Notification Service for Ticket Marketplace
 * 
 * Handles real-time notifications for buyers, sellers, and admins
 * using WebSockets, email, and push notifications.
 */

interface NotificationData {
  id: string;
  userId: string;
  type: 'TICKET_APPROVED' | 'TICKET_SOLD' | 'PAYMENT_RECEIVED' | 'OFFER_RECEIVED' | 'PRICE_DROP' | 'NEW_MESSAGE';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channels: ('EMAIL' | 'PUSH' | 'SMS' | 'WEBSOCKET')[];
  scheduledFor?: string;
  expiresAt?: string;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  priceAlerts: boolean;
  transactionUpdates: boolean;
}

export class RealTimeNotificationService {
  private wsConnections = new Map<string, WebSocket>();
  private notificationQueue: NotificationData[] = [];
  private isProcessing = false;

  /**
   * Send notification to user
   */
  async sendNotification(notification: Omit<NotificationData, 'id'>): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullNotification: NotificationData = {
      id: notificationId,
      ...notification
    };

    // Add to queue
    this.notificationQueue.push(fullNotification);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processNotificationQueue();
    }

    return notificationId;
  }

  /**
   * Send ticket approval notification
   */
  async notifyTicketApproved(sellerId: string, ticketId: string, ticketTitle: string): Promise<void> {
    await this.sendNotification({
      userId: sellerId,
      type: 'TICKET_APPROVED',
      title: '✅ Ticket Approved!',
      message: `Your ticket "${ticketTitle}" has been approved and is now live on the marketplace.`,
      data: { ticketId, action: 'view_ticket' },
      priority: 'MEDIUM',
      channels: ['EMAIL', 'PUSH', 'WEBSOCKET']
    });
  }

  /**
   * Send ticket sold notification
   */
  async notifyTicketSold(sellerId: string, ticketId: string, ticketTitle: string, salePrice: number): Promise<void> {
    await this.sendNotification({
      userId: sellerId,
      type: 'TICKET_SOLD',
      title: '🎉 Ticket Sold!',
      message: `Great news! Your ticket "${ticketTitle}" sold for $${salePrice}. Funds will be released after the event.`,
      data: { ticketId, salePrice, action: 'view_transaction' },
      priority: 'HIGH',
      channels: ['EMAIL', 'PUSH', 'SMS', 'WEBSOCKET']
    });
  }

  /**
   * Send payment received notification
   */
  async notifyPaymentReceived(buyerId: string, ticketTitle: string, amount: number): Promise<void> {
    await this.sendNotification({
      userId: buyerId,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Payment Confirmed!',
      message: `Your payment of $${amount} for "${ticketTitle}" has been processed. Your tickets are secured!`,
      data: { amount, action: 'view_tickets' },
      priority: 'HIGH',
      channels: ['EMAIL', 'PUSH', 'WEBSOCKET']
    });
  }

  /**
   * Send offer received notification
   */
  async notifyOfferReceived(sellerId: string, ticketTitle: string, offerAmount: number, buyerName: string): Promise<void> {
    await this.sendNotification({
      userId: sellerId,
      type: 'OFFER_RECEIVED',
      title: '💬 New Offer Received!',
      message: `${buyerName} made an offer of $${offerAmount} for your ticket "${ticketTitle}".`,
      data: { offerAmount, buyerName, action: 'view_offers' },
      priority: 'MEDIUM',
      channels: ['EMAIL', 'PUSH', 'WEBSOCKET'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  }

  /**
   * Send price drop alert
   */
  async notifyPriceDrop(userId: string, ticketTitle: string, oldPrice: number, newPrice: number, ticketId: string): Promise<void> {
    const savings = oldPrice - newPrice;
    await this.sendNotification({
      userId,
      type: 'PRICE_DROP',
      title: '📉 Price Drop Alert!',
      message: `"${ticketTitle}" price dropped from $${oldPrice} to $${newPrice}. Save $${savings}!`,
      data: { ticketId, oldPrice, newPrice, savings, action: 'view_ticket' },
      priority: 'MEDIUM',
      channels: ['EMAIL', 'PUSH', 'WEBSOCKET']
    });
  }

  /**
   * Process notification queue
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!;
      
      try {
        // Get user preferences
        const preferences = await this.getUserNotificationPreferences(notification.userId);
        
        // Send via each requested channel
        const promises = notification.channels.map(channel => {
          switch (channel) {
            case 'WEBSOCKET':
              return this.sendWebSocketNotification(notification);
            case 'EMAIL':
              return preferences.email ? this.sendEmailNotification(notification) : Promise.resolve();
            case 'PUSH':
              return preferences.push ? this.sendPushNotification(notification) : Promise.resolve();
            case 'SMS':
              return preferences.sms ? this.sendSMSNotification(notification) : Promise.resolve();
            default:
              return Promise.resolve();
          }
        });
        
        await Promise.allSettled(promises);
        
        // Store notification in database for history
        await this.storeNotification(notification);
        
      } catch (error) {
        console.error('Failed to send notification:', notification.id, error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Send WebSocket notification
   */
  private async sendWebSocketNotification(notification: NotificationData): Promise<void> {
    const ws = this.wsConnections.get(notification.userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'NOTIFICATION',
        data: notification
      }));
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationData): Promise<void> {
    // Mock implementation - integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Sending email to user ${notification.userId}:`, notification.title);
    
    // In production:
    // await emailService.send({
    //   to: userEmail,
    //   subject: notification.title,
    //   html: generateEmailTemplate(notification)
    // });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: NotificationData): Promise<void> {
    // Mock implementation - integrate with push service (Firebase, OneSignal, etc.)
    console.log(`📱 Sending push notification to user ${notification.userId}:`, notification.title);
    
    // In production:
    // await pushService.send({
    //   userId: notification.userId,
    //   title: notification.title,
    //   body: notification.message,
    //   data: notification.data
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: NotificationData): Promise<void> {
    // Mock implementation - integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 Sending SMS to user ${notification.userId}:`, notification.message);
    
    // In production:
    // await smsService.send({
    //   to: userPhone,
    //   message: `${notification.title}: ${notification.message}`
    // });
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Mock implementation - in production, fetch from database
    return {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      priceAlerts: true,
      transactionUpdates: true
    };
  }

  /**
   * Store notification in database
   */
  private async storeNotification(notification: NotificationData): Promise<void> {
    // Mock implementation - in production, store in database
    console.log('💾 Storing notification:', notification.id);
  }

  /**
   * Register WebSocket connection
   */
  registerWebSocketConnection(userId: string, ws: WebSocket): void {
    this.wsConnections.set(userId, ws);
    
    ws.on('close', () => {
      this.wsConnections.delete(userId);
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    // Mock implementation - in production, update database
    console.log(`✅ Marking notification ${notificationId} as read for user ${userId}`);
    return true;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0): Promise<NotificationData[]> {
    // Mock implementation - in production, fetch from database
    return [
      {
        id: 'notif_1',
        userId,
        type: 'TICKET_APPROVED',
        title: '✅ Ticket Approved!',
        message: 'Your concert ticket has been approved.',
        priority: 'MEDIUM',
        channels: ['WEBSOCKET'],
        data: { ticketId: 'ticket_123' }
      }
    ];
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    // Mock implementation - in production, update database
    console.log(`⚙️ Updating notification preferences for user ${userId}:`, preferences);
    return true;
  }

  /**
   * Send bulk notifications (for admin announcements)
   */
  async sendBulkNotification(userIds: string[], notification: Omit<NotificationData, 'id' | 'userId'>): Promise<string[]> {
    const notificationIds: string[] = [];
    
    for (const userId of userIds) {
      const id = await this.sendNotification({
        ...notification,
        userId
      });
      notificationIds.push(id);
    }
    
    return notificationIds;
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    notification: Omit<NotificationData, 'id'>, 
    scheduledFor: Date
  ): Promise<string> {
    const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock implementation - in production, use job queue (Bull, Agenda, etc.)
    console.log(`⏰ Scheduling notification ${notificationId} for ${scheduledFor.toISOString()}`);
    
    setTimeout(() => {
      this.sendNotification(notification);
    }, scheduledFor.getTime() - Date.now());
    
    return notificationId;
  }
}

// Export singleton instance
export const notificationService = new RealTimeNotificationService();

// Export utility functions
export const notificationUtils = {
  formatCurrency: (amount: number, currency: string = 'USD') => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
    
  generateNotificationId: () => 
    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
  isHighPriority: (type: NotificationData['type']) => 
    ['TICKET_SOLD', 'PAYMENT_RECEIVED'].includes(type)
};