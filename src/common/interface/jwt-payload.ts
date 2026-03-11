export interface JwtPayload {
  sub: string; // user ID
  role: string; // user role (e.g., 'user', 'admin')
  email: string;
}
