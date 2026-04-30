import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req) {
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ error: "Token faltante" }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })

    // Consultamos todos los usuarios necesarios para armar el árbol
    // Como no hay RLS, filtramos en el código o traemos la estructura base
    const { data: members, error: dbError } = await supabaseAdmin
      .from('users')
      .select('nombre, apellidos, codigo, referido_por_uuid, supabase_id, activo, role, created_at')
      .order('created_at', { ascending: true })

    if (dbError) {
      console.error("Error al obtener miembros de la red:", dbError);
      throw dbError;
    }

    // Si el usuario no es admin, podrías opcionalmente filtrar aquí para que solo vea su descendencia
    // Sin embargo, para react-d3-tree suele ser más fácil traer la estructura y filtrar en el cliente

    return NextResponse.json(members)

  } catch (error) {
    console.error("Error en API Red:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}