import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function proxy(req) {
  const { pathname } = req.nextUrl

  // 1. Rutas excluidas (Página de mantenimiento, recursos estáticos y Auth)
  if (
    pathname === '/mantenimiento' || 
    pathname.startsWith('/_next') || 
    pathname.includes('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. Conectar a Supabase para verificar configuración dinámica
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Requerido para leer config sin bloqueos
  )

  const { data: config } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'mantenimiento')
    .maybeSingle()

  const maintenance = config?.valor || { activo: false }
  const ahora = new Date()
  let isMaintenanceActive = maintenance.activo === true

  // Lógica de horario programado
  if (maintenance.inicio && maintenance.fin) {
    const inicio = new Date(maintenance.inicio)
    const fin = new Date(maintenance.fin)
    if (ahora >= inicio && ahora <= fin) {
      isMaintenanceActive = true
    }
  }

  if (isMaintenanceActive) {
    // 🛡️ LÓGICA DE BYPASS PARA ADMINISTRADORES
    try {
      const allCookies = req.cookies.getAll();
      const supabaseCookie = allCookies.find(c => c.name.includes('auth-token'));
      const token = supabaseCookie?.value;

      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const { data: userDB } = await supabase
            .from('users')
            .select('role')
            .eq('supabase_id', user.id)
            .single();
            
          if (userDB?.role?.toLowerCase() === 'admin') {
            return NextResponse.next();
          }
        }
      }
    } catch (e) {
      console.error("Error verificando admin en proxy:", e);
    }

    return NextResponse.redirect(new URL('/mantenimiento', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api/auth (rutas de autenticación)
     * - _next/static, _next/image, favicon.ico (archivos estáticos)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}