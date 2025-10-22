import { redirect } from 'next/navigation';

/**
 * Root page - redirects to onboarding workflow
 *
 * Migration Strategy: Option A - Simple Redirect
 * All users immediately redirected to /onboarding for the workflow experience.
 *
 * This is a server component (no 'use client' directive) for instant redirect
 * with no flicker or loading state.
 */
export default function Home() {
  redirect('/onboarding');
}
