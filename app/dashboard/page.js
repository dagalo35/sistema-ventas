'use client'

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [saldoARetirar, setSaldoARetirar] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const [gananciaPropia, setGananciaPropia] = useState(0);
  const [gananciaRed, setGananciaRed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // 🔥 1. Traer datos base del usuario
      const { data: userInfo, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("supabase_id", user.id)
        .maybeSingle();

      if (userError) throw new Error(`Error en tabla users: ${userError.message}`);

      if (!userInfo) {
        console.error("Perfil no encontrado en tabla 'users'. UID:", user.id);
        toast.error("No se encontró tu perfil de usuario.");
        router.push("/login");
        return;
      }

      // Una vez tenemos al usuario, salimos del estado de "Cargando..."
      setUserData(userInfo);

      // 🔥 2. Configurar consulta de pedidos (Sincronizado con estado 'pendiente')
      let pendingQuery = supabase
        .from("pedidos")
        .select("*", { count: 'exact', head: true })
        .eq("estado", "enviado");

      if (userInfo.role !== "admin") {
        pendingQuery = pendingQuery.eq("user_id", user.id);
      }

      // 🔥 3. Ejecutar estadísticas sin bloquear el renderizado principal
      try {
        const [resPedidos, resRetiros, resComisiones] = await Promise.all([
          pendingQuery,
          supabase.from("retiros").select("monto, created_at, estado").eq("user_id", user.id),
          supabase.from("comisiones").select("monto, nivel, created_at").eq("user_id", user.id)
        ]);

        // Procesar Pedidos
        if (resPedidos.error) console.warn("Error pedidos:", resPedidos.error.message);
        else setPendingCount(resPedidos.count || 0);

        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

        // Procesar Retiros (Monto en Proceso = todos los pendientes históricos)
        const rets = resRetiros.data || [];
        if (resRetiros.error) console.warn("Error retiros:", resRetiros.error.message);
        
        const totalPending = rets.filter(r => r.estado === 'pendiente').reduce(
          (acc, r) => acc + parseFloat(r.monto || 0), 
          0
        );
        setPendingWithdrawal(totalPending);

        const totalRetiradoMes = rets.filter(r => new Date(r.created_at) >= inicioMes).reduce((acc, r) => acc + parseFloat(r.monto || 0), 0);

        // Procesar Comisiones
        if (resComisiones.error) console.warn("Error comisiones:", resComisiones.error.message);
        const coms = resComisiones.data || [];
        const propia = coms
          .filter(c => c.nivel === 0)
          .reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);
        const red = coms
          .filter(c => c.nivel > 0)
          .reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);

        setGananciaPropia(propia);
        setGananciaRed(red);

        // 🔥 CALCULO SALDO DINÁMICO (Igual que en Comisiones)
        const totalMes = coms.filter(c => new Date(c.created_at) >= inicioMes).reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);
        setSaldoARetirar(totalMes - totalRetiradoMes);

      } catch (statsErr) {
        console.error("Error cargando estadísticas secundarias:", statsErr.message);
      }

    } catch (err) {
      console.error("Error crítico en Dashboard:", err.message || err);
      toast.error("Error al cargar la información.");
      setUserData({ nombre: "Error", role: "error" }); // Liberar UI
    }
  }

  function estaActivo(usuario) {
    if (usuario?.role === "admin") return true;
    if (!usuario?.activo_comisiones || !usuario?.ultimo_pago) return false;

    const hoy = new Date();
    const ultimo = new Date(usuario.ultimo_pago);

    const diff = (hoy - ultimo) / (1000 * 60 * 60 * 24);

    return diff <= 30;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function copiarLink() {
    if (!userData.codigo) {
      toast.warning("Tu código de referido aún no ha sido generado.");
      return;
    }

    const link = `${window.location.origin}/register?ref=${userData.codigo}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de referido copiado ✅");
    } catch (err) {
      console.error(err);
      toast.error("Error al copiar");
    }
  }

  if (!userData) return <p style={{ padding: 20 }}>Cargando...</p>;

  const referralLink = userData.codigo 
    ? `${window.location.origin}/register?ref=${userData.codigo}` 
    : "Cargando código...";

  return (
    <div style={styles.body}>
      <Toaster richColors position="top-right" />
      
      {/* HEADER */}
      <div style={styles.topbar}>
        <div style={styles.logoCircle}></div>
        <h2 style={styles.company}>GHC INTERNATIONAL S.A.C.</h2>
      </div>

      <div style={styles.container}>

        <h1 style={styles.title}>
          ¡Bienvenido, {userData.nombre?.toUpperCase()}!
        </h1>

        <p style={styles.role}>
          Rol:{" "}
          <span style={{
            color: userData.role === "admin" ? "#b91c1c" : "#1f2937",
            fontWeight: "bold"
          }}>
            {userData.role === "admin" ? "ADMINISTRADOR 👑" : "USUARIO 👤"}
          </span>
        </p>

        <p style={styles.text}>
          ID de Usuario: <span style={styles.id}>{userData.codigo}</span>
        </p>

        <p style={styles.text}>
          Estado:{" "}
          <span style={{
            color: estaActivo(userData) ? "green" : "red",
            fontWeight: "bold"
          }}>
            {estaActivo(userData) ? "Activo" : "No Activo"}
          </span>
        </p>

        {/* BOTONES */}
        <div style={styles.actions}>
          <button 
            style={styles.btn1}
            onClick={() => router.push("dashboard/pedidos")}
          >
            🛒 Realizar Pedido
          </button>

          <button 
            style={styles.btn2}
            onClick={() => router.push("dashboard/comisiones")}
          >
            💰 Mis Comisiones
          </button>

          <button 
            style={styles.btn3}
            onClick={() => router.push("dashboard/red")}
          >
            🌐 Mi Red
          </button>

          {userData.role === "admin" && (
            <button 
              style={styles.btnAdmin}
              onClick={() => router.push("dashboard/admin")}
            >
              👑 Dashboard Admin
            </button>
          )}
        </div>

        {/* STATS */}
        <div style={styles.stats}>
          <div>
            Saldo a Retirar: <strong style={{ color: '#16a34a', fontSize: '18px' }}>S/ {saldoARetirar.toFixed(2)}</strong>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
              (Propias: S/ {gananciaPropia.toFixed(2)} + Red: S/ {gananciaRed.toFixed(2)})
            </div>
          </div>

          <div>
            Monto en Proceso: <strong style={{ color: '#f59e0b' }}>S/ {pendingWithdrawal.toFixed(2)}</strong>
          </div>

          <div>
            Pedidos Pendientes: <strong>{pendingCount}</strong>
          </div>

          <div>
            Última Compra: <strong>{userData.ultimo_pago ? new Date(userData.ultimo_pago).toLocaleDateString() : "-"}</strong>
          </div>
        </div>

        {/* REFERIDO */}
        <div style={styles.ref}>
          <p>Tu Link de Referido</p>

          <div style={styles.refBox}>
            <input
              style={styles.refInput}
              value={referralLink}
              readOnly
            />

            <button style={styles.copyBtn} onClick={copiarLink}>
              📋 Copiar
            </button>
          </div>
        </div>

        {/* ACCIONES */}
        <div style={styles.bottom}>
          <button 
            style={styles.card}
            onClick={() => router.push("/dashboard/pedidos")}
          >
            📦 Pedidos
          </button>

          <button 
            style={styles.card}
            onClick={() => router.push("/dashboard/comisiones")}
          >
            💵 Historial de Comisiones
          </button>

          <button style={styles.card}
            onClick={() => router.push("/dashboard/ayuda")}
            >
            🎧 Centro de Ayuda
          </button>
        </div>

        <button onClick={logout} style={styles.logout}>
          Cerrar Sesión
        </button>

      </div>
    </div>
  );
}

/* 🎨 ESTILOS */
const styles = {
  body: {
    minHeight: "100vh",
    background: "#f3f4f6",
    fontFamily: "Inter, sans-serif"
  },

  topbar: {
    background: "white",
    padding: "15px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
  },

  logoCircle: {
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    background: "#16a34a"
  },

  company: {
    color: "#166534",
    fontWeight: "bold",
    fontSize: "16px"
  },

  container: {
    padding: "30px",
    maxWidth: "900px",
    margin: "auto"
  },

  title: {
    textAlign: "center",
    marginBottom: "10px",
    fontSize: "24px"
  },

  role: {
    textAlign: "center",
    marginBottom: "10px",
    fontSize: "14px"
  },

  text: {
    textAlign: "center",
    color: "#374151",
    marginBottom: "5px"
  },

  id: {
    color: "#16a34a",
    fontWeight: "bold"
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap"
  },

  btn1: {
    flex: 1,
    padding: "12px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },

  btn2: {
    flex: 1,
    padding: "12px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },

  btn3: {
    flex: 1,
    padding: "12px",
    background: "#065f46",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },

  btnAdmin: {
    flex: 1,
    padding: "12px",
    background: "#b91c1c",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },

  stats: {
    marginTop: "20px",
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px"
  },

  ref: {
    marginTop: "20px",
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center"
  },

  refBox: {
    display: "flex",
    gap: "10px",
    marginTop: "10px"
  },

  refInput: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "13px"
  },

  copyBtn: {
    padding: "10px 15px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },

  bottom: {
    marginTop: "20px",
    display: "flex",
    gap: "10px"
  },

  card: {
    flex: 1,
    padding: "15px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "500"
  },

  logout: {
    marginTop: "20px",
    color: "red",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto"
  }
};