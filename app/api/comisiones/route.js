import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Token faltante' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: userDB, error: userError } = await supabaseAdmin
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
      query = supabaseAdmin.from('comisiones').select(`
        *,
        beneficiary:user_id (
          codigo,
          nombre,
          apellidos,
          role
        ),
        origin:from_user (
          codigo,
          nombre,
          apellidos
        )
      `)
    } else {
      // 👤 USUARIO: Sus ganancias con info de quién la generó
      query = supabaseAdmin.from('comisiones')
        .select(`
          *,
          origin:from_user (
            codigo,
            nombre,
            apellidos
          )
        `)
        .eq('user_id', userDB.supabase_id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Filtramos las comisiones donde el beneficiario (user_id) es un administrador.
    // Esto asegura que estas comisiones no se muestren ni se cuenten en el frontend.
    const filteredData = data?.filter(c => c.beneficiary?.role?.toLowerCase() !== 'admin') || [];
    return Response.json(filteredData);
  } catch (err) {
    console.error("Error en API Comisiones:", err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}