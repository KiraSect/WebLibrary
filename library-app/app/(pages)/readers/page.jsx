"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

export default function ReadersPage() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(false)
  const [returnLoadingId, setReturnLoadingId] = useState(null)
  const [tab, setTab] = useState("issued")
  const [search, setSearch] = useState("")
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetchLoans()
  }, [])

  const showNotification = (message, type = "success") => {
    setNotification({ message, type })

    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const fetchLoans = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/loans")
      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || "Ошибка загрузки выдач", "error")
        return
      }

      setLoans(Array.isArray(data) ? data : [])
    } catch {
      showNotification("Ошибка подключения к серверу", "error")
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (loan) => {
    if (loan.status === "returned") return false
    if (!loan.due_date) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(loan.due_date)
    due.setHours(0, 0, 0, 0)

    return due < today
  }

  const handleReturnBook = async (loanId) => {
    if (!confirm("Подтвердить возврат книги?")) return

    setReturnLoadingId(loanId)

    try {
      const response = await fetch("/api/loans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: loanId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || "Ошибка возврата книги", "error")
        return
      }

      showNotification(data.message || "Книга успешно возвращена")
      fetchLoans()
    } catch {
      showNotification("Ошибка подключения к серверу", "error")
    } finally {
      setReturnLoadingId(null)
    }
  }

  const stats = useMemo(() => {
    const issued = loans.filter((loan) => loan.status !== "returned")
    const returned = loans.filter((loan) => loan.status === "returned")
    const overdue = loans.filter((loan) => isOverdue(loan))

    return {
      all: loans.length,
      issued: issued.length,
      overdue: overdue.length,
      returned: returned.length,
    }
  }, [loans])

  const filteredLoans = loans.filter((loan) => {
    const readerName = `${loan.readers?.last_name || ""} ${
      loan.readers?.first_name || ""
    }`.toLowerCase()

    const bookTitle = loan.book_copies?.books?.title?.toLowerCase() || ""
    const group = loan.readers?.student_group?.toLowerCase() || ""
    const query = search.toLowerCase()

    const matchesSearch =
      readerName.includes(query) ||
      bookTitle.includes(query) ||
      group.includes(query)

    if (!matchesSearch) return false

    if (tab === "issued") {
      return loan.status !== "returned" && !isOverdue(loan)
    }

    if (tab === "overdue") {
      return isOverdue(loan)
    }

    if (tab === "returned") {
      return loan.status === "returned"
    }

    return true
  })

  const formatDate = (date) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ru-RU")
  }

  const getStatusBadge = (loan) => {
    if (loan.status === "returned") {
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
          Возвращена
        </span>
      )
    }

    if (isOverdue(loan)) {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
          Просрочена
        </span>
      )
    }

    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
        На руках
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-emerald-900 px-6 py-5 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">
            Читатели и возврат
          </h1>

          <Link href="/">
            <button className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100">
              ← Назад
            </button>
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="Всего выдач" value={stats.all} />
          <StatCard title="На руках" value={stats.issued} />
          <StatCard title="Просрочено" value={stats.overdue} danger />
          <StatCard title="Возвращено" value={stats.returned} />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-3">
            <TabButton active={tab === "issued"} onClick={() => setTab("issued")}>
              На руках
            </TabButton>

            <TabButton
              active={tab === "overdue"}
              onClick={() => setTab("overdue")}
              danger
            >
              Просроченные
            </TabButton>

            <TabButton
              active={tab === "returned"}
              onClick={() => setTab("returned")}
            >
              Возвращённые
            </TabButton>

            <TabButton active={tab === "all"} onClick={() => setTab("all")}>
              Все
            </TabButton>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по читателю, книге или группе..."
              className="min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
            />

            <button
              onClick={fetchLoans}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
            >
              Обновить
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            Загрузка...
          </div>
        ) : filteredLoans.length > 0 ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="bg-emerald-900 text-white">
                  <tr>
                    <th className="p-4 text-left">Статус</th>
                    <th className="p-4 text-left">Книга</th>
                    <th className="p-4 text-left">Читатель</th>
                    <th className="p-4 text-left">Группа</th>
                    <th className="p-4 text-left">Кабинет</th>
                    <th className="p-4 text-left">Выдана</th>
                    <th className="p-4 text-left">Срок возврата</th>
                    <th className="p-4 text-left">Возвращена</th>
                    <th className="p-4 text-left">Действие</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLoans.map((loan) => (
                    <tr
                      key={loan.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-4">{getStatusBadge(loan)}</td>

                      <td className="p-4 font-semibold text-emerald-800">
                        {loan.book_copies?.books?.title || "Без названия"}

                        <div className="text-sm font-normal text-slate-500">
                          {loan.book_copies?.books?.publish_year ||
                            "Год не указан"}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold">
                          {loan.readers?.last_name} {loan.readers?.first_name}
                        </div>

                        <div className="text-sm text-slate-500">
                          {loan.readers?.phone ||
                            loan.readers?.email ||
                            "Контакты не указаны"}
                        </div>
                      </td>

                      <td className="p-4">
                        {loan.readers?.student_group || "—"}
                      </td>

                      <td className="p-4">
                        Кабинет{" "}
                        {loan.book_copies?.cabinets?.number || "не указан"}
                      </td>

                      <td className="p-4">{formatDate(loan.issued_at)}</td>

                      <td className="p-4">{formatDate(loan.due_date)}</td>

                      <td className="p-4">{formatDate(loan.returned_at)}</td>

                      <td className="p-4">
                        {loan.status !== "returned" ? (
                          <button
                            onClick={() => handleReturnBook(loan.id)}
                            disabled={returnLoadingId === loan.id}
                            className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
                          >
                            {returnLoadingId === loan.id
                              ? "Возврат..."
                              : "Вернуть"}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Уже возвращена
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
            Записей не найдено
          </div>
        )}
      </main>

      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] min-w-[350px] rounded-xl px-5 py-4 text-white shadow-2xl ${
            notification.type === "error" ? "bg-red-500" : "bg-emerald-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <span>{notification.type === "error" ? "❌" : "✅"}</span>

            <span className="flex-1">{notification.message}</span>

            <button
              onClick={() => setNotification(null)}
              className="font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, danger = false }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          danger ? "text-red-500" : "text-emerald-700"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TabButton({ active, onClick, children, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? danger
            ? "rounded-xl bg-red-500 px-5 py-3 font-bold text-white"
            : "rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
          : "rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 hover:bg-slate-200"
      }
    >
      {children}
    </button>
  )
}