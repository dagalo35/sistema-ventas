'use client'

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [saldo, setSaldo] = useState(0)
  const [retiros, setRetiros] = useState([])
  
  // Modal Retiro
  const [modalRetiro, setModalRetiro] = useState(false)
  const [montoRetiro, setMontoRetiro] = useState("")
  const [banco, setBanco] = useState("")
  const [numeroCuenta, setNumeroCuenta] = useState("")
  const [titular, setTitular] = useState("")
  const [cci, setCci] = useState("")
  const [loadingRetiro, setLoadingRetiro] = useState(false)

  // Filtros
  const [filters, setFilters] = useState({
    n: "",
    fecha: "",
    codigo: "",
    nombre: "",
    detalle: "",
    nivel: "todos",
    monto: ""
  })

  const router = useRouter()

  const getData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }

    // 1. Obtener datos del usuario
    const { data: userDB } = await supabase
      .from('users')
      .select('role, saldo')
      .eq('supabase_id', session.user.id)
      .single()
    
    setRole(userDB?.role)
    setSaldo(parseFloat(userDB?.saldo || 0))

    // 2. Obtener Comisiones (vía API)
    const resCom = await fetch('/api/comisiones', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const dataCom = await resCom.json()
    if (resCom.ok) setComisiones(dataCom)

    // 3. Obtener Retiros
    const { data: dataRet } = await supabase
      .from('retiros')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (dataRet) setRetiros(dataRet)

    setLoading(false)
  }, [router])

  useEffect(() => {
    getData()
  }, [getData])

  async function solicitarRetiro() {
    const monto = parseFloat(montoRetiro)
    const enProceso = retiros.filter(r => r.estado === 'pendiente').reduce((acc, r) => acc + parseFloat(r.monto || 0), 0)

    if (isNaN(monto) || monto <= 0) return toast.error("Monto inválido")
    if (monto > (saldo - enProceso)) return toast.error("Saldo insuficiente considerando tus solicitudes en proceso")
    if (monto < 50) return toast.error("El mínimo es S/ 50.00")
    if (!banco || !numeroCuenta || !titular) return toast.warning("Completa los datos bancarios")

    setLoadingRetiro(true)
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const { error } = await supabase.from('retiros').insert([{
        user_id: session.user.id,
        monto,
        banco,
        numero_cuenta: numeroCuenta,
        titular,
        cci,
        estado: 'pendiente'
      }])
      if (error) throw error
      toast.success("Solicitud enviada ✅")
      setModalRetiro(false)
      getData()
    } catch (err) {
      toast.error("Error al solicitar")
    } finally {
      setLoadingRetiro(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  // 📈 CÁLCULOS
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalMes = comisiones?.filter(c => new Date(c.created_at) >= inicioMes).reduce((a, b) => a + parseFloat(b.monto || 0), 0) || 0
  const totalPropia = comisiones?.filter(c => c.nivel === 0).reduce((a, b) => a + parseFloat(b.monto || 0), 0) || 0
  const totalRed = comisiones?.filter(c => c.nivel > 0).reduce((a, b) => a + parseFloat(b.monto || 0), 0) || 0
  const enProceso = retiros.filter(r => r.estado === 'pendiente').reduce((a, b) => a + parseFloat(b.monto || 0), 0)

  const filteredComs = comisiones?.filter((c, index) => {
    const nVal = (comisiones?.length - index).toString() || ""
    const fechaVal = new Date(c.created_at).toLocaleDateString()
    const target = role === 'admin' ? c.beneficiary : c.origin
    const codigoVal = (target?.codigo || '').toLowerCase()
    const nombreVal = `${target?.apellidos || ''} ${target?.nombre || ''}`.toLowerCase()
    const detalleVal = (c.tipo || '').toLowerCase()
    const nivelStr = c.nivel === 0 ? 'directo' : `nivel ${c.nivel}`
    const montoVal = parseFloat(c.monto || 0).toFixed(2)

    return (
      nVal.includes(filters.n) &&
      fechaVal.includes(filters.fecha) &&
      codigoVal.includes(filters.codigo.toLowerCase()) &&
      nombreVal.includes(filters.nombre.toLowerCase()) &&
      detalleVal.includes(filters.detalle.toLowerCase()) &&
      (filters.nivel === "todos" || nivelStr === filters.nivel.toLowerCase()) &&
      montoVal.includes(filters.monto)
    )
  }) || []

  if (loading) return <p style={{ padding: 20 }}>Cargando información financiera...</p>

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <h1>💰 Mis Comisiones</h1>
        {role !== 'admin' && (
          <button onClick={() => setModalRetiro(true)} style={styles.btnRetiro}>💸 Solicitar Retiro</button>
        )}
      </div>

      {/* 📊 RESUMEN */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, borderTop: '4px solid #7c3aed' }}>
          <p style={styles.summaryLabel}>Generado este Mes</p>
          <h2 style={{ ...styles.summaryValue, color: '#7c3aed' }}>S/ {totalMes.toFixed(2)}</h2>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Bono Compras Propias</p>
          <h2 style={{ ...styles.summaryValue, color: '#2563eb' }}>S/ {totalPropia.toFixed(2)}</h2>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Comisiones de Red</p>
          <h2 style={{ ...styles.summaryValue, color: '#f59e0b' }}>S/ {totalRed.toFixed(2)}</h2>
        </div>
        {role !== 'admin' && (
          <>
            <div style={{ ...styles.summaryCard, border: '2px solid #16a34a' }}>
              <p style={styles.summaryLabel}>Saldo a Retirar</p>
              <h2 style={{ ...styles.summaryValue, color: '#16a34a' }}>S/ {saldo.toFixed(2)}</h2>
            </div>
            <div style={{ ...styles.summaryCard, background: '#fffbeb' }}>
              <p style={styles.summaryLabel}>Monto en Proceso</p>
              <h2 style={{ ...styles.summaryValue, color: '#f59e0b' }}>S/ {enProceso.toFixed(2)}</h2>
            </div>
          </>
        )}
      </div>

      {/* TABLA COMISIONES */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>
            <div>N°</div>
            <input name="n" value={filters.n} onChange={handleFilterChange} style={styles.headerInput} placeholder="#" />
          </div>
          <div style={styles.headerCell}>
            <div>Fecha</div>
            <input name="fecha" value={filters.fecha} onChange={handleFilterChange} style={styles.headerInput} placeholder="D/M/A" />
          </div>
          <div style={styles.headerCell}>
            <div>Código</div>
            <input name="codigo" value={filters.codigo} onChange={handleFilterChange} style={styles.headerInput} placeholder="Buscar..." />
          </div>
          <div style={styles.headerCell}>
            <div>{role === 'admin' ? 'Beneficiario' : 'Generado por'}</div>
            <input name="nombre" value={filters.nombre} onChange={handleFilterChange} style={styles.headerInput} placeholder="Nombre..." />
          </div>
          <div style={styles.headerCell}>
            <div>Detalle</div>
            <input name="detalle" value={filters.detalle} onChange={handleFilterChange} style={styles.headerInput} placeholder="Tipo..." />
          </div>
          <div style={styles.headerCell}>
            <div>Nivel</div>
            <select name="nivel" value={filters.nivel} onChange={handleFilterChange} style={styles.headerSelect}>
              <option value="todos">Todo</option>
              <option value="directo">Directo</option>
              <option value="nivel 1">Nivel 1</option>
              <option value="nivel 2">Nivel 2</option>
              <option value="nivel 3">Nivel 3</option>
            </select>
          </div>
          <div style={styles.headerCell}>
            <div>Monto</div>
            <input name="monto" value={filters.monto} onChange={handleFilterChange} style={styles.headerInput} placeholder="S/ ..." />
          </div>
        </div>

        <div style={styles.tableBody}>
          {filteredComs.map((c, i) => {
            const target = role === 'admin' ? c.beneficiary : c.origin
            return (
              <div key={c.id} style={styles.tableRow}>
                <div style={{ color: '#94a3b8' }}>{comisiones.length - comisiones.indexOf(c)}</div>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                <span style={{ fontWeight: 'bold', color: '#7c3aed' }}>{target?.codigo || 'GHC-SYS'}</span>
                <span style={{ textTransform: 'uppercase', fontSize: 11 }}>{`${target?.apellidos || ''} ${target?.nombre || ''}`}</span>
                <span>{c.tipo}</span>
                <span>
                  <span style={{ ...styles.pill, background: c.nivel === 0 ? '#f1f5f9' : '#ede9fe', color: c.nivel === 0 ? '#475569' : '#7c3aed' }}>
                    {c.nivel === 0 ? 'Directo' : `Nivel ${c.nivel}`}
                  </span>
                </span>
                <span style={{ fontWeight: 'bold', color: '#16a34a' }}>S/ {parseFloat(c.monto).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* TABLA RETIROS */}
      {role !== 'admin' && (
        <div style={{ marginTop: 40 }}>
          <h3>🕒 Historial de Retiros</h3>
          <div style={styles.tableContainer}>
            <div style={{ ...styles.tableHeader, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              <span>Fecha</span>
              <span>Monto</span>
              <span>Estado</span>
              <span>Pago</span>
            </div>
            {retiros.map(r => (
            <div key={r.id} style={styles.tableRow}>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
                <strong>S/ {parseFloat(r.monto).toFixed(2)}</strong>
                <span style={{ ...styles.pill, background: r.estado === 'pendiente' ? '#fef3c7' : '#dcfce7', color: r.estado === 'pendiente' ? '#92400e' : '#166534' }}>
                  {r.estado.toUpperCase()}
                </span>
                <small>{r.fecha_pago ? new Date(r.fecha_pago).toLocaleDateString() : 'Pendiente'}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL RETIRO */}
      {modalRetiro && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Solicitar Retiro</h3>
            <div style={{ marginBottom: 15 }}>
              <label style={styles.label}>Monto (Mín. 50)</label>
              <input type="number" value={montoRetiro} onChange={e => setMontoRetiro(e.target.value)} style={styles.headerInput} />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={styles.label}>Banco</label>
              <input value={banco} onChange={e => setBanco(e.target.value)} style={styles.headerInput} placeholder="Ej: BCP, Yape..." />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={styles.label}>N° Cuenta / Celular</label>
              <input value={numeroCuenta} onChange={e => setNumeroCuenta(e.target.value)} style={styles.headerInput} />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={styles.label}>Titular</label>
              <input value={titular} onChange={e => setTitular(e.target.value)} style={styles.headerInput} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={solicitarRetiro} disabled={loadingRetiro} style={styles.btnConfirm}>Enviar</button>
              <button onClick={() => setModalRetiro(false)} style={styles.btnCancel}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: 20 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px", marginBottom: "25px" },
  summaryCard: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" },
  summaryLabel: { fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" },
  summaryValue: { fontSize: "22px", margin: 0, fontWeight: "800" },
  tableContainer: { background: 'white', borderRadius: 15, overflowX: "auto", boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: 15 },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '60px 100px 100px 1.5fr 150px 100px 100px',
    padding: '15px 20px',
    background: '#f8fafc', fontWeight: 'bold', fontSize: 11, color: '#64748b', textTransform: 'uppercase',
    borderBottom: '2px solid #e2e8f0'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '60px 100px 100px 1.5fr 150px 100px 100px',
    padding: '15px 20px', alignItems: 'center', fontSize: 12, borderBottom: '1px solid #f1f5f9'
  },
  headerInput: { padding: '5px', borderRadius: 5, border: '1px solid #ddd', width: '100%', fontSize: 12 },
  headerSelect: { padding: '5px', borderRadius: 5, border: '1px solid #ddd', width: '100%', fontSize: 12 },
  headerCell: { display: 'flex', flexDirection: 'column', gap: 5 },
  pill: { padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 'bold' },
  btnRetiro: { background: "#16a34a", color: "white", padding: "9px 15px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
  },
  modal: {
    background: "white", padding: "30px", borderRadius: "15px", width: "90%", maxWidth: "400px"
  },
  label: { display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 },
  btnConfirm: { background: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', flex: 1, fontWeight: 'bold' },
  btnCancel: { background: '#f3f4f6', color: '#4b5563', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', flex: 1, fontWeight: 'bold' }
}