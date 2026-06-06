import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { supabase } from "../../../../lib/supabase"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadPdfToCloudinary(file) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const originalName = file.name || "book.pdf"

  const safeName = originalName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_")

  const publicId = `library_pdfs/${Date.now()}_${safeName}.pdf`

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "raw",
          public_id: publicId,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      .end(buffer)
  })
}

export async function POST(req) {
  try {
    const formData = await req.formData()

    const title = formData.get("title")
    const publish_year = formData.get("publish_year")
    const description = formData.get("description")
    const pdfFile = formData.get("pdf_file")

    const author_ids = JSON.parse(formData.get("author_ids") || "[]")
    const category_ids = JSON.parse(formData.get("category_ids") || "[]")
    const copies = JSON.parse(formData.get("copies") || "[]")

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Название книги обязательно" },
        { status: 400 }
      )
    }

    const normalizedTitle = title.trim()
    const normalizedYear = publish_year ? Number(publish_year) : null

    let existingBookQuery = supabase
      .from("books")
      .select("id")
      .ilike("title", normalizedTitle)

    if (normalizedYear === null) {
      existingBookQuery = existingBookQuery.is("publish_year", null)
    } else {
      existingBookQuery = existingBookQuery.eq("publish_year", normalizedYear)
    }

    const { data: existingBook, error: existingBookError } =
      await existingBookQuery.maybeSingle()

    if (existingBookError) {
      return NextResponse.json(
        { error: existingBookError.message },
        { status: 500 }
      )
    }

    if (existingBook) {
      return NextResponse.json(
        {
          error: `Книга "${normalizedTitle}" за ${
            normalizedYear || "неизвестный год"
          } уже существует`,
        },
        { status: 400 }
      )
    }

    const selectedAuthorIds = Array.isArray(author_ids)
      ? author_ids.map(Number).filter(Boolean)
      : []

    const selectedCategoryIds = Array.isArray(category_ids)
      ? category_ids.map(Number).filter(Boolean)
      : []

    const incomingCopies = Array.isArray(copies) ? copies : []

    const cabinetIds = new Set()

    for (const copy of incomingCopies) {
      const cabinetId = Number(copy.cabinet_id || 0)
      const quantity = Number(copy.quantity ?? 0)

      if (!cabinetId) {
        return NextResponse.json(
          { error: "Выберите кабинет из списка" },
          { status: 400 }
        )
      }

      if (cabinetIds.has(cabinetId)) {
        return NextResponse.json(
          { error: "Один и тот же кабинет нельзя добавить два раза" },
          { status: 400 }
        )
      }

      cabinetIds.add(cabinetId)

      if (quantity < 1) {
        return NextResponse.json(
          { error: "Количество книг должно быть больше 0" },
          { status: 400 }
        )
      }
    }

    let pdfUrl = null

    if (pdfFile && pdfFile.size > 0) {
      if (pdfFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Можно загрузить только PDF-файл" },
          { status: 400 }
        )
      }

      const uploadResult = await uploadPdfToCloudinary(pdfFile)
      pdfUrl = uploadResult.secure_url
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        title: normalizedTitle,
        publish_year: normalizedYear,
        description: description?.trim() || null,
        pdf_url: pdfUrl,
      })
      .select()
      .single()

    if (bookError) {
      return NextResponse.json({ error: bookError.message }, { status: 500 })
    }

    if (selectedAuthorIds.length > 0) {
      const rows = selectedAuthorIds.map((authorId) => ({
        book_id: book.id,
        author_id: authorId,
      }))

      const { error } = await supabase.from("book_authors").insert(rows)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (selectedCategoryIds.length > 0) {
      const rows = selectedCategoryIds.map((categoryId) => ({
        book_id: book.id,
        category_id: categoryId,
      }))

      const { error } = await supabase.from("book_categories").insert(rows)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (incomingCopies.length > 0) {
      const rows = incomingCopies.map((copy) => ({
        book_id: book.id,
        cabinet_id: Number(copy.cabinet_id),
        quantity: Number(copy.quantity),
      }))

      const { error } = await supabase.from("book_copies").insert(rows)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json(book)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}