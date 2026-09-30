// src/config/fonts.ts
import { Marcellus, Schibsted_Grotesk } from "next/font/google";

/** Titres. Une seule graisse disponible (400) : jamais sous 20px. */
export const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-marcellus",
});

/** Interface, texte courant, prix, formulaires. Police variable. */
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-schibsted",
});
