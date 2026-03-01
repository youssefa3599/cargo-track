import { JWTPayload } from 'jose';

export interface AppJWTPayload extends JWTPayload {
  userId: string;
  companyId: string;
  email?: string;
  role?: string;
}
