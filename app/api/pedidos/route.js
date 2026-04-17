import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const supabase = getSupabase()
    
    // Obtener el token del header Authorization
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })


    // Guardar pedido en Supabase
    const { data: newPedido, error } = await supabase
      .from('pedidos')
      .insert([{
        user_id: user.id,
        productos: body.productos,
        total: body.total,
        tipo_entrega: body.tipo_entrega,
        metodo_pago: body.metodo_pago,
        comprobante_url: body.comprobante_url,
        estado: 'enviado'
      }])
      .select('id')
      .single()

    if (error) throw error

    return Response.json({ message: 'Pedido creado', id: newPedido.id })

  } catch (err) {
    console.error("Error en pedidos:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // 🛡️ Verificar rol del usuario
    const { data: userDB } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_id', user.id)
      .single()

    // 🔍 Construir consulta
    // Nota: Usamos la relación con 'users' para obtener datos del cliente (nombre, código)
    let query = supabase.from('pedidos').select(`
      *,
      users:users!user_id (
        nombre,
        apellidos,
        codigo
      )
    `)

    // Si NO es admin, filtrar solo sus propios pedidos
    if (userDB?.role !== 'admin') {
      query = query.eq('user_id', user.id)
    }

    const { data: pedidos, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return Response.json(pedidos)

  } catch (err) {
    console.error("Error obteniendo pedidos:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // 🛡️ Solo el ADMIN puede cambiar el estado de un pedido
    const { data: adminCheck } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_id', user.id)
      .single()

    if (adminCheck?.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { pedido_id, estado } = await req.json()

    // 1. Obtener estado actual y datos del usuario antes de actualizar
    const { data: pedidoPrevio } = await supabase
      .from('pedidos')
      .select('estado, user_id, total')
      .eq('id', pedido_id)
      .single()

    // 2. Ejecutar la actualización del estado
    const { error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', pedido_id)

    if (error) throw error

    // 🔥 LÓGICA DE COMISIONES: Si el estado cambia a 'aprobado' por primera vez
    if (estado === 'aprobado' && pedidoPrevio?.estado !== 'aprobado') {
      // 1. Obtener datos del comprador (para conocer a su patrocinador)
      const { data: comprador } = await supabase
        .from('users')
        .select('referido_por_uuid, saldo')
        .eq('supabase_id', pedidoPrevio.user_id)
        .single()

      const comisionesAInsertar = []
      
      // A. COMISIÓN NIVEL 0 (Compra Propia) - S/ 10.00
      comisionesAInsertar.push({
        user_id: pedidoPrevio.user_id,
        from_user: pedidoPrevio.user_id,
        monto: 10.00,
        tipo: 'Compra propia',
        nivel: 0,
        pedido_id: pedido_id
      })

      // B. REPARTO MULTINIVEL A PATROCINADORES (3 Niveles)
      const configuracionNiveles = [
        { monto: 5.00, desc: "Nivel 1" },
        { monto: 3.00, desc: "Nivel 2" },
        { monto: 2.00, desc: "Nivel 3" }
      ]

      let actualSponsorUUID = comprador?.referido_por_uuid

      for (const nivel of configuracionNiveles) {
        if (!actualSponsorUUID) break

        const { data: sponsor } = await supabase
          .from("users")
          .select("supabase_id, referido_por_uuid, activo, saldo")
          .eq("supabase_id", actualSponsorUUID)
          .single()

        if (sponsor && sponsor.activo) {
          comisionesAInsertar.push({
            user_id: sponsor.supabase_id,
            from_user: pedidoPrevio.user_id,
            monto: nivel.monto,
            tipo: `Comisión Red - ${nivel.desc}`,
            nivel: parseInt(nivel.desc.split(' ')[1]),
            pedido_id: pedido_id
          })
          actualSponsorUUID = sponsor.referido_por_uuid
        } else {
          break
        }
      }

      // 2. Insertar registros y actualizar saldos
      if (comisionesAInsertar.length > 0) {
        await supabase.from('comisiones').insert(comisionesAInsertar)

        for (const com of comisionesAInsertar) {
          const { data: targetUser } = await supabase.from('users').select('saldo').eq('supabase_id', com.user_id).single()
          const nuevoSaldo = Number(targetUser?.saldo || 0) + com.monto
          
          const updateData = { saldo: nuevoSaldo }
          if (com.nivel === 0) {
            updateData.activo_comisiones = true
            updateData.ultimo_pago = new Date().toISOString()
          }
          await supabase.from('users').update(updateData).eq('supabase_id', com.user_id)
        }
      }
    }

    return Response.json({ message: 'Estado actualizado correctamente' })

  } catch (err) {
    console.error("Error al actualizar pedido:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const { pedido_id } = await req.json()
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', pedido_id)
      .eq('user_id', user.id)

    if (error) throw error

    return Response.json({ message: 'Pedido cancelado correctamente' })

  } catch (err) {
    console.error("Error al cancelar pedido:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}