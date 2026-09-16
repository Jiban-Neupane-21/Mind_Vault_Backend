-- 1. Create the custom ENUM type for roles
CREATE TYPE user_role AS ENUM ('Admin', 'User', 'Guest');

-- 2. Create the users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role user_role NOT NULL DEFAULT 'User',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

