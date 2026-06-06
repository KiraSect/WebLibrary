import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

async function findCabinetByNumber(number) {
  const cabinetNumber = Number(number)

  if (!cabinetNumber || cabinetNumber < 1) {
    throw new Error("Укажите корректный номер кабинета")
  }

  const { data, error } = await supabase
    .from("cabinets")
    .select("id, number")
    .eq("number", cabinetNumber)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getCopyById(id) {
  const { data, error } = await supabase
    .from("book_copies")
    .select("id, book_id, cabinet_id, quantity")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function mergeOrInsertCopy({ book_id, cabinet_id, quantity }) {
  const bookId = Number(book_id)
  const cabinetId = Number(cabinet_id)
  const qty = Number(quantity)

  if (!bookId) throw new Error("Книга не выбрана")
  if (!cabinetId) throw new Error("Кабинет не выбран")
  if (!qty || qty < 1) throw new Error("Количество должно быть больше 0")

  const { data: existingCopy, error: findError } = await supabase
    .from("book_copies")
    .select("id, quantity")
    .eq("book_id", bookId)
    .eq("cabinet_id", cabinetId)
    .maybeSingle()

  if (findError) {
    throw new Error(findError.message)
  }

  if (existingCopy) {
    const { error } = await supabase
      .from("book_copies")
      .update({
        quantity: Number(existingCopy.quantity) + qty,
      })
      .eq("id", existingCopy.id)

    if (error) throw new Error(error.message)

    return
  }

  const { error } = await supabase.from("book_copies").insert({
    book_id: bookId,
    cabinet_id: cabinetId,
    quantity: qty,
  })

  if (error) throw new Error(error.message)
}

async function mergeOrUpdateCopy({ id, cabinet_id, quantity }) {
  const copyId = Number(id)
  const cabinetId = Number(cabinet_id)
  const qty = Number(quantity)

  if (!copyId) throw new Error("Запись экземпляра не найдена")
  if (!cabinetId) throw new Error("Кабинет не выбран")
  if (!qty || qty < 1) throw new Error("Количество должно быть больше 0")

  const currentCopy = await getCopyById(copyId)

  const { data: duplicateCopy, error: duplicateError } = await supabase
    .from("book_copies")
    .select("id, quantity")
    .eq("book_id", currentCopy.book_id)
    .eq("cabinet_id", cabinetId)
    .neq("id", copyId)
    .maybeSingle()

  if (duplicateError) {
    throw new Error(duplicateError.message)
  }

  if (duplicateCopy) {
    const { error: updateError } = await supabase
      .from("book_copies")
      .update({
        quantity: Number(duplicateCopy.quantity) + qty,
      })
      .eq("id", duplicateCopy.id)

    if (updateError) throw new Error(updateError.message)

    const { error: deleteError } = await supabase
      .from("book_copies")
      .delete()
      .eq("id", copyId)

    if (deleteError) throw new Error(deleteError.message)

    return
  }

  const { error } = await supabase
    .from("book_copies")
    .update({
      cabinet_id: cabinetId,
      quantity: qty,
    })
    .eq("id", copyId)

  if (error) throw new Error(error.message)
}

export async function GET() {
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select(`
      id,
      title,
      book_copies(
        id,
        quantity,
        cabinet_id,
        cabinets(
          id,
          number
        )
      )
    `)
    .order("title", { ascending: true })

  const { data: authors, error: authorsError } = await supabase
    .from("authors")
    .select("*")
    .order("full_name", { ascending: true })

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true })

  const { data: cabinets, error: cabinetsError } = await supabase
    .from("cabinets")
    .select("*")
    .order("number", { ascending: true })

  if (booksError || authorsError || categoriesError || cabinetsError) {
    return NextResponse.json(
      {
        error:
          booksError?.message ||
          authorsError?.message ||
          categoriesError?.message ||
          cabinetsError?.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    books,
    authors,
    categories,
    cabinets,
  })
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.type === "copy") {
      const cabinet = await findCabinetByNumber(body.cabinet)

      if (!cabinet) {
        return NextResponse.json(
          { error: "Такого кабинета не существует. Сначала создайте кабинет." },
          { status: 400 }
        )
      }

      await mergeOrInsertCopy({
        book_id: body.book_id,
        cabinet_id: cabinet.id,
        quantity: body.quantity,
      })
    }

    if (body.type === "cabinet") {
      const cabinetNumber = Number(body.number)

      if (!cabinetNumber || cabinetNumber < 1) {
        return NextResponse.json(
          { error: "Введите корректный номер кабинета" },
          { status: 400 }
        )
      }

      const existingCabinet = await findCabinetByNumber(cabinetNumber)

      if (existingCabinet) {
        return NextResponse.json(
          { error: `Кабинет ${cabinetNumber} уже существует` },
          { status: 400 }
        )
      }

      const { error } = await supabase.from("cabinets").insert({
        number: cabinetNumber,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "author") {
      const fullName = body.full_name?.trim()

      if (!fullName) {
        return NextResponse.json(
          { error: "Введите имя автора" },
          { status: 400 }
        )
      }

      const { data: existingAuthor } = await supabase
        .from("authors")
        .select("id")
        .eq("full_name", fullName)
        .maybeSingle()

      if (existingAuthor) {
        return NextResponse.json(
          { error: "Такой автор уже существует" },
          { status: 400 }
        )
      }

      const { error } = await supabase.from("authors").insert({
        full_name: fullName,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "category") {
      const name = body.name?.trim()

      if (!name) {
        return NextResponse.json(
          { error: "Введите название жанра" },
          { status: 400 }
        )
      }

      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("name", name)
        .maybeSingle()

      if (existingCategory) {
        return NextResponse.json(
          { error: "Такой жанр уже существует" },
          { status: 400 }
        )
      }

      const { error } = await supabase.from("categories").insert({
        name,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()

    if (body.type === "author") {
      const fullName = body.full_name?.trim()

      if (!fullName) {
        return NextResponse.json(
          { error: "Введите имя автора" },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from("authors")
        .update({
          full_name: fullName,
        })
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "category") {
      const name = body.name?.trim()

      if (!name) {
        return NextResponse.json(
          { error: "Введите название жанра" },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from("categories")
        .update({
          name,
        })
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "cabinet") {
      const cabinetNumber = Number(body.number)

      if (!cabinetNumber || cabinetNumber < 1) {
        return NextResponse.json(
          { error: "Введите корректный номер кабинета" },
          { status: 400 }
        )
      }

      const { data: duplicateCabinet, error: duplicateError } = await supabase
        .from("cabinets")
        .select("id")
        .eq("number", cabinetNumber)
        .neq("id", body.id)
        .maybeSingle()

      if (duplicateError) {
        return NextResponse.json(
          { error: duplicateError.message },
          { status: 500 }
        )
      }

      if (duplicateCabinet) {
        return NextResponse.json(
          { error: `Кабинет ${cabinetNumber} уже существует` },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from("cabinets")
        .update({
          number: cabinetNumber,
        })
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "copy") {
      const cabinet = await findCabinetByNumber(body.cabinet)

      if (!cabinet) {
        return NextResponse.json(
          { error: "Такого кабинета не существует. Сначала создайте кабинет." },
          { status: 400 }
        )
      }

      await mergeOrUpdateCopy({
        id: body.id,
        cabinet_id: cabinet.id,
        quantity: body.quantity,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json()

    if (body.type === "author") {
      const { error } = await supabase
        .from("authors")
        .delete()
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "category") {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "cabinet") {
      const { data: usedCopies, error: usedError } = await supabase
        .from("book_copies")
        .select("id")
        .eq("cabinet_id", body.id)
        .limit(1)

      if (usedError) {
        return NextResponse.json({ error: usedError.message }, { status: 500 })
      }

      if (usedCopies?.length > 0) {
        return NextResponse.json(
          {
            error:
              "Нельзя удалить кабинет, пока в нём есть книги. Сначала перенесите или удалите экземпляры.",
          },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from("cabinets")
        .delete()
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.type === "copy") {
      const { error } = await supabase
        .from("book_copies")
        .delete()
        .eq("id", body.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}