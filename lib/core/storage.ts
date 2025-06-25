// Moving from lib/storage.ts
export class LocalStorageService {
  private prefix: string

  constructor(prefix = "trading-dashboard-") {
    this.prefix = prefix
  }

  public saveItem<T>(key: string, data: T): void {
    if (typeof window === "undefined") return

    try {
      const serialized = JSON.stringify(data)
      localStorage.setItem(this.prefix + key, serialized)
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }

  public getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue

    try {
      const serialized = localStorage.getItem(this.prefix + key)
      if (serialized === null) {
        return defaultValue
      }
      return JSON.parse(serialized) as T
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return defaultValue
    }
  }

  public removeItem(key: string): void {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error("Error removing from localStorage:", error)
    }
  }

  public clear(): void {
    if (typeof window === "undefined") return

    try {
      // Only clear items with our prefix
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.error("Error clearing localStorage:", error)
    }
  }
}
