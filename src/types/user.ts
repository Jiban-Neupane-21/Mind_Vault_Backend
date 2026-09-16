export type UserRole = "Admin" | "User" | "Guest";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  password?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, "password">;
