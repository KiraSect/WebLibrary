"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  

  const handleLogin = async () => {
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Ошибка входа")
        return
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
        })
      )

      window.dispatchEvent(new Event("storage"))

      router.push("/")
    } catch {
      setError("Ошибка подключения к серверу")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans">
      <button
        onClick={() => router.push("/")}
        className="absolute left-5 top-5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition hover:bg-slate-100"
      >
        ← Назад
      </button>

      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-teal-600">
          Вход библиотекаря
        </h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-500"
        />

        <input
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-500"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-teal-500 py-3 font-bold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}