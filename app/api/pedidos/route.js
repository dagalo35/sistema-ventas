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
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Obtener el token del header Authorization
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })


    // Guardar pedido en Supabase usando el cliente Admin para saltar RLS
    const { data: newPedido, error } = await supabaseAdmin
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
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // 🛡️ Verificar rol del usuario
    const { data: userDB } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('supabase_id', user.id)
      .single()

    // 🔍 Construir consulta
    // Usamos el cliente admin para saltar RLS y obtener los datos con sus joins
    let query = supabaseAdmin.from('pedidos').select(`
      *,
      users:user_id (
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

    // Usamos SERVICE_ROLE_KEY para que el servidor pueda validar roles sin restricciones
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // 🛡️ Solo el ADMIN puede cambiar el estado de un pedido
    const { data: adminCheck } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('supabase_id', user.id)
      .single()

    if (adminCheck?.role?.toLowerCase() !== 'admin') {
      return Response.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { pedido_id, estado } = await req.json()

    // 1. Obtener estado actual, datos del usuario y productos antes de actualizar
    const { data: pedidoPrevio } = await supabaseAdmin
      .from('pedidos')
      .select('estado, user_id, total, productos')
      .eq('id', pedido_id)
      .single()

    // 2. Ejecutar la actualización del estado
    const { error } = await supabaseAdmin
      .from('pedidos')
      .update({ estado })
      .eq('id', pedido_id)

    if (error) throw error

    // 🔥 LÓGICA DE COMISIONES: Si el estado cambia a 'aprobado' por primera vez
    if (estado === 'aprobado' && pedidoPrevio?.estado !== 'aprobado') {
      // 1. Obtener datos del comprador (para conocer a su patrocinador)
      const { data: comprador } = await supabaseAdmin
        .from('users')
        .select('referido_por_uuid, saldo, role')
        .eq('supabase_id', pedidoPrevio.user_id)
        .single()

      const comisionesAInsertar = []
      const now = new Date()
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      // Obtenemos la cantidad real de items del arreglo ["PROD1", "PROD2", ...]
      const cantidadItems = Array.isArray(pedidoPrevio.productos) ? pedidoPrevio.productos.length : 0

      // A. COMISIÓN NIVEL 0 (Compra Propia) - Requiere MAGVIT17 y COLLAGEM en el mes
      if (comprador && comprador.role !== 'admin') {
        const { data: comprasMesComprador } = await supabaseAdmin
          .from('pedidos')
          .select('productos')
          .eq('user_id', pedidoPrevio.user_id)
          .eq('estado', 'aprobado')
          .gte('created_at', inicioMes)

        // Combinar productos de este pedido con compras previas aprobadas del mes
        const productosMesTotal = [
          ...(Array.isArray(pedidoPrevio.productos) ? pedidoPrevio.productos : []),
          ...(comprasMesComprador?.flatMap(p => p.productos) || [])
        ]

        // Para pruebas: califica si tiene al menos un producto
        const calificaNivel0 = productosMesTotal.length > 0;

        if (calificaNivel0) {
          comisionesAInsertar.push({
            user_id: pedidoPrevio.user_id,
            from_user: pedidoPrevio.user_id,
            monto: 5.00 * cantidadItems,
            tipo: 'Compra propia',
            nivel: 0,
            pedido_id: pedido_id
          })
        }
      }

      // B. REPARTO MULTINIVEL A PATROCINADORES (3 Niveles)
      const configuracionNiveles = [
        { monto: 5.00, desc: "Nivel 1" },
        { monto: 3.00, desc: "Nivel 2" },
        { monto: 2.00, desc: "Nivel 3" }
      ]

      let actualSponsorUUID = comprador?.referido_por_uuid

      for (const nivel of configuracionNiveles) {
        if (!actualSponsorUUID) break

        const { data: sponsor } = await supabaseAdmin
          .from("users")
          .select("supabase_id, referido_por_uuid, activo, role")
          .eq("supabase_id", actualSponsorUUID)
          .single()

        if (sponsor) {
          // Si es admin califica auto, si es user debe estar activo y tener sus compras
          let calificado = sponsor.role === 'admin';
          
          if (!calificado && sponsor.activo) {
            const { data: comprasSponsor } = await supabaseAdmin
              .from('pedidos')
              .select('productos')
              .eq('user_id', sponsor.supabase_id)
              .eq('estado', 'aprobado')
              .gte('created_at', inicioMes)

            const prodsSponsor = comprasSponsor?.flatMap(p => p.productos) || [];
            // Igualamos la regla: califica si tiene al menos una compra aprobada este mes
            if (prodsSponsor.length > 0) calificado = true;
          }

          if (calificado) {
            comisionesAInsertar.push({
              user_id: sponsor.supabase_id,
              from_user: pedidoPrevio.user_id,
              monto: (nivel.monto * cantidadItems),
              tipo: `Comisión Red - ${nivel.desc}`,
              nivel: parseInt(nivel.desc.split(' ')[1]),
              pedido_id: pedido_id
            })
          }
          
          // Compresión lógica: Seguimos subiendo aunque este no califique
          actualSponsorUUID = sponsor.referido_por_uuid
        } else {
          break
        }
      }

      // 2. Insertar registros y actualizar saldos
      if (comisionesAInsertar.length > 0) {
        await supabaseAdmin.from('comisiones').insert(comisionesAInsertar)

        for (const com of comisionesAInsertar) {
          // Usamos la RPC para evitar condiciones de carrera y asegurar atomicidad
          await supabaseAdmin.rpc('increment_saldo', { user_uuid: com.user_id, amount: com.monto })
          
          if (com.nivel === 0) {
            await supabaseAdmin.from('users').update({
              activo_comisiones: true,
              ultimo_pago: new Date().toISOString()
            }).eq('supabase_id', com.user_id)
          }
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