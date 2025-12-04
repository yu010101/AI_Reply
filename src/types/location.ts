// Location型の定義
export interface Location {
  id: string;
  name: string;
  tone: string;
  line_user_id?: string;
  google_place_id?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

// LocationFormData型の定義
export interface LocationFormData {
  name: string;
  tone: string;
  line_user_id?: string;
  google_place_id?: string;
}
