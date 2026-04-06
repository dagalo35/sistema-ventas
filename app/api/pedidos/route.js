import { supabase } from '@/lib/supabase'

// 🔥 OBTENER USUARIO DESDE TOKEN
async function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) return null

  return data.user
}

// 🔹 USUARIO EN TU TABLA
async function getUserDB(supabase_id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_id', supabase_id)
    .single()

  if (error || !data) return null

  return data
}

// =========================
// 🔹 GET (LISTAR PEDIDOS)
// =========================
export async function GET(req) {
  const user = await getUser(req)

  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userDB = await getUserDB(user.id)

  if (!userDB) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  let query = supabase.from('pedidos').select('*')

  if (userDB.role !== 'admin') {
    query = query.eq('user_id', userDB.supabase_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// =========================
// 🔹 POST (CREAR PEDIDO)
// =========================
export async function POST(req) {
  const user = await getUser(req)

  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { total, productos } = body

  if (!total || !productos) {
    return Response.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const userDB = await getUserDB(user.id)

  if (!userDB) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('pedidos')
    .insert([
      {
        user_id: userDB.supabase_id,
        total,
        productos,
        estado: 'pendiente'
      }
    ])
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// =========================
// 🔥 PATCH (CANCELAR PEDIDO)
// =========================
export async function PATCH(req) {
  const user = await getUser(req)

  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { pedido_id } = body // 🔥 CORREGIDO

  if (!pedido_id) {
    return Response.json({ error: 'Falta ID del pedido' }, { status: 400 })
  }

  const userDB = await getUserDB(user.id)

  if (!userDB) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // 🔹 obtener pedido
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedido_id)
    .single()

  if (errorPedido || !pedido) {
    return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // 🔒 VALIDAR PROPIETARIO
  if (pedido.user_id !== userDB.supabase_id) {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  // 🔒 SOLO SI ESTA PENDIENTE
  if (pedido.estado !== 'pendiente') {
    return Response.json({
      error: 'Solo puedes cancelar pedidos pendientes'
    }, { status: 400 })
  }

  // 🔥 CANCELAR
  const { error: updateError } = await supabase
    .from('pedidos')
    .update({
      estado: 'cancelado'
    })
    .eq('id', pedido_id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    message: 'Pedido cancelado correctamente ✅'
  })
}

// =========================
// 🔹 PUT (APROBAR PEDIDO)
// =========================
export async function PUT(req) {
  const user = await getUser(req)

  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { pedido_id } = body

  if (!pedido_id) {
    return Response.json({ error: 'Falta ID del pedido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'aprobado' }) // 🔥 CORREGIDO
    .eq('id', pedido_id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ message: "Pedido aprobado ✅" })
}