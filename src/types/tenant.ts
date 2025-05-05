export type Tenant = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type CreateTenantRequest = {
  name: string;
  description: string;
};

export interface UpdateTenantRequest {
  name?: string;
  email?: string;
  plan?: string;
  status?: string;
} 