"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

export default function LibrarySettingsPage() {
  const [authors, setAuthors] = useState([])
  const [categories, setCategories] = useState([])
  const [cabinets, setCabinets] = useState([])

  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const [selectedAuthorId, setSelectedAuthorId] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [selectedCabinetId, setSelectedCabinetId] = useState("")

  const [authorForm, setAuthorForm] = useState({ full_name: "" })
  const [categoryForm, setCategoryForm] = useState({ name: "" })

  const [newAuthorName, setNewAuthorName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCabinetNumber, setNewCabinetNumber] = useState("")

  const showNotification = (message, type = "success") => {
    setNotification({ message, type })

    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const apiRequest = async (url, options) => {
    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Произошла ошибка")
    }

    return data
  }

  const fetchData = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/library-settings")
      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || "Ошибка загрузки данных", "error")
        return
      }

      setAuthors(data.authors || [])
      setCategories(data.categories || [])
      setCabinets(data.cabinets || [])
    } catch {
      showNotification("Ошибка подключения к серверу", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const selectedAuthor = useMemo(
    () =>
      authors.find(
        (author) => String(author.id) === String(selectedAuthorId)
      ),
    [authors, selectedAuthorId]
  )

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === String(selectedCategoryId)
      ),
    [categories, selectedCategoryId]
  )

  useEffect(() => {
    if (selectedAuthor) {
      setAuthorForm({ full_name: selectedAuthor.full_name || "" })
    }
  }, [selectedAuthor])

  useEffect(() => {
    if (selectedCategory) {
      setCategoryForm({ name: selectedCategory.name || "" })
    }
  }, [selectedCategory])

  const addAuthor = async () => {
    try {
      if (!newAuthorName.trim()) {
        throw new Error("Введите имя автора")
      }

      await apiRequest("/api/library-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "author",
          full_name: newAuthorName,
        }),
      })

      setNewAuthorName("")
      showNotification("Автор успешно добавлен")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const saveAuthor = async () => {
    try {
      if (!selectedAuthorId) {
        throw new Error("Выберите автора")
      }

      if (!authorForm.full_name.trim()) {
        throw new Error("Введите имя автора")
      }

      await apiRequest("/api/library-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "author",
          id: selectedAuthorId,
          full_name: authorForm.full_name,
        }),
      })

      showNotification("Автор успешно сохранён")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const deleteAuthor = async () => {
    try {
      if (!selectedAuthorId) {
        throw new Error("Выберите автора")
      }

      if (!confirm("Удалить автора?")) return

      await apiRequest("/api/library-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "author",
          id: selectedAuthorId,
        }),
      })

      setSelectedAuthorId("")
      setAuthorForm({ full_name: "" })
      showNotification("Автор успешно удалён")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const addCategory = async () => {
    try {
      if (!newCategoryName.trim()) {
        throw new Error("Введите название жанра")
      }

      await apiRequest("/api/library-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          name: newCategoryName,
        }),
      })

      setNewCategoryName("")
      showNotification("Жанр успешно добавлен")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const saveCategory = async () => {
    try {
      if (!selectedCategoryId) {
        throw new Error("Выберите жанр")
      }

      if (!categoryForm.name.trim()) {
        throw new Error("Введите название жанра")
      }

      await apiRequest("/api/library-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          id: selectedCategoryId,
          name: categoryForm.name,
        }),
      })

      showNotification("Жанр успешно сохранён")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const deleteCategory = async () => {
    try {
      if (!selectedCategoryId) {
        throw new Error("Выберите жанр")
      }

      if (!confirm("Удалить жанр?")) return

      await apiRequest("/api/library-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          id: selectedCategoryId,
        }),
      })

      setSelectedCategoryId("")
      setCategoryForm({ name: "" })
      showNotification("Жанр успешно удалён")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const addCabinet = async () => {
    try {
      if (!newCabinetNumber || Number(newCabinetNumber) < 1) {
        throw new Error("Введите корректный номер кабинета")
      }

      await apiRequest("/api/library-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cabinet",
          number: newCabinetNumber,
        }),
      })

      setNewCabinetNumber("")
      showNotification("Кабинет успешно добавлен")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  const deleteCabinet = async () => {
    try {
      if (!selectedCabinetId) {
        throw new Error("Выберите кабинет")
      }

      if (!confirm("Удалить кабинет?")) return

      await apiRequest("/api/library-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cabinet",
          id: selectedCabinetId,
        }),
      })

      setSelectedCabinetId("")
      showNotification("Кабинет успешно удалён")
      fetchData()
    } catch (err) {
      showNotification(err.message, "error")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="bg-emerald-900 px-6 py-5 shadow-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
                Управление справочниками
            </h1>
            <Link href="/">
                <button className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100">
                ← Назад
                </button>
            </Link>
            </div>
        </div>

        <div className="mx-auto max-w-7xl p-6">

        {loading && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow">
            Загрузка...
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-emerald-800">
              Авторы
            </h2>

            <div className="mb-5 flex gap-2">
              <input
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                placeholder="Новый автор"
                className="flex-1 rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
              />

              <button
                onClick={addAuthor}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
              >
                Добавить
              </button>
            </div>

            <select
              value={selectedAuthorId}
              onChange={(e) => setSelectedAuthorId(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="">Выберите автора</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.full_name}
                </option>
              ))}
            </select>

            <input
              value={authorForm.full_name}
              onChange={(e) =>
                setAuthorForm({ ...authorForm, full_name: e.target.value })
              }
              placeholder="ФИО автора"
              disabled={!selectedAuthorId}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100"
            />

            <div className="flex gap-3">
              <button
                onClick={saveAuthor}
                disabled={!selectedAuthorId}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300"
              >
                Редактировать
              </button>

              <button
                onClick={deleteAuthor}
                disabled={!selectedAuthorId}
                className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 disabled:bg-slate-300"
              >
                Удалить
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-emerald-800">
              Жанры книг
            </h2>

            <div className="mb-5 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Новый жанр"
                className="flex-1 rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
              />

              <button
                onClick={addCategory}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
              >
                Добавить
              </button>
            </div>

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="">Выберите жанр</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, name: e.target.value })
              }
              placeholder="Название жанра"
              disabled={!selectedCategoryId}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100"
            />

            <div className="flex gap-3">
              <button
                onClick={saveCategory}
                disabled={!selectedCategoryId}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300"
              >
                Редактировать
              </button>

              <button
                onClick={deleteCategory}
                disabled={!selectedCategoryId}
                className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 disabled:bg-slate-300"
              >
                Удалить
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-emerald-800">
              Кабинеты
            </h2>

            <div className="mb-5 flex gap-2">
              <input
                type="number"
                value={newCabinetNumber}
                onChange={(e) => setNewCabinetNumber(e.target.value)}
                placeholder="Новый кабинет, например 305"
                className="flex-1 rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
              />

              <button
                onClick={addCabinet}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
              >
                Добавить
              </button>
            </div>

            <select
              value={selectedCabinetId}
              onChange={(e) => setSelectedCabinetId(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="">Выберите кабинет</option>
              {cabinets.map((cabinet) => (
                <option key={cabinet.id} value={cabinet.id}>
                  Кабинет {cabinet.number}
                </option>
              ))}
            </select>

            <button
              onClick={deleteCabinet}
              disabled={!selectedCabinetId}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 disabled:bg-slate-300"
            >
              Удалить кабинет
            </button>
          </section>
        </div>
      </div>

      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] min-w-[350px] rounded-xl px-5 py-4 text-white shadow-2xl transition-all duration-300 ${
            notification.type === "error" ? "bg-red-500" : "bg-emerald-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {notification.type === "error" ? "❌" : "✅"}
            </span>

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