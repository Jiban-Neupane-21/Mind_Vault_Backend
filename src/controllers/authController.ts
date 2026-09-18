import { Request, Response } from "express";
import { query } from "@/config/db";
import { User, SafeUser } from "@/types/user";
import { hashPassword, comparePassword } from "@/utils/password";
import { signToken } from "@/utils/token";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export const register = async (
  req: Request<Record<string, never>, Record<string, never>, RegisterBody>,
  res: Response,
): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  try {
    const existing = await query<User>(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const result = await query<SafeUser>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'User')
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email.toLowerCase(), hashedPassword],
    );

    const newUser = result.rows[0];
    if (!newUser) {
      res.status(500).json({ error: "Failed to create user record." });
      return;
    }

    const token = signToken({ id: newUser.id, role: newUser.role });

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: newUser,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};

export const login = async (
  req: Request<Record<string, never>, Record<string, never>, LoginBody>,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const result = await query<User>(
      "SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    const user = result.rows[0];
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = signToken({ id: user.id, role: user.role });

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.status(200).json({
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      status: "success",
      message: "Logged out successfully.",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};
