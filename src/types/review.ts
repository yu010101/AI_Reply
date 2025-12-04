// Review型の定義
export interface Review {
  id: string;
  location_id: string;
  author: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at?: string;
  updated_at?: string;
}

// ReviewStatus型の定義
export type ReviewStatus = 'pending' | 'responded' | 'ignored';
