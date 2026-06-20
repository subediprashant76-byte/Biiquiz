import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "biiQuiz Live",
  description:
    "Host live quizzes, generate questions with BYOK AI, and track learning outcomes in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
