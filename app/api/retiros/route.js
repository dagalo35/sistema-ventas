import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function GET(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) return Response.json({ error: 'Token faltante' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar Rol Admin
    const { data: userDB } = await supabase.from('users').select('role').eq('supabase_id', user.id).single()
    if (userDB?.role !== 'admin') return Response.json({ error: 'Prohibido: Se requiere rol de administrador' }, { status: 403 })

    const { data, error } = await supabase
      .from('retiros')
      .select(`
        *,
        users:users!user_id (
          nombre,
          apellidos,
          codigo
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return Response.json(data)

  } catch (err) {
    console.error("Error en GET /api/retiros:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) return Response.json({ error: 'Token faltante' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: adminCheck } = await supabase.from('users').select('role').eq('supabase_id', user.id).single()
    if (adminCheck?.role !== 'admin') return Response.json({ error: 'Acceso denegado' }, { status: 403 })

    const { retiro_id, estado, comprobante_url, motivo_rechazo } = await req.json()

    if (!retiro_id || !estado) return Response.json({ error: 'Datos incompletos' }, { status: 400 })

    // 1. Obtener datos del retiro antes de actualizar para comparar estados
    const { data: retPrevio } = await supabase.from('retiros').select('estado, user_id, monto').eq('id', retiro_id).single()
    if (!retPrevio) return Response.json({ error: 'Retiro no encontrado' }, { status: 404 })

    // 2. Actualizar el estado del retiro
    const updateData = { 
      estado, 
      comprobante_url,
      motivo_rechazo: estado === 'rechazado' ? motivo_rechazo : null,
      fecha_pago: estado === 'pagado' ? new Date().toISOString() : null
    }

    const { error } = await supabase.from('retiros').update(updateData).eq('id', retiro_id)
    if (error) throw error
    
    // 3. 🔥 LÓGICA DE SALDO: Restar automáticamente SOLO cuando se marca como PAGADO por primera vez
    if (estado === 'pagado' && retPrevio.estado !== 'pagado') {
      const { data: u } = await supabase.from('users').select('saldo').eq('supabase_id', retPrevio.user_id).single()
      if (u) {
        const saldoActual = parseFloat(u.saldo || 0)
        const nuevoSaldo = (saldoActual - parseFloat(retPrevio.monto)).toFixed(2)
        await supabase.from('users').update({ saldo: nuevoSaldo }).eq('supabase_id', retPrevio.user_id)
      }
    }

    return Response.json({ message: 'Retiro procesado correctamente' })
  } catch (err) {
    console.error("Error en PUT /api/retiros:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}