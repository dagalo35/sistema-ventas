import { supabase } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { pedido_id } = await req.json()

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id requerido' }, { status: 400 })
    }

    // =========================
    // 🔹 1. OBTENER PEDIDO
    // =========================
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedido_id)
      .single()

    if (pedidoError || !pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // 🔥 VALIDACIONES PRO
    if (pedido.estado === 'aprobado') {
      return Response.json({ error: 'Ya fue aprobado' }, { status: 400 })
    }

    if (pedido.estado === 'cancelado') {
      return Response.json({ error: 'Pedido cancelado por el usuario' }, { status: 400 })
    }

    if (pedido.estado === 'rechazado') {
      return Response.json({ error: 'Pedido ya fue rechazado' }, { status: 400 })
    }

    // =========================
    // 🔹 2. MARCAR APROBADO
    // =========================
    const { error: updatePedidoError } = await supabase
      .from('pedidos')
      .update({ estado: 'aprobado' })
      .eq('id', pedido_id)

    if (updatePedidoError) {
      return Response.json({ error: updatePedidoError.message }, { status: 500 })
    }

    // =========================
    // 🔹 3. OBTENER USUARIO
    // =========================
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_id', pedido.user_id)
      .single()

    if (userError || !user) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // =========================
    // 🔹 4. VALIDAR PRODUCTOS
    // =========================
    const productos = Array.isArray(pedido.productos) ? pedido.productos : []

    const cantidadA = productos.filter(p => p === 'MAGVIT17').length
    const cantidadB = productos.filter(p => p === 'COLLAGEM').length

    const totalProductos = cantidadA + cantidadB
    const activo = cantidadA >= 1 && cantidadB >= 1

    // =========================
    // 🔹 5. ACTIVAR USUARIO
    // =========================
    if (activo) {
      await supabase
        .from('users')
        .update({
          activo_comisiones: true,
          ultimo_pago: new Date()
        })
        .eq('supabase_id', user.supabase_id)

      user.ultimo_pago = new Date()
    }

    // =========================
    // 🔥 VALIDAR ACTIVO
    // =========================
    function estaActivo(usuario) {
      if (!usuario?.ultimo_pago) return false

      const hoy = new Date()
      const ultimo = new Date(usuario.ultimo_pago)

      const diff = (hoy - ultimo) / (1000 * 60 * 60 * 24)

      return diff <= 30
    }

    // =========================
    // 🔥 INSERTAR COMISION
    // =========================
    async function insertarComision(userSupabaseId, fromUser, monto, tipo, nivel, pedidoId) {

      const { data: existe } = await supabase
        .from('comisiones')
        .select('id')
        .eq('pedido_id', pedidoId)
        .eq('user_id', userSupabaseId)
        .eq('nivel', nivel)
        .limit(1)

      if (existe?.length > 0) {
        console.log("⚠️ Comisión duplicada evitada")
        return
      }

      const { error } = await supabase
        .from('comisiones')
        .insert([{
          user_id: userSupabaseId,
          from_user: fromUser,
          monto,
          tipo,
          nivel,
          pedido_id: pedidoId
        }])

      if (error) {
        console.error("❌ Error comisión:", error)
        return
      }

      // 🔹 actualizar saldo
      const { data: usuario } = await supabase
        .from('users')
        .select('saldo')
        .eq('supabase_id', userSupabaseId)
        .single()

      const nuevoSaldo = (usuario?.saldo || 0) + monto

      await supabase
        .from('users')
        .update({ saldo: nuevoSaldo })
        .eq('supabase_id', userSupabaseId)
    }

    // =========================
    // 🔥 CALCULAR COMISIONES
    // =========================
    const comisionPropia = totalProductos * 5
    const comisionNivel1 = totalProductos * 5
    const comisionNivel2 = totalProductos * 3
    const comisionNivel3 = totalProductos * 2

    // =========================
    // 🔹 COMPRA PROPIA
    // =========================
    if (activo) {
      await insertarComision(
        user.supabase_id,
        user.supabase_id,
        comisionPropia,
        'Compra propia',
        0,
        pedido_id
      )
    }

    // =========================
    // 🔹 RED
    // =========================
    if (user.referido_por && user.referido_por !== user.supabase_id) {

      const { data: nivel1 } = await supabase
        .from('users')
        .select('*')
        .eq('codigo', user.referido_por)
        .single()

      if (nivel1 && estaActivo(nivel1)) {
        await insertarComision(
          nivel1.supabase_id,
          user.supabase_id,
          comisionNivel1,
          'Nivel 1',
          1,
          pedido_id
        )
      }

      if (nivel1?.referido_por) {
        const { data: nivel2 } = await supabase
          .from('users')
          .select('*')
          .eq('codigo', nivel1.referido_por)
          .single()

        if (nivel2 && estaActivo(nivel2)) {
          await insertarComision(
            nivel2.supabase_id,
            user.supabase_id,
            comisionNivel2,
            'Nivel 2',
            2,
            pedido_id
          )
        }

        if (nivel2?.referido_por) {
          const { data: nivel3 } = await supabase
            .from('users')
            .select('*')
            .eq('codigo', nivel2.referido_por)
            .single()

          if (nivel3 && estaActivo(nivel3)) {
            await insertarComision(
              nivel3.supabase_id,
              user.supabase_id,
              comisionNivel3,
              'Nivel 3',
              3,
              pedido_id
            )
          }
        }
      }
    }

    return Response.json({
      message: '✅ Pedido aprobado correctamente. Comisiones distribuidas.'
    })

  } catch (err) {
    console.error("🔥 ERROR GENERAL:", err)
    return Response.json({ error: 'Error del servidor' }, { status: 500 })
  }
}