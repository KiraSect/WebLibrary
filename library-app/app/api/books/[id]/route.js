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

async function getBookById(id) {
  const { data, error } = await supabase
    .from("books")
    .select(`
      *,
      book_categories(
        categories(id, name)
      ),
      book_copies(
        id,
        quantity,
        cabinet_id,
        cabinets(
          id,
          number
        )
      ),
      book_authors(
        authors!book_authors_author_id_fkey(
          id,
          full_name
        )
      )
    `)
    .eq("id", id)
    .single()

  return { data, error }
}

export async function GET(req, { params }) {
  const { id } = await params

  const { data, error } = await getBookById(id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const formData = await req.formData()

    const title = formData.get("title")
    const publish_year = formData.get("publish_year")
    const description = formData.get("description")
    const currentPdfUrl = formData.get("pdf_url") || null
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

    const { data: existingBook, error: existingBookError } = await supabase
      .from("books")
      .select("id")
      .ilike("title", normalizedTitle)
      .eq("publish_year", normalizedYear)
      .neq("id", id)
      .maybeSingle()

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

    let pdfUrl = currentPdfUrl

    if (pdfFile && pdfFile.size > 0) {
      const uploadResult = await uploadPdfToCloudinary(pdfFile)
      pdfUrl = uploadResult.secure_url
    }

    const { error: bookError } = await supabase
      .from("books")
      .update({
        title: normalizedTitle,
        publish_year: normalizedYear,
        description: description?.trim() || null,
        pdf_url: pdfUrl,
      })
      .eq("id", id)

    if (bookError) {
      return NextResponse.json(
        { error: bookError.message },
        { status: 500 }
      )
    }

    await supabase
      .from("book_categories")
      .delete()
      .eq("book_id", id)

    const selectedCategoryIds = Array.isArray(category_ids)
      ? category_ids.map(Number).filter(Boolean)
      : []

    if (selectedCategoryIds.length > 0) {
      const rows = selectedCategoryIds.map((categoryId) => ({
        book_id: Number(id),
        category_id: categoryId,
      }))

      const { error } = await supabase
        .from("book_categories")
        .insert(rows)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }

    await supabase
      .from("book_authors")
      .delete()
      .eq("book_id", id)

    const selectedAuthorIds = Array.isArray(author_ids)
      ? author_ids.map(Number).filter(Boolean)
      : []

    if (selectedAuthorIds.length > 0) {
      const rows = selectedAuthorIds.map((authorId) => ({
        book_id: Number(id),
        author_id: authorId,
      }))

      const { error } = await supabase
        .from("book_authors")
        .insert(rows)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }

    const { data: oldCopies, error: oldCopiesError } = await supabase
      .from("book_copies")
      .select("id")
      .eq("book_id", id)

    if (oldCopiesError) {
      return NextResponse.json(
        { error: oldCopiesError.message },
        { status: 500 }
      )
    }

    const incomingCopies = Array.isArray(copies) ? copies : []

    const incomingIds = incomingCopies
      .map((copy) => copy.id)
      .filter(Boolean)

    const oldIds = oldCopies?.map((copy) => copy.id) || []

    const idsToDelete = oldIds.filter(
      (oldId) => !incomingIds.includes(oldId)
    )

    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from("book_copies")
        .delete()
        .in("id", idsToDelete)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }

    for (const copy of incomingCopies) {
      const cabinetId = Number(copy.cabinet_id || 0)
      const quantity = Number(copy.quantity ?? 0)

      if (!cabinetId) {
        return NextResponse.json(
          { error: "Выберите кабинет из списка" },
          { status: 400 }
        )
      }

      if (quantity < 1) {
        return NextResponse.json(
          { error: "Количество книг должно быть больше 0" },
          { status: 400 }
        )
      }

      if (copy.id) {
        const { error } = await supabase
          .from("book_copies")
          .update({
            cabinet_id: cabinetId,
            quantity,
          })
          .eq("id", copy.id)

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        }
      } else {
        const { error } = await supabase
          .from("book_copies")
          .insert({
            book_id: Number(id),
            cabinet_id: cabinetId,
            quantity,
          })

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        }
      }
    }

    const { data, error } = await getBookById(id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}