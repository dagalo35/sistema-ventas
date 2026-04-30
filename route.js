import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Error: Faltan variables de entorno en el servidor.");
      return NextResponse.json({ error: "Configuración incompleta en el servidor" }, { status: 500 });
    }

    // Cliente para autenticación (usando anon key para verificar el token del usuario)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    // Cliente para operaciones de base de datos (usando service role para ignorar RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // Verificamos el usuario con el token de la sesión actual
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

    // Consultas en paralelo para optimizar rendimiento
    const results = await Promise.allSettled([
      supabaseAdmin.from("users").select("*").eq("supabase_id", user.id).maybeSingle(),
      supabaseAdmin.from("pedidos").select("*", { count: 'exact', head: true }).eq("estado", "enviado"),
      supabaseAdmin.from("retiros").select("monto").eq("user_id", user.id).eq("estado", "pendiente"),
      supabaseAdmin.from("comisiones").select("monto, nivel").eq("user_id", user.id)
    ]);

    // Extraer resultados de forma segura
    const userRes = results[0].status === 'fulfilled' ? results[0].value : { data: null, error: results[0].reason };
    const pedidosRes = results[1].status === 'fulfilled' ? results[1].value : { count: 0 };
    const retirosRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
    const comisionesRes = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

    if (userRes.error || !userRes.data) {
      return NextResponse.json({ error: "No se encontró el perfil del usuario" }, { status: 404 });
    }

    const coms = comisionesRes.data || [];
    const propia = coms.filter(c => c.nivel === 0).reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);
    const red = coms.filter(c => c.nivel > 0).reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);

    return NextResponse.json({
      ok: true,
      userInfo: userRes.data,
      stats: {
        pendingCount: pedidosRes.count || 0,
        pendingWithdrawal: retirosRes.data?.reduce((acc, r) => acc + parseFloat(r.monto || 0), 0) || 0,
        gananciaPropia: propia,
        gananciaRed: red
      }
    });

  } catch (error) {
    console.error("Error crítico en Dashboard API:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar estadísticas" },
      { status: 500 }
    );
  }
}