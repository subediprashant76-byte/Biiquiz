import { BarChart3, KeyRound, RadioTower, Sparkles } from "lucide-react";

export const landingFeatures = [
  {
    icon: RadioTower,
    title: "Live quiz rooms",
    text: "Start, pause, advance questions, and watch participation without refreshing the room.",
  },
  {
    icon: Sparkles,
    title: "AI generation",
    text: "Educators use their own Gemini keys in the browser. biiQuiz never stores those keys.",
  },
  {
    icon: BarChart3,
    title: "Performance analytics",
    text: "Track answer accuracy, response timing, knowledge gaps, and room outcomes.",
  },
  {
    icon: KeyRound,
    title: "Host Pass scaling",
    text: "Start free for 50 participants and unlock bigger lectures with plan-backed limits.",
  },
];

export const plans = [
  {
    name: "Free",
    price: "$0",
    limit: "50 participants",
    detail: "Daily classroom practice",
    featured: false,
  },
  {
    name: "Basic Host Pass",
    price: "$12",
    limit: "100 participants",
    detail: "Tuition centers and workshops",
    featured: false,
  },
  {
    name: "Pro Host Pass",
    price: "$29",
    limit: "250 participants",
    detail: "Exam prep events with branding",
    featured: true,
  },
  {
    name: "School",
    price: "$99",
    limit: "500 participants",
    detail: "Institution rollouts and support",
    featured: false,
  },
  {
    name: "Custom",
    price: "Talk to us",
    limit: "Organization",
    detail: "SSO, data exports, and governance",
    featured: false,
  },
];
