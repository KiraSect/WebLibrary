import { useEffect, useState } from "react"

export function useUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("user")
      setUser(stored ? JSON.parse(stored) : null)
    }

    loadUser()

    window.addEventListener("storage", loadUser)
    return () => window.removeEventListener("storage", loadUser)
  }, [])

  const logout = () => {
    localStorage.removeItem("user")
    setUser(null)
  }

  return { user, logout }
}