"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function BookPage() {
  const { id } = useParams()
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [book, setBook] = useState(null)

  const [availableAuthors, setAvailableAuthors] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [availableCabinets, setAvailableCabinets] = useState([])

  const [authorSearch, setAuthorSearch] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  const [newCopyCabinetId, setNewCopyCabinetId] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [editError, setEditError] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (id) fetchBook()

    fetchAuthors()
    fetchCategories()
    fetchCabinets()

    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [id])

  const fetchBook = async () => {
    const response = await fetch(`/api/books/${id}`)
    const data = await response.json()

    if (!response.ok) {
      alert(data.error || "Ошибка загрузки книги")
      return
    }

    setBook(data)
  }

  const fetchAuthors = async () => {
    const response = await fetch("/api/authors")
    const data = await response.json()

    setAvailableAuthors(Array.isArray(data) ? data : [])
  }

  const fetchCategories = async () => {
    const response = await fetch("/api/categories")
    const data = await response.json()

    setAvailableCategories(Array.isArray(data) ? data : [])
  }

  const fetchCabinets = async () => {
    const response = await fetch("/api/cabinets")
    const data = await response.json()

    setAvailableCabinets(Array.isArray(data) ? data : [])
  }

  const openEditModal = () => {
    setEditError("")
    setAuthorSearch("")
    setCategorySearch("")
    setNewCopyCabinetId("")

    setEditData({
      title: book.title || "",
      publish_year: book.publish_year || "",
      description: book.description || "",
      pdf_url: book.pdf_url || "",
      pdf_file: null,

      author_ids:
        book.book_authors
          ?.map((a) => a.authors?.id)
          .filter(Boolean)
          .map(String) || [],

      category_ids:
        book.book_categories
          ?.map((c) => c.categories?.id)
          .filter(Boolean)
          .map(String) || [],

      copies:
        book.book_copies?.length > 0
          ? book.book_copies.map((copy) => ({
              id: copy.id,
              cabinet_id: copy.cabinet_id ? String(copy.cabinet_id) : "",
              quantity: copy.quantity ?? 0,
            }))
          : [],
    })

    setEditOpen(true)
  }

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    })
  }

  const toggleAuthor = (authorId) => {
    const idString = String(authorId)
    const selected = editData.author_ids.includes(idString)

    setEditData({
      ...editData,
      author_ids: selected
        ? editData.author_ids.filter((id) => id !== idString)
        : [...editData.author_ids, idString],
    })
  }

  const toggleCategory = (categoryId) => {
    const idString = String(categoryId)
    const selected = editData.category_ids.includes(idString)

    setEditData({
      ...editData,
      category_ids: selected
        ? editData.category_ids.filter((id) => id !== idString)
        : [...editData.category_ids, idString],
    })
  }

  const handleEditCopyChange = (index, field, value) => {
    const updatedCopies = [...editData.copies]
    updatedCopies[index][field] = value

    setEditData({
      ...editData,
      copies: updatedCopies,
    })
  }

  const addEditCopyRow = () => {
    if (!newCopyCabinetId) {
      setEditError("Выберите кабинет")
      return
    }

    const alreadyExists = editData.copies.some(
      (copy) => String(copy.cabinet_id) === String(newCopyCabinetId)
    )

    if (alreadyExists) {
      setEditError("Этот кабинет уже добавлен к книге")
      return
    }

    setEditError("")

    setEditData({
      ...editData,
      copies: [
        ...editData.copies,
        {
          cabinet_id: newCopyCabinetId,
          quantity: 0,
        },
      ],
    })

    setNewCopyCabinetId("")
  }

  const removeEditCopyRow = (index) => {
    setEditData({
      ...editData,
      copies: editData.copies.filter((_, i) => i !== index),
    })
  }

  const validateEditForm = () => {
    const currentYear = new Date().getFullYear()

    if (!editData.title.trim()) {
      return "Введите название книги"
    }

    if (
      editData.publish_year &&
      (Number(editData.publish_year) < 1000 ||
        Number(editData.publish_year) > currentYear)
    ) {
      return "Введите корректный год публикации"
    }

    if (editData.pdf_file && editData.pdf_file.type !== "application/pdf") {
      return "Можно загрузить только PDF-файл"
    }

    if (editData.pdf_file && editData.pdf_file.size > 10 * 1024 * 1024) {
      return "PDF-файл не должен превышать 10 MB"
    }

    for (const copy of editData.copies) {
      if (!copy.cabinet_id) {
        return "Выберите кабинет для экземпляра"
      }

      if (
        copy.quantity === "" ||
        copy.quantity === null ||
        copy.quantity === undefined
      ) {
        return "Укажите количество экземпляров"
      }

      if (Number(copy.quantity) < 1) {
        return "Количество экземпляров в кабинете должно быть больше 0"
      }
    }

    return ""
  }

  const filteredAuthors = availableAuthors.filter((author) =>
    author.full_name.toLowerCase().includes(authorSearch.toLowerCase())
  )

  const filteredCategories = availableCategories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  )

  const handleSave = async () => {
    setEditError("")

    const validationError = validateEditForm()
    if (validationError) {
      setEditError(validationError)
      return
    }

    setEditLoading(true)

    try {
      const formData = new FormData()

      formData.append("title", editData.title)
      formData.append("publish_year", editData.publish_year)
      formData.append("description", editData.description)
      formData.append("pdf_url", editData.pdf_url || "")
      formData.append("author_ids", JSON.stringify(editData.author_ids))
      formData.append("category_ids", JSON.stringify(editData.category_ids))
      formData.append("copies", JSON.stringify(editData.copies))

      if (editData.pdf_file) {
        formData.append("pdf_file", editData.pdf_file)
      }

      const response = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setEditError(data.error || "Ошибка сохранения")
        return
      }

      setBook(data)
      setEditOpen(false)

      fetchAuthors()
      fetchCategories()
      fetchCabinets()
    } catch {
      setEditError("Ошибка подключения к серверу")
    } finally {
      setEditLoading(false)
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="bg-emerald-900 px-6 py-5 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              Загрузка книги...
            </h1>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100"
            >
              ← Назад
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl p-6">
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-emerald-900 px-6 py-5 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">
            {book.title}
          </h1>

          <div className="flex items-center gap-3">
            {user?.role === "librarian" && (
              <button
                onClick={openEditModal}
                className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100"
              >
                ✏️ Редактировать
              </button>
            )}

            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100"
            >
              ← Назад
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        <InfoBlock title="📅 Год публикации">
          <p>{book.publish_year || "Неизвестно"}</p>
        </InfoBlock>

        <InfoBlock title="📖 Описание">
          <p className="leading-relaxed text-slate-700">
            {book.description || "Описание отсутствует"}
          </p>
        </InfoBlock>

        <InfoBlock title="📌 Категории">
          <p>
            {book.book_categories?.length > 0
              ? book.book_categories
                  .map((c) => c.categories?.name)
                  .filter(Boolean)
                  .join(", ")
              : "Нет категории"}
          </p>
        </InfoBlock>

        <InfoBlock title="✍️ Авторы">
          <p>
            {book.book_authors?.length > 0
              ? book.book_authors
                  .map((a) => a.authors?.full_name)
                  .filter(Boolean)
                  .join(", ")
              : "Авторы не указаны"}
          </p>
        </InfoBlock>

        <InfoBlock title="📍 Кабинеты">
          {book.book_copies?.length > 0 ? (
            book.book_copies.map((copy) => (
              <div
                key={copy.id}
                className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700"
              >
                📚 Кабинет {copy.cabinets?.number || "не указан"} —{" "}
                {copy.quantity || 0} шт
              </div>
            ))
          ) : (
            <p>Нет экземпляров</p>
          )}
        </InfoBlock>

        <InfoBlock title="📄 Электронная версия" center>
          {book.pdf_url ? (
            <>
              <iframe
                src={book.pdf_url}
                className="mt-3 h-[700px] w-full rounded-xl border border-slate-200 bg-white"
              />
            </>
          ) : (
            <p>PDF отсутствует</p>
          )}
        </InfoBlock>
      </div>

      {editOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold text-emerald-800">
                ✏️ Редактирование книги
              </h2>

              <button
                onClick={() => setEditOpen(false)}
                className="text-xl text-slate-500 transition hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto p-5">
              <input
                name="title"
                placeholder="Название книги"
                value={editData.title}
                onChange={handleEditChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="publish_year"
                type="number"
                placeholder="Год публикации"
                value={editData.publish_year}
                onChange={handleEditChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <textarea
                name="description"
                placeholder="Описание книги"
                value={editData.description}
                onChange={handleEditChange}
                className="min-h-28 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-emerald-800">
                  PDF-файл
                </h3>

                <p className="mb-3 text-sm text-slate-500">
                  Текущий PDF:{" "}
                  {editData.pdf_url ? "загружен" : "отсутствует"}
                </p>

                <input
                  id="edit-pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      pdf_file: e.target.files?.[0] || null,
                    })
                  }
                />

                <label
                  htmlFor="edit-pdf-upload"
                  className="block cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  📄 Загрузить новый PDF
                </label>

                <p className="mt-2 text-sm text-slate-500">
                  {editData.pdf_file
                    ? `Выбран файл: ${editData.pdf_file.name}`
                    : "Новый PDF не выбран"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-emerald-800">
                  Авторы
                </h3>

                <input
                  value={authorSearch}
                  onChange={(e) => setAuthorSearch(e.target.value)}
                  placeholder="Поиск автора..."
                  className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                />

                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {filteredAuthors.length > 0 ? (
                    filteredAuthors.map((author) => (
                      <button
                        key={author.id}
                        type="button"
                        onClick={() => toggleAuthor(author.id)}
                        className={
                          editData.author_ids.includes(String(author.id))
                            ? "rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                            : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        }
                      >
                        {author.full_name}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Авторы не найдены
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-emerald-800">
                  Категории
                </h3>

                <input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Поиск жанра..."
                  className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                />

                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={
                          editData.category_ids.includes(String(category.id))
                            ? "rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                            : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        }
                      >
                        {category.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Жанры не найдены
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-emerald-800">
                    Экземпляры книги
                  </h3>
                </div>

                <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    value={newCopyCabinetId}
                    onChange={(e) => setNewCopyCabinetId(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-emerald-600"
                  >
                    <option value="">
                      Выберите кабинет для добавления
                    </option>

                    {availableCabinets.map((cabinet) => (
                      <option key={cabinet.id} value={cabinet.id}>
                        Кабинет {cabinet.number}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={addEditCopyRow}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                  >
                    + Кабинет
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {editData.copies.length > 0 ? (
                    editData.copies.map((copy, index) => {
                      const cabinet = availableCabinets.find(
                        (item) => String(item.id) === String(copy.cabinet_id)
                      )

                      return (
                        <div
                          key={copy.id || index}
                          className="grid grid-cols-[1fr_120px_auto] gap-2"
                        >
                          <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800">
                            {cabinet
                              ? `Кабинет ${cabinet.number}`
                              : "Кабинет не выбран"}
                          </div>

                          <input
                            type="number"
                            min="0"
                            placeholder="Кол-во"
                            value={copy.quantity}
                            onChange={(e) =>
                              handleEditCopyChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-emerald-600"
                          />

                          <button
                            type="button"
                            onClick={() => removeEditCopyRow(index)}
                            className="rounded-lg bg-red-500 px-3 py-2 font-bold text-white transition hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      Кабинеты ещё не добавлены
                    </p>
                  )}
                </div>
              </div>

              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-5">
              <button
                onClick={handleSave}
                disabled={editLoading}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {editLoading ? "Сохранение..." : "Сохранить изменения"}
              </button>

              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBlock({ title, children, center = false }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <h3
        className={`mb-2 text-xl font-bold text-emerald-700 ${
          center ? "text-center" : ""
        }`}
      >
        {title}
      </h3>

      {children}
    </div>
  )
}