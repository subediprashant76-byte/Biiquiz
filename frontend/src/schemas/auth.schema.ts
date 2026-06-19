import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters.")
  .max(128)
  .refine((value) => {
    const checks = [
      /[a-z]/.test(value),
      /[A-Z]/.test(value),
      /\d/.test(value),
      /[^A-Za-z0-9]/.test(value)
    ];
    return checks.filter(Boolean).length >= 3;
  }, "Password must include at least 3 of: uppercase, lowercase, number, symbol.")
  .refine((value) => !["password", "password123", "12345678", "qwerty123", "admin1234"].includes(value.toLowerCase()), "Password is too easy to guess.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(180)
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(180),
  code: z.string().regex(/^\d{6}$/, "OTP code must be 6 digits."),
  password: passwordSchema
});
