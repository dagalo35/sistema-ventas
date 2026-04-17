import { supabase } from '@/lib/supabase'

// Helper para obtener usuario autenticado
async function getAuth(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch (e) {
    return null
  }
}

export async function GET(req) {
  try {
    const user = await getAuth(req)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: userDB, error: userError } = await supabase
      .from('users')
      .select('role, supabase_id')
      .eq('supabase_id', user.id)
      .single()

    if (userError || !userDB) {
      return Response.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 })
    }

    let query;

    if (userDB.role === 'admin') {
      // 🔥 ADMIN: Ve todo el historial con beneficiario y origen
      query = supabase.from('comisiones').select(`
        *,
        beneficiary:users!user_id (
          codigo,
          nombre,
          apellidos
        ),
        origin:users!from_user (
          codigo,
          nombre,
          apellidos
        )
      `)
    } else {
      // 👤 USUARIO: Sus ganancias con info de quién la generó
      query = supabase.from('comisiones')
        .select(`
          *,
          origin:users!from_user (
            codigo,
            nombre,
            apellidos
          )
        `)
        .eq('user_id', userDB.supabase_id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return Response.json(data || [])
  } catch (err) {
    console.error("Error en API Comisiones:", err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}