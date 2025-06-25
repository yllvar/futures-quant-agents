"use client"

import { useEffect } from "react"

export function useLocalStorageTheme() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window === "undefined") return

    // Check if we have a saved theme preference
    const savedTheme = localStorage.getItem("trading-dashboard-theme")

    // If we have a saved preference, apply it
    if (savedTheme) {
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
    // If no saved preference, use system preference
    else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (systemPrefersDark) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("trading-dashboard-theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("trading-dashboard-theme", "light")
      }
    }
  }, [])
}
