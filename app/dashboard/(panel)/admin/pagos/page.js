'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function GestionPagos() {
  const [retiros, setRetiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRetiro, setSelectedRetiro] = useState(null)
  const [rejectRetiro, setRejectRetiro] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getRetiros()
  }, [])

  async function getRetiros() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const res = await fetch('/api/retiros', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      // 🔍 Verificar si la respuesta es realmente JSON
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("text/html")) {
        throw new Error("El servidor respondió con HTML en lugar de JSON (Posible error 404 o 500). Verifica que la API /api/retiros esté activa.")
      }

      const data = await res.json().catch(() => {
        throw new Error("La respuesta del servidor no es un JSON válido.")
      })

      if (!res.ok) throw new Error(data.error || "Error al cargar retiros")
      
      setRetiros(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function procesarPago() {
    if (!file) return toast.warning("Sube el comprobante de pago")
    setUploading(true)

    try {
      const fileName = `pago-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName)
      const publicUrl = publicUrlData.publicUrl

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/retiros', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          retiro_id: selectedRetiro.id,
          estado: 'pagado',
          comprobante_url: publicUrl
        })
      })

      if (!res.ok) throw new Error("Fallo al actualizar estado")

      toast.success("Pago procesado correctamente ✅")
      setSelectedRetiro(null)
      setFile(null)
      getRetiros()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function procesarRechazo() {
    if (!motivoRechazo) return toast.warning("Ingresa un motivo para el rechazo")
    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/retiros', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          retiro_id: rejectRetiro.id,
          estado: 'rechazado',
          motivo_rechazo: motivoRechazo
        })
      })

      if (!res.ok) throw new Error("Fallo al rechazar solicitud")

      toast.error("Solicitud rechazada ❌")
      setRejectRetiro(null)
      setMotivoRechazo("")
      getRetiros()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando gestión de pagos...</p>

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={styles.btnBack}>← Volver</button>
        <h1>💳 Gestión de Pagos (Retiros)</h1>
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Datos Bancarios</span>
          <span>Monto</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {retiros.map((r) => (
          <div key={r.id} style={styles.tableRow}>
            <span>{new Date(r.created_at).toLocaleDateString()}</span>
            <span>
              <strong>{r.users?.nombre} {r.users?.apellidos}</strong><br/>
              <small style={{ color: '#666' }}>{r.users?.codigo}</small>
            </span>
            <span style={{ fontSize: 12 }}>
              <strong>{r.banco}</strong><br/>
              Cuenta: {r.numero_cuenta}<br/>
              Titular: {r.titular}
              {r.cci && <><br/>CCI: {r.cci}</>}
            </span>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>S/ {parseFloat(r.monto).toFixed(2)}</span>
            <span style={{ 
              ...styles.pill, 
              background: r.estado === 'pendiente' ? '#fef3c7' : r.estado === 'pagado' ? '#dcfce7' : '#fee2e2', 
              color: r.estado === 'pendiente' ? '#92400e' : r.estado === 'pagado' ? '#166534' : '#991b1b' 
            }}>
              {r.estado.toUpperCase()}
            </span>
            <span style={{ display: 'flex', gap: 5 }}>
              {r.estado === 'pendiente' ? (
                <>
                  <button onClick={() => setSelectedRetiro(r)} style={styles.btnAction}>Pagar</button>
                  <button onClick={() => setRejectRetiro(r)} style={styles.btnReject}>Rechazar</button>
                </>
              ) : (
                r.estado === 'pagado' ? 
                <a href={r.comprobante_url} target="_blank" style={{ color: '#2563eb', fontSize: 12 }}>Ver Voucher</a> :
                <small style={{ color: '#991b1b' }}>Motivo: {r.motivo_rechazo}</small>
              )}
            </span>
          </div>
        ))}
      </div>

      {selectedRetiro && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Confirmar Pago</h3>
            <p>Transferir a: <strong>{selectedRetiro.titular}</strong></p>
            <p>Monto: <strong style={{ color: '#16a34a' }}>S/ {parseFloat(selectedRetiro.monto).toFixed(2)}</strong></p>
            
            <div style={{ margin: '20px 0' }}>
              <label style={styles.label}>Subir comprobante de transferencia:</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={procesarPago} disabled={uploading} style={styles.btnConfirm}>{uploading ? "Subiendo..." : "Confirmar Pago"}</button>
              <button onClick={() => setSelectedRetiro(null)} style={styles.btnCancel}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {rejectRetiro && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ color: '#b91c1c' }}>Rechazar Solicitud</h3>
            <p>Usuario: <strong>{rejectRetiro.users?.nombre}</strong></p>
            <div style={{ margin: '20px 0' }}>
              <label style={styles.label}>Motivo del rechazo:</label>
              <textarea 
                value={motivoRechazo} 
                onChange={(e) => setMotivoRechazo(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', minHeight: '80px' }}
                placeholder="Ej: Cuenta bancaria inválida..."
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={procesarRechazo} disabled={uploading} style={{ ...styles.btnConfirm, background: '#dc2626' }}>Confirmar Rechazo</button>
              <button onClick={() => setRejectRetiro(null)} style={styles.btnCancel}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: 30, background: '#f3f4f6', minHeight: '100vh' },
  btnBack: { background: 'white', border: '1px solid #ddd', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  tableContainer: { background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 1.5fr 2fr 100px 120px 150px',
    padding: '15px 25px',
    background: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 13,
    color: '#64748b',
    borderBottom: '2px solid #e2e8f0'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '100px 1.5fr 2fr 100px 120px 150px',
    padding: '15px 25px',
    alignItems: 'center',
    fontSize: 13,
    borderBottom: '1px solid #f1f5f9'
  },
  pill: { padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  btnAction: { background: '#7c3aed', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' },
  btnReject: { background: 'white', color: '#dc2626', border: '1px solid #dc2626', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' },
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
  },
  modal: {
    background: "white", padding: "30px", borderRadius: "15px", width: "90%", maxWidth: "450px"
  },
  label: { display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: 12 },
  btnConfirm: { background: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', flex: 1, fontWeight: 'bold' },
  btnCancel: { background: '#f3f4f6', color: '#4b5563', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', flex: 1, fontWeight: 'bold' }
}