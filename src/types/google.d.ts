declare module 'googleapis' {
  export interface GoogleReview {
    reviewer?: {
      profilePhotoUrl?: string;
      displayName?: string;
    };
    rating?: number;
    comment?: string;
    createTime?: string;
    updateTime?: string;
  }

  export interface GoogleReviewsResponse {
    reviews?: GoogleReview[];
    nextPageToken?: string;
  }

  export interface GoogleReplyResponse {
    name?: string;
    comment?: string;
    updateTime?: string;
  }
} 