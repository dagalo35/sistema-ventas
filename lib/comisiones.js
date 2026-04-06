import { supabase } from '@/lib/supabase'

// 🔥 validar activo (30 días)
export function estaActivo(usuario) {
  if (!usuario?.ultimo_pago) return false

  const hoy = new Date()
  const ultimo = new Date(usuario.ultimo_pago)

  const diff = (hoy - ultimo) / (1000 * 60 * 60 * 24)

  return diff <= 30
}

// 🔥 calcular productos
export function calcularProductos(productos) {
  const cantidadA = productos.filter(p => p === 'MAGVIT17').length
  const cantidadB = productos.filter(p => p === 'COLLAGEM').length

  const total = cantidadA + cantidadB
  const activo = cantidadA >= 1 && cantidadB >= 1

  return { total, activo }
}

// 🔥 calcular montos
export function calcularMontos(total) {
  return {
    propia: total * 5,
    nivel1: total * 5,
    nivel2: total * 3,
    nivel3: total * 2
  }
}

// 🔥 insertar comisión PRO
export async function insertarComision({
  userId,
  fromUser,
  monto,
  tipo,
  nivel,
  pedidoId
}) {

  // 🚨 evitar duplicados
  const { data: existe } = await supabase
    .from('comisiones')
    .select('id')
    .eq('pedido_id', pedidoId)
    .eq('user_id', userId)
    .eq('nivel', nivel)
    .limit(1)

  if (existe && existe.length > 0) {
    console.log("⚠️ Comisión ya existe")
    return
  }

  // 🔹 insertar comisión
  const { error } = await supabase
    .from('comisiones')
    .insert([
      {
        user_id: userId,
        from_user: fromUser,
        monto,
        tipo,
        nivel,
        pedido_id: pedidoId
      }
    ])

  if (error) {
    console.error("❌ Error comisión:", error)
    return
  }

  // 🔹 actualizar saldo
  const { data: usuario } = await supabase
    .from('users')
    .select('saldo')
    .eq('supabase_id', userId)
    .single()

  const nuevoSaldo = (usuario?.saldo || 0) + monto

  await supabase
    .from('users')
    .update({ saldo: nuevoSaldo })
    .eq('supabase_id', userId)
}