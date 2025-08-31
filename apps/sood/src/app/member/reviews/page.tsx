"use client";

import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Breadcrumb, { breadcrumbConfigs } from '@/app/components/Breadcrumb';
import { StarIcon, UserIcon, CalendarIcon, MapPinIcon, PencilIcon, TrashIcon, EyeIcon, FlagIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Review {
  id: string;
  orderId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  sellerName: string;
  sellerAvatar: string;
  rating: number;
  comment: string;
  reviewDate: string;
  type: 'buyer' | 'seller';
  status: 'published' | 'pending' | 'flagged';
  helpful: number;
  images?: string[];
  response?: {
    text: string;
    date: string;
  };
}

interface ReviewFormData {
  rating: number;
  comment: string;
  wouldRecommend: boolean;
  images: File[];
}

const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'write'>('given');
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>({
    rating: 0,
    comment: '',
    wouldRecommend: true,
    images: []
  });

  // Mock data
  const givenReviews: Review[] = [
    {
      id: '1',
      orderId: 'ORD-001',
      eventTitle: 'Hamilton Broadway',
      eventDate: '2024-12-01',
      venue: 'Richard Rodgers Theatre',
      sellerName: 'Broadway Direct',
      sellerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Broadway',
      rating: 5,
      comment: 'Excellent seats! The seller was very responsive and the tickets were delivered exactly as promised. Great experience overall.',
      reviewDate: '2024-10-20',
      type: 'buyer',
      status: 'published',
      helpful: 12,
      response: {
        text: 'Thank you for the wonderful review! We appreciate your business.',
        date: '2024-10-21'
      }
    },
    {
      id: '2',
      orderId: 'ORD-002',
      eventTitle: 'NBA Finals Game 7',
      eventDate: '2024-10-25',
      venue: 'Chase Center',
      sellerName: 'Sports Hub',
      sellerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sports',
      rating: 4,
      comment: 'Good tickets, arrived on time. The view was as described but could have been slightly better for the price.',
      reviewDate: '2024-10-26',
      type: 'buyer',
      status: 'published',
      helpful: 8
    }
  ];

  const receivedReviews: Review[] = [
    {
      id: '3',
      orderId: 'ORD-003',
      eventTitle: 'Taylor Swift Concert',
      eventDate: '2024-12-15',
      venue: 'MetLife Stadium',
      sellerName: 'Sarah Johnson',
      sellerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      rating: 5,
      comment: 'Amazing seller! Quick response, authentic tickets, and smooth transaction.',
      reviewDate: '2024-10-18',
      type: 'seller',
      status: 'published',
      helpful: 15
    }
  ];

  const pendingOrders = [
    {
      id: 'ORD-004',
      eventTitle: 'Broadway Show - Lion King',
      eventDate: '2024-11-30',
      venue: 'Minskoff Theatre',
      seller: 'Theater Pro',
      completed: true
    }
  ];

  const StarRating: React.FC<{ rating: number; onChange?: (rating: number) => void; readonly?: boolean }> = ({ 
    rating, 
    onChange, 
    readonly = false 
  }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          {star <= rating ? (
            <StarIconSolid className="w-5 h-5 text-yellow-400" />
          ) : (
            <StarIcon className="w-5 h-5 text-gray-300" />
          )}
        </button>
      ))}
    </div>
  );

  const handleSubmitReview = () => {
    // Handle review submission
    console.log('Submitting review:', reviewForm);
    setShowReviewForm(false);
    setReviewForm({ rating: 0, comment: '', wouldRecommend: true, images: [] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReviewForm(prev => ({
        ...prev,
        images: [...prev.images, ...Array.from(e.target.files!)]
      }));
    }
  };

  const ReviewCard: React.FC<{ review: Review; showActions?: boolean }> = ({ review, showActions = false }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start space-x-4">
        <img
          src={review.sellerAvatar}
          alt={review.sellerName}
          className="w-12 h-12 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{review.eventTitle}</h3>
              <p className="text-sm text-gray-600">{review.type === 'buyer' ? `Seller: ${review.sellerName}` : `Buyer: ${review.sellerName}`}</p>
            </div>
            <div className="text-right">
              <StarRating rating={review.rating} readonly />
              <p className="text-xs text-gray-500 mt-1">{new Date(review.reviewDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {new Date(review.eventDate).toLocaleDateString()}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPinIcon className="w-4 h-4 mr-2" />
              {review.venue}
            </div>
          </div>

          <p className="text-gray-700 mb-4">{review.comment}</p>

          {review.response && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <UserIcon className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Seller Response</span>
                <span className="text-xs text-blue-600 ml-auto">{new Date(review.response.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-blue-800">{review.response.text}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                review.status === 'published' ? 'bg-green-100 text-green-800' :
                review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {review.status}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <HandThumbUpIcon className="w-4 h-4 mr-1" />
                <span>{review.helpful} helpful</span>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-blue-600 p-1">
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-blue-600 p-1">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-red-600 p-1">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb items={breadcrumbConfigs.member.reviews} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
              <p className="text-gray-600 mt-1">Manage your reviews and feedback</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <StarIconSolid className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold text-yellow-800">{user?.rating || 4.8}</span>
                  <span className="text-sm text-yellow-700">({user?.reviewCount || 127} reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('given')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'given' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews Given ({givenReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'received' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews Received ({receivedReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('write')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'write' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Write Review
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'given' && (
          <div className="space-y-6">
            {givenReviews.length > 0 ? (
              givenReviews.map(review => (
                <ReviewCard key={review.id} review={review} showActions />
              ))
            ) : (
              <div className="text-center py-12">
                <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews given yet</h3>
                <p className="text-gray-600">Start reviewing your purchases to help other buyers.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-6">
            {receivedReviews.length > 0 ? (
              receivedReviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <div className="text-center py-12">
                <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews received yet</h3>
                <p className="text-gray-600">Complete some sales to start receiving reviews.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'write' && (
          <div className="space-y-6">
            {/* Pending Reviews */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders Ready for Review</h2>
              
              {pendingOrders.length > 0 ? (
                <div className="space-y-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{order.eventTitle}</h3>
                        <p className="text-sm text-gray-600">Seller: {order.seller}</p>
                        <p className="text-sm text-gray-600">{new Date(order.eventDate).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Write Review
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No orders ready for review.</p>
              )}
            </div>

            {/* Review Form Modal */}
            {showReviewForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Write a Review</h2>
                  
                  <div className="space-y-4">
                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                      <StarRating rating={reviewForm.rating} onChange={(rating) => setReviewForm(prev => ({ ...prev, rating }))} />
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="Share your experience with this seller..."
                      />
                    </div>

                    {/* Recommendation */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="recommend"
                        checked={reviewForm.wouldRecommend}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, wouldRecommend: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="recommend" className="ml-2 text-sm text-gray-700">
                        I would recommend this seller to others
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleSubmitReview}
                        disabled={reviewForm.rating === 0 || !reviewForm.comment.trim()}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Submit Review
                      </button>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;