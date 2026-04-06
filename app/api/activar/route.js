import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    // ✅ Crear cliente DENTRO de la función (IMPORTANTE)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 🧾 Obtener body
    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id es requerido" },
        { status: 400 }
      )
    }

    // 🔥 ACTIVAR USUARIO
    const { data: userData, error: updateError } = await supabase
      .from("users")
      .update({ activo: true })
      .eq("supabase_id", user_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // 🔥 CREAR COMISIÓN
    const { error: insertError } = await supabase
      .from("comisiones")
      .insert([
        {
          user_id: user_id,
          from_user: userData?.email || "sistema",
          monto: 20,
          tipo: "Activación"
        }
      ])

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    )
  }
}