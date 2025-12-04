// Reply型の定義
export interface Reply {
  id: string;
  review_id: string;
  content: string;
  status: 'draft' | 'sent';
  created_at?: string;
  updated_at?: string;
}

// ReplyFormData型の定義
export interface ReplyFormData {
  review_id?: string;
  content: string;
  tone?: string;
}
