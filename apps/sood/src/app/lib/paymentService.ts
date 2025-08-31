/**
 * Payment Service with Escrow Functionality for Ticket Marketplace
 * 
 * Handles secure payments between buyers and sellers with escrow protection,
 * automatic fee deduction, and integration with Stripe and other payment providers.
 */

import { 
  Transaction, 
  PaymentBreakdown, 
  EscrowDetails, 
  PaymentStatus,
  TransactionStatus,
  TransactionEvent 
} from '@/app/types/marketplace';

interface PaymentConfig {
  platformFeePercentage: number;
  processingFeeFixed: number;
  escrowHoldDays: number;
  stripeSecretKey?: string;
  webhookSecret?: string;
}

interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

interface EscrowAccount {
  id: string;
  balance: number;
  currency: string;
  holdUntil: string;
  releasable: boolean;
}

const DEFAULT_CONFIG: PaymentConfig = {
  platformFeePercentage: 0.05, // 5% platform fee
  processingFeeFixed: 0.30, // $0.30 processing fee
  escrowHoldDays: 7, // Hold funds for 7 days
};

/**
 * Main Payment Service Class
 */
export class PaymentService {
  private config: PaymentConfig;
  private stripe: any; // Stripe instance

  constructor(config: Partial<PaymentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeStripe();
  }

  /**
   * Initialize Stripe
   */
  private async initializeStripe() {
    if (typeof window === 'undefined' && this.config.stripeSecretKey) {
      // Server-side Stripe initialization
      try {
        const Stripe = (await import('stripe')).default;
        this.stripe = new Stripe(this.config.stripeSecretKey, {
          apiVersion: '2025-07-30.basil',
        });
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
      }
    }
  }

  /**
   * Calculate payment breakdown including fees
   */
  calculatePaymentBreakdown(
    ticketPrice: number,
    quantity: number = 1,
    currency: string = 'USD'
  ): PaymentBreakdown {
    const subtotal = ticketPrice * quantity;
    const platformFee = Math.round(subtotal * this.config.platformFeePercentage * 100) / 100;
    const processingFee = this.config.processingFeeFixed;
    const total = subtotal + platformFee + processingFee;

    return {
      ticketPrice: subtotal,
      platformFee,
      processingFee,
      total,
      currency
    };
  }

  /**
   * Create payment intent for ticket purchase
   */
  async createPaymentIntent(
    ticketId: string,
    buyerId: string,
    sellerId: string,
    paymentBreakdown: PaymentBreakdown,
    metadata: Record<string, string> = {}
  ): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentBreakdown.total * 100), // Convert to cents
        currency: paymentBreakdown.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          ticketId,
          buyerId,
          sellerId,
          platformFee: paymentBreakdown.platformFee.toString(),
          processingFee: paymentBreakdown.processingFee.toString(),
          ...metadata
        },
        // Hold funds for manual capture (escrow)
        capture_method: 'manual'
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      };

    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm payment and place funds in escrow
   */
  async confirmPayment(
    paymentIntentId: string,
    transactionId: string
  ): Promise<{
    status: PaymentStatus;
    escrowAccount: EscrowAccount;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Retrieve payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Payment intent status is ${paymentIntent.status}, expected requires_capture`);
      }

      // Create escrow account
      const escrowAccount = await this.createEscrowAccount(
        paymentIntent.amount,
        paymentIntent.currency,
        transactionId
      );

      // Update payment intent metadata with escrow info
      await this.stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          ...paymentIntent.metadata,
          escrowAccountId: escrowAccount.id,
          transactionId,
          escrowCreatedAt: new Date().toISOString()
        }
      });

      return {
        status: 'ESCROW' as PaymentStatus,
        escrowAccount
      };

    } catch (error) {
      throw new Error(`Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create escrow account to hold funds
   */
  private async createEscrowAccount(
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<EscrowAccount> {
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + this.config.escrowHoldDays);

    // In a real implementation, this would integrate with actual escrow service
    const escrowAccount: EscrowAccount = {
      id: `escrow_${transactionId}_${Date.now()}`,
      balance: amount / 100, // Convert back to dollars
      currency: currency.toUpperCase(),
      holdUntil: holdUntil.toISOString(),
      releasable: false
    };

    // Store escrow account details (would use database in production)
    await this.storeEscrowAccount(escrowAccount);

    return escrowAccount;
  }

  /**
   * Release funds from escrow to seller
   */
  async releaseFundsToSeller(
    transactionId: string,
    sellerId: string,
    reason: string = 'Transaction completed successfully'
  ): Promise<{
    success: boolean;
    sellerAmount: number;
    platformAmount: number;
  }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      const escrowAccount = await this.getEscrowAccount(transaction.id);

      if (!escrowAccount.releasable && new Date() < new Date(escrowAccount.holdUntil)) {
        throw new Error('Funds are still in escrow hold period');
      }

      // Calculate amounts
      const totalAmount = escrowAccount.balance;
      const platformFee = transaction.pricing.platformFee;
      const processingFee = transaction.pricing.processingFee;
      const sellerAmount = totalAmount - platformFee - processingFee;

      // Capture the payment from Stripe
      const paymentIntentId = transaction.payment.paymentIntentId;
      if (paymentIntentId) {
        await this.stripe.paymentIntents.capture(paymentIntentId);
      }

      // Transfer to seller (would implement actual bank transfer)
      await this.transferToSeller(sellerId, sellerAmount, transaction.pricing.currency);

      // Update escrow account
      await this.updateEscrowAccount(escrowAccount.id, {
        balance: 0,
        releasable: false
      });

      // Log transaction event
      await this.logTransactionEvent(transactionId, {
        type: 'FUNDS_RELEASED',
        description: `Funds released to seller. Amount: ${sellerAmount} ${transaction.pricing.currency}`,
        actor: 'SYSTEM',
        metadata: { 
          sellerAmount, 
          platformFee, 
          processingFee,
          reason 
        }
      });

      return {
        success: true,
        sellerAmount,
        platformAmount: platformFee + processingFee
      };

    } catch (error) {
      throw new Error(`Failed to release funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refund payment to buyer
   */
  async refundToBuyer(
    transactionId: string,
    buyerId: string,
    reason: string,
    partialAmount?: number
  ): Promise<{
    success: boolean;
    refundAmount: number;
    refundId: string;
  }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      const escrowAccount = await this.getEscrowAccount(transaction.id);

      const refundAmount = partialAmount || escrowAccount.balance;
      
      if (refundAmount > escrowAccount.balance) {
        throw new Error('Refund amount exceeds escrowed funds');
      }

      // Process refund through Stripe
      const paymentIntentId = transaction.payment.paymentIntentId;
      let refundId = '';

      if (paymentIntentId) {
        const refund = await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            transactionId,
            buyerId,
            reason
          }
        });
        refundId = refund.id;
      }

      // Update escrow account
      await this.updateEscrowAccount(escrowAccount.id, {
        balance: escrowAccount.balance - refundAmount
      });

      // Log transaction event
      await this.logTransactionEvent(transactionId, {
        type: 'REFUND_PROCESSED',
        description: `Refund processed for buyer. Amount: ${refundAmount} ${transaction.pricing.currency}`,
        actor: 'SYSTEM',
        metadata: { 
          refundAmount, 
          refundId,
          reason 
        }
      });

      return {
        success: true,
        refundAmount,
        refundId
      };

    } catch (error) {
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle dispute resolution
   */
  async handleDispute(
    transactionId: string,
    decision: 'FAVOR_BUYER' | 'FAVOR_SELLER' | 'SPLIT',
    adminUserId: string,
    notes: string
  ): Promise<{
    success: boolean;
    resolution: any;
  }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      const escrowAccount = await this.getEscrowAccount(transaction.id);

      let resolution;

      switch (decision) {
        case 'FAVOR_BUYER':
          resolution = await this.refundToBuyer(
            transactionId,
            transaction.buyerId,
            `Dispute resolved in favor of buyer: ${notes}`
          );
          break;

        case 'FAVOR_SELLER':
          resolution = await this.releaseFundsToSeller(
            transactionId,
            transaction.sellerId,
            `Dispute resolved in favor of seller: ${notes}`
          );
          break;

        case 'SPLIT':
          const halfAmount = escrowAccount.balance / 2;
          
          // Partial refund to buyer
          await this.refundToBuyer(
            transactionId,
            transaction.buyerId,
            'Dispute resolved - split decision',
            halfAmount
          );
          
          // Partial payment to seller
          resolution = await this.releaseFundsToSeller(
            transactionId,
            transaction.sellerId,
            'Dispute resolved - split decision'
          );
          break;

        default:
          throw new Error('Invalid dispute decision');
      }

      // Log dispute resolution
      await this.logTransactionEvent(transactionId, {
        type: 'DISPUTE_RESOLVED',
        description: `Dispute resolved: ${decision}. Notes: ${notes}`,
        actor: 'ADMIN',
        metadata: { 
          decision, 
          adminUserId,
          notes,
          resolution 
        }
      });

      return {
        success: true,
        resolution
      };

    } catch (error) {
      throw new Error(`Failed to handle dispute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get escrow account details
   */
  async getEscrowDetails(transactionId: string): Promise<EscrowAccount> {
    try {
      return await this.getEscrowAccount(transactionId);
    } catch (error) {
      throw new Error(`Failed to get escrow details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if funds can be released from escrow
   */
  async canReleaseFunds(transactionId: string): Promise<boolean> {
    try {
      const escrowAccount = await this.getEscrowAccount(transactionId);
      const holdPeriodExpired = new Date() >= new Date(escrowAccount.holdUntil);
      
      return escrowAccount.releasable || holdPeriodExpired;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process webhook events from payment providers
   */
  async handleWebhook(payload: any, signature: string): Promise<{
    processed: boolean;
    eventType: string;
  }> {
    if (!this.stripe || !this.config.webhookSecret) {
      throw new Error('Webhook handling not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return {
        processed: true,
        eventType: event.type
      };

    } catch (error) {
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    const transactionId = paymentIntent.metadata.transactionId;
    if (transactionId) {
      await this.logTransactionEvent(transactionId, {
        type: 'PAYMENT_CONFIRMED',
        description: 'Payment confirmed by payment provider',
        actor: 'SYSTEM',
        metadata: { paymentIntentId: paymentIntent.id }
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    const transactionId = paymentIntent.metadata.transactionId;
    if (transactionId) {
      await this.logTransactionEvent(transactionId, {
        type: 'PAYMENT_FAILED',
        description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
        actor: 'SYSTEM',
        metadata: { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error 
        }
      });
    }
  }

  private async handleChargeDispute(charge: any): Promise<void> {
    // Handle chargeback disputes
    console.log('Chargeback dispute created:', charge.id);
    // Implement dispute handling logic
  }

  private async storeEscrowAccount(account: EscrowAccount): Promise<void> {
    // In production, store in database
    console.log('Storing escrow account:', account.id);
  }

  private async getEscrowAccount(transactionId: string): Promise<EscrowAccount> {
    // In production, fetch from database
    // This is a mock implementation
    return {
      id: `escrow_${transactionId}`,
      balance: 100,
      currency: 'USD',
      holdUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      releasable: false
    };
  }

  private async updateEscrowAccount(
    accountId: string, 
    updates: Partial<EscrowAccount>
  ): Promise<void> {
    // In production, update database
    console.log('Updating escrow account:', accountId, updates);
  }

  private async getTransaction(transactionId: string): Promise<Transaction> {
    // In production, fetch from database
    // This is a mock implementation
    throw new Error('Mock implementation - replace with database call');
  }

  private async transferToSeller(
    sellerId: string, 
    amount: number, 
    currency: string
  ): Promise<void> {
    // In production, integrate with bank transfer API
    console.log(`Transferring ${amount} ${currency} to seller ${sellerId}`);
  }

  private async logTransactionEvent(
    transactionId: string, 
    event: Omit<TransactionEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    // In production, store in database
    console.log('Transaction event:', transactionId, event);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Export utility functions
export const paymentUtils = {
  calculateBreakdown: (price: number, quantity: number = 1) => 
    paymentService.calculatePaymentBreakdown(price, quantity),
  
  formatCurrency: (amount: number, currency: string = 'USD') => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount)
};