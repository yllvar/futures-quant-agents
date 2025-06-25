"use client"

import { useLocalStorageTheme } from "@/lib/use-local-storage-theme"

export function ThemeInitializer() {
  // Use the hook to initialize theme from localStorage
  useLocalStorageTheme()

  // This component doesn't render anything
  return null
}
