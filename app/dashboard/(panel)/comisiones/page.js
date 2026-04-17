'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Comisiones() {
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)

  useEffect(() => {
    getComisiones()
  }, [])

  async function getComisiones() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userDB } = await supabase
          .from('users')
          .select('role')
          .eq('supabase_id', session.user.id)
          .single()
        setRole(userDB?.role)
      }

      if (!session) return

      const res = await fetch('/api/comisiones', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      // Validar si la respuesta es JSON antes de parsear
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(`Error ${res.status}: Respuesta no es JSON`, text.substring(0, 100));
        throw new Error(res.status === 404 
          ? "Error 404: No se encontró la ruta de comisiones. Reinicia el servidor 'npm run dev'." 
          : "El servidor respondió con un error inesperado.");
      }

      const data = await res.json()
      
      if (data.error) {
        toast.error(data.error)
      } else {
        setComisiones(data)
      }
    } catch (err) {
      console.error("Error:", err)
      toast.error("Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando comisiones...</p>

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      
      <h1>💰 Mis Comisiones</h1>

      <div style={styles.tableContainer}>
        {/* ENCABEZADO ÚNICO PROFESIONAL */}
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>N°</div>
          <div style={styles.headerCell}>Fecha</div>
          <div style={styles.headerCell}>Código</div>
          <div style={styles.headerCell}>{role === 'admin' ? 'Beneficiario' : 'Generado por'}</div>
          <div style={styles.headerCell}>Detalle</div>
          <div style={styles.headerCell}>Nivel</div>
          <div style={styles.headerCell}>Comisión</div>
        </div>

        {/* CUERPO DE LA TABLA */}
        <div style={styles.tableBody}>
          {comisiones.map((c, i) => {
            const target = role === 'admin' ? c.beneficiary : c.origin
            const nombreCompleto = `${target?.apellidos || ''} ${target?.nombre || ''}`.trim() || 'SISTEMA'

            return (
              <div key={c.id} style={styles.tableRow}>
                <div style={{ color: '#94a3b8' }}>{comisiones.length - i}</div>
                <div>{new Date(c.created_at).toLocaleDateString()}</div>
                <div style={{ fontWeight: 'bold', color: '#7c3aed' }}>{target?.codigo || 'GHC-SYS'}</div>
                <div style={{ textTransform: 'uppercase', fontSize: 11 }}>{nombreCompleto}</div>
                <div>
                  <span style={{ fontWeight: '500' }}>{c.tipo}</span>
                  {role === 'admin' && <div style={{ fontSize: 10, color: '#94a3b8' }}>De: {c.origin?.nombre}</div>}
                </div>
                <div>
                  <span style={{
                    ...styles.pill,
                    background: c.nivel === 0 ? '#f1f5f9' : '#ede9fe',
                    color: c.nivel === 0 ? '#475569' : '#7c3aed'
                  }}>
                    {c.nivel === 0 ? 'Directo' : `Nivel ${c.nivel}`}
                  </span>
                </div>
                <div style={{ fontWeight: 'bold', color: '#16a34a' }}>
                  S/ {parseFloat(c.monto).toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 20 },
  tableContainer: {
    marginTop: 20,
    overflowX: "auto",
    background: 'white',
    borderRadius: 15,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "50px 100px 100px 1fr 180px 100px 100px",
    gap: 10,
    background: "#f8fafc",
    padding: "15px 25px",
    borderBottom: "2px solid #e2e8f0",
    minWidth: "900px"
  },
  headerCell: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  tableBody: {
    minWidth: "900px"
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "50px 100px 100px 1fr 180px 100px 100px",
    gap: 10,
    padding: "15px 25px",
    borderBottom: "1px solid #f1f5f9",
    alignItems: "center",
    fontSize: "13px",
    color: "#334155"
  },
  pill: {
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase"
  }
}