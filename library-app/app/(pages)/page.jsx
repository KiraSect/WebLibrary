"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Home() {
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [pdfFilter, setPdfFilter] = useState("")
  const [user, setUser] = useState(null)

  const [availableAuthors, setAvailableAuthors] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [availableCabinets, setAvailableCabinets] = useState([])

  const [readerModalOpen, setReaderModalOpen] = useState(false)
  const [readerError, setReaderError] = useState("")
  const [readerLoading, setReaderLoading] = useState(false)

  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [issueBook, setIssueBook] = useState(null)
  const [readers, setReaders] = useState([])
  const [readerSearch, setReaderSearch] = useState("")
  const [issueError, setIssueError] = useState("")
  const [issueLoading, setIssueLoading] = useState(false)

  const [issueForm, setIssueForm] = useState({
    reader_id: "",
    copy_id: "",
    due_date: "",
  })

  const [readerForm, setReaderForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    student_group: "",
  })

  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [bookError, setBookError] = useState("")
  const [bookLoading, setBookLoading] = useState(false)

  const [bookAuthorSearch, setBookAuthorSearch] = useState("")
  const [bookCategorySearch, setBookCategorySearch] = useState("")
  const [newBookCopyCabinetId, setNewBookCopyCabinetId] = useState("")

  const [bookForm, setBookForm] = useState({
    title: "",
    publish_year: "",
    description: "",
    pdf_file: null,
    author_ids: [],
    category_ids: [],
    copies: [],
  })

  useEffect(() => {
    fetchBooks()
    fetchReaders()
    fetchAuthors()
    fetchCategories()
    fetchCabinets()

    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const fetchBooks = async () => {
    const params = new URLSearchParams()

    if (yearFilter) {
      params.set("year", yearFilter)
    }

    const response = await fetch(`/api/books?${params.toString()}`)
    const data = await response.json()

    setBooks(Array.isArray(data) ? data : [])
  }

  const fetchReaders = async () => {
    const response = await fetch("/api/readers")
    const data = await response.json()

    setReaders(Array.isArray(data) ? data : [])
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

  const logout = () => {
    const confirmed = confirm("Вы точно хотите выйти?")

    if (!confirmed) {
      return
    }

    localStorage.removeItem("user")
    setUser(null)
    window.dispatchEvent(new Event("storage"))
  }

  const handleReaderChange = (e) => {
    setReaderForm({
      ...readerForm,
      [e.target.name]: e.target.value,
    })
  }

  const openBookModal = () => {
    setBookError("")
    setBookAuthorSearch("")
    setBookCategorySearch("")
    setNewBookCopyCabinetId("")

    setBookForm({
      title: "",
      publish_year: "",
      description: "",
      pdf_file: null,
      author_ids: [],
      category_ids: [],
      copies: [],
    })

    setBookModalOpen(true)
  }

  const openIssueModal = (book) => {
    setIssueBook(book)
    setIssueError("")
    setReaderSearch("")
    setIssueForm({
      reader_id: "",
      copy_id: "",
      due_date: "",
    })
    setIssueModalOpen(true)
  }

  const handleIssueBook = async () => {
    setIssueError("")

    if (!issueForm.reader_id) {
      setIssueError("Выберите читателя")
      return
    }

    if (!issueForm.copy_id) {
      setIssueError("Выберите кабинет")
      return
    }

    if (!issueForm.due_date) {
      setIssueError("Выберите дату возврата")
      return
    }

    setIssueLoading(true)

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reader_id: issueForm.reader_id,
          copy_id: issueForm.copy_id,
          due_date: issueForm.due_date,
          issued_by: user?.id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setIssueError(data.error || "Ошибка выдачи книги")
        return
      }

      setIssueModalOpen(false)
      fetchBooks()
    } catch {
      setIssueError("Ошибка подключения к серверу")
    } finally {
      setIssueLoading(false)
    }
  }

  const validateReaderForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^7\d{10}$/

    if (!readerForm.first_name.trim()) return "Введите имя"
    if (!readerForm.last_name.trim()) return "Введите фамилию"

    if (readerForm.email && !emailRegex.test(readerForm.email.trim())) {
      return "Введите корректный email"
    }

    if (readerForm.phone && !phoneRegex.test(readerForm.phone.trim())) {
      return "Телефон должен состоять из 11 цифр и начинаться с 7"
    }

    return ""
  }

  const handleCreateReader = async () => {
    setReaderError("")

    const validationError = validateReaderForm()
    if (validationError) {
      setReaderError(validationError)
      return
    }

    setReaderLoading(true)

    try {
      const response = await fetch("/api/readers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...readerForm,
          email: readerForm.email.trim(),
          phone: readerForm.phone.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setReaderError(data.error || "Ошибка регистрации читателя")
        return
      }

      setReaderForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        student_group: "",
      })

      setReaderModalOpen(false)
      fetchReaders()
    } catch {
      setReaderError("Ошибка подключения к серверу")
    } finally {
      setReaderLoading(false)
    }
  }

  const handleBookChange = (e) => {
    setBookForm({
      ...bookForm,
      [e.target.name]: e.target.value,
    })
  }

  const handleCopyChange = (index, field, value) => {
    const updatedCopies = [...bookForm.copies]
    updatedCopies[index][field] = value

    setBookForm({
      ...bookForm,
      copies: updatedCopies,
    })
  }

  const toggleBookAuthor = (authorId) => {
    const idString = String(authorId)
    const selected = bookForm.author_ids.includes(idString)

    setBookForm({
      ...bookForm,
      author_ids: selected
        ? bookForm.author_ids.filter((id) => id !== idString)
        : [...bookForm.author_ids, idString],
    })
  }

  const toggleBookCategory = (categoryId) => {
    const idString = String(categoryId)
    const selected = bookForm.category_ids.includes(idString)

    setBookForm({
      ...bookForm,
      category_ids: selected
        ? bookForm.category_ids.filter((id) => id !== idString)
        : [...bookForm.category_ids, idString],
    })
  }

  const addCopyRow = () => {
    if (!newBookCopyCabinetId) {
      setBookError("Выберите кабинет")
      return
    }

    const alreadyExists = bookForm.copies.some(
      (copy) => String(copy.cabinet_id) === String(newBookCopyCabinetId)
    )

    if (alreadyExists) {
      setBookError("Этот кабинет уже добавлен к книге")
      return
    }

    setBookError("")

    setBookForm({
      ...bookForm,
      copies: [
        ...bookForm.copies,
        {
          cabinet_id: newBookCopyCabinetId,
          quantity: 0,
        },
      ],
    })

    setNewBookCopyCabinetId("")
  }

  const removeCopyRow = (index) => {
    setBookForm({
      ...bookForm,
      copies: bookForm.copies.filter((_, i) => i !== index),
    })
  }

  const validateBookForm = () => {
    const currentYear = new Date().getFullYear()

    if (!bookForm.title.trim()) {
      return "Введите название книги"
    }

    if (
      bookForm.publish_year &&
      (Number(bookForm.publish_year) < 1000 ||
        Number(bookForm.publish_year) > currentYear)
    ) {
      return "Введите корректный год публикации"
    }

    if (bookForm.pdf_file && bookForm.pdf_file.type !== "application/pdf") {
      return "Можно загрузить только PDF-файл"
    }

    if (bookForm.pdf_file && bookForm.pdf_file.size > 10 * 1024 * 1024) {
      return "PDF-файл не должен превышать 10 MB"
    }

    for (const copy of bookForm.copies) {
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

  const handleCreateBook = async () => {
    setBookError("")

    const validationError = validateBookForm()
    if (validationError) {
      setBookError(validationError)
      return
    }

    setBookLoading(true)

    try {
      const formData = new FormData()

      formData.append("title", bookForm.title)
      formData.append("publish_year", bookForm.publish_year)
      formData.append("description", bookForm.description)
      formData.append("author_ids", JSON.stringify(bookForm.author_ids))
      formData.append("category_ids", JSON.stringify(bookForm.category_ids))
      formData.append("copies", JSON.stringify(bookForm.copies))

      if (bookForm.pdf_file) {
        formData.append("pdf_file", bookForm.pdf_file)
      }

      const response = await fetch("/api/books/create", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setBookError(data.error || "Ошибка добавления книги")
        return
      }

      setBookForm({
        title: "",
        publish_year: "",
        description: "",
        pdf_file: null,
        author_ids: [],
        category_ids: [],
        copies: [],
      })

      setBookAuthorSearch("")
      setBookCategorySearch("")
      setNewBookCopyCabinetId("")

      setBookModalOpen(false)

      fetchAuthors()
      fetchCategories()
      fetchCabinets()
      fetchBooks()
    } catch {
      setBookError("Ошибка подключения к серверу")
    } finally {
      setBookLoading(false)
    }
  }

  const filteredBookAuthors = availableAuthors.filter((author) =>
    author.full_name
      .toLowerCase()
      .includes(bookAuthorSearch.toLowerCase())
  )

  const filteredBookCategories = availableCategories.filter((category) =>
    category.name
      .toLowerCase()
      .includes(bookCategorySearch.toLowerCase())
  )

  const filteredReaders = readers.filter((reader) => {
    const query = readerSearch.toLowerCase().trim()

    const fullName = `${reader.last_name || ""} ${reader.first_name || ""}`
      .toLowerCase()
      .trim()

    const reverseName = `${reader.first_name || ""} ${reader.last_name || ""}`
      .toLowerCase()
      .trim()

    const group = String(reader.student_group || "").toLowerCase()

    return (
      fullName.includes(query) ||
      reverseName.includes(query) ||
      group.includes(query)
    )
  })

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title
      ?.toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === "" ||
      book.book_categories?.some(
        (c) => c.categories?.name === categoryFilter
      )

    const matchesPdf =
      pdfFilter === ""
        ? true
        : pdfFilter === "yes"
        ? !!book.pdf_url
        : !book.pdf_url

    return matchesSearch && matchesCategory && matchesPdf
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-emerald-900 px-6 py-5 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center">
          {user?.role === "librarian" ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={openBookModal}
                  className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100"
                >
                  Добавить книгу
                </button>

                <button
                  onClick={() => setReaderModalOpen(true)}
                  className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100"
                >
                  Зарегистрировать читателя
                </button>

                <Link href="/library-settings">
                  <button className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100">
                    Управление справочниками
                  </button>
                </Link>

                <Link href="/readers">
                  <button className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100">
                    Читатели и возврат
                  </button>
                </Link>
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="h-8 w-px bg-emerald-700" />

                <span className="whitespace-nowrap font-semibold text-white">
                  {user?.full_name}
                </span>

                <button
                  onClick={logout}
                  className="rounded-xl bg-red-500 px-4 py-3 font-bold text-white transition hover:bg-red-600"
                >
                  Выход
                </button>
              </div>
            </>
          ) : (
            <Link href="/login">
              <button className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-slate-100">
                Вход библиотекаря
              </button>
            </Link>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl p-5">
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔎 Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-600"
          />

          <input
            type="number"
            placeholder="📅 Год"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-36 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-600"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-44 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-600"
          >
            <option value="">Все категории</option>

            {availableCategories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={pdfFilter}
            onChange={(e) => setPdfFilter(e.target.value)}
            className="w-52 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-600"
          >
            <option value="">PDF: Все</option>
            <option value="yes">Есть PDF</option>
            <option value="no">Нет PDF</option>
          </select>

          <button
            onClick={fetchBooks}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800"
          >
            Найти
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm"
            >
              <div>
                <h2 className="mb-3 text-xl font-bold text-emerald-700">
                  {book.title}
                </h2>

                <p className="text-slate-500">
                  📅 {book.publish_year || "Unknown"}
                </p>

                <p className="mt-2 text-slate-500">
                  📌{" "}
                  {book.book_categories?.length > 0
                    ? book.book_categories
                        .map((c) => c.categories?.name)
                        .join(", ")
                    : "Категории отсутствуют"}
                </p>

                <div className="mt-3">
                  <p
                    className={
                      book.pdf_url
                        ? "font-bold text-emerald-500"
                        : "font-bold text-red-500"
                    }
                  >
                    📄{" "}
                    {book.pdf_url
                      ? "Электронная версия в наличии"
                      : "Электронной версии нет"}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="font-bold text-emerald-700">
                    📍 Кабинеты
                  </p>

                  {book.book_copies?.length > 0 ? (
                    book.book_copies.map((copy, index) => (
                      <div
                        key={index}
                        className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        📚 Кабинет {copy.cabinets?.number || "не указан"} —{" "}
                        {copy.quantity} шт
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">
                      Нет экземпляров
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-5">
                <Link href={`/book/${book.id}`}>
                  <button className="w-full rounded-lg bg-emerald-700 py-3 text-white transition hover:bg-emerald-800">
                    Посмотреть
                  </button>
                </Link>

                {user?.role === "librarian" && (
                  <button
                    onClick={() => openIssueModal(book)}
                    className="w-full rounded-lg bg-emerald-600 py-3 text-white transition hover:bg-emerald-700"
                  >
                    📕 Выдать книгу
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {readerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold text-emerald-800">
                Регистрация читателя
              </h2>

              <button
                onClick={() => setReaderModalOpen(false)}
                className="text-xl text-slate-500 transition hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 p-5">
              <input
                name="first_name"
                placeholder="Имя"
                value={readerForm.first_name}
                onChange={handleReaderChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="last_name"
                placeholder="Фамилия"
                value={readerForm.last_name}
                onChange={handleReaderChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="email"
                placeholder="Email"
                value={readerForm.email}
                onChange={handleReaderChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="phone"
                placeholder="79991234567"
                value={readerForm.phone}
                onChange={handleReaderChange}
                maxLength={11}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="student_group"
                placeholder="Группа"
                value={readerForm.student_group}
                onChange={handleReaderChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              {readerError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {readerError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-5">
              <button
                onClick={handleCreateReader}
                disabled={readerLoading}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {readerLoading ? "Сохранение..." : "Зарегистрировать"}
              </button>

              <button
                onClick={() => setReaderModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {issueModalOpen && issueBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-emerald-800">
                  Выдача книги
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {issueBook.title}
                </p>
              </div>

              <button
                onClick={() => setIssueModalOpen(false)}
                className="text-xl text-slate-500 transition hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-emerald-800">
                  Читатель
                </h3>

                <input
                  value={readerSearch}
                  onChange={(e) => setReaderSearch(e.target.value)}
                  placeholder="Поиск по фамилии, имени или группе..."
                  className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
                />

                <select
                  value={issueForm.reader_id}
                  onChange={(e) =>
                    setIssueForm({
                      ...issueForm,
                      reader_id: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
                >
                  <option value="">Выберите читателя</option>

                  {filteredReaders.map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.last_name} {reader.first_name}
                      {reader.student_group
                        ? ` — ${reader.student_group}`
                        : ""}
                    </option>
                  ))}
                </select>

                {readerSearch && filteredReaders.length === 0 && (
                  <p className="mt-2 text-sm text-red-500">
                    Читатели не найдены
                  </p>
                )}
              </div>

              <select
                value={issueForm.copy_id}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    copy_id: e.target.value,
                  })
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              >
                <option value="">Выберите кабинет</option>
                {issueBook.book_copies
                  ?.filter((copy) => Number(copy.quantity) > 0)
                  .map((copy) => (
                    <option key={copy.id} value={copy.id}>
                      Кабинет: {copy.cabinets?.number || "не указан"} —
                      доступно: {copy.quantity} шт
                    </option>
                  ))}
              </select>

              <input
                type="date"
                value={issueForm.due_date}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    due_date: e.target.value,
                  })
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              {issueError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {issueError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-5">
              <button
                onClick={handleIssueBook}
                disabled={issueLoading}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {issueLoading ? "Выдача..." : "Выдать книгу"}
              </button>

              <button
                onClick={() => setIssueModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold text-emerald-800">
                Добавление книги
              </h2>

              <button
                onClick={() => setBookModalOpen(false)}
                className="text-xl text-slate-500 transition hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto p-5">
              <input
                name="title"
                placeholder="Название книги"
                value={bookForm.title}
                onChange={handleBookChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <input
                name="publish_year"
                type="number"
                placeholder="Год публикации"
                value={bookForm.publish_year}
                onChange={handleBookChange}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <textarea
                name="description"
                placeholder="Описание книги"
                value={bookForm.description}
                onChange={handleBookChange}
                className="min-h-28 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-600"
              />

              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-emerald-800">
                  PDF-файл
                </h3>

                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    setBookForm({
                      ...bookForm,
                      pdf_file: e.target.files?.[0] || null,
                    })
                  }
                />

                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  📄 Загрузить PDF
                </label>

                <p className="text-sm text-slate-500">
                  {bookForm.pdf_file
                    ? `Выбран файл: ${bookForm.pdf_file.name}`
                    : "PDF не выбран"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-emerald-800">
                  Авторы
                </h3>

                <input
                  value={bookAuthorSearch}
                  onChange={(e) => setBookAuthorSearch(e.target.value)}
                  placeholder="Поиск автора..."
                  className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                />

                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {filteredBookAuthors.length > 0 ? (
                    filteredBookAuthors.map((author) => (
                      <button
                        key={author.id}
                        type="button"
                        onClick={() => toggleBookAuthor(author.id)}
                        className={
                          bookForm.author_ids.includes(String(author.id))
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
                  value={bookCategorySearch}
                  onChange={(e) => setBookCategorySearch(e.target.value)}
                  placeholder="Поиск жанра..."
                  className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                />

                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {filteredBookCategories.length > 0 ? (
                    filteredBookCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleBookCategory(category.id)}
                        className={
                          bookForm.category_ids.includes(String(category.id))
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
                    value={newBookCopyCabinetId}
                    onChange={(e) => setNewBookCopyCabinetId(e.target.value)}
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
                    onClick={addCopyRow}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                  >
                    + Кабинет
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {bookForm.copies.length > 0 ? (
                    bookForm.copies.map((copy, index) => {
                      const cabinet = availableCabinets.find(
                        (item) => String(item.id) === String(copy.cabinet_id)
                      )

                      return (
                        <div
                          key={index}
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
                              handleCopyChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-emerald-600"
                          />

                          <button
                            type="button"
                            onClick={() => removeCopyRow(index)}
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

              {bookError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {bookError}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-5">
              <button
                onClick={handleCreateBook}
                disabled={bookLoading}
                className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {bookLoading ? "Сохранение..." : "Добавить книгу"}
              </button>

              <button
                onClick={() => setBookModalOpen(false)}
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