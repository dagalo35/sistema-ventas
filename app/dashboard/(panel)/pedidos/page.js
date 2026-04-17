'use client'

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const YAPE_NUMERO = "935461911"
const YAPE_NOMBRE = "GHC INTERNATIONAL S.A.C."
const YAPE_QR = "/img/yape-qr.png"

const PRODUCTOS = [
  { nombre: 'MAGVIT17', precio: 50, imagen: '/img/magvit17.jpg' },
  { nombre: 'COLLAGEM', precio: 70, imagen: '/img/collagem.jpg' }
]

export default function Pedidos() {

  const [carrito, setCarrito] = useState({})
  const [role, setRole] = useState(null)
  const [total, setTotal] = useState(0)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState("recojo_oficina")
  const [file, setFile] = useState(null)
  const [pagoFisico, setPagoFisico] = useState(false)
  const [preview, setPreview] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [viewImg, setViewImg] = useState(null)

  useEffect(() => {
    checkRole()
    getPedidos()

    // Cerrar menú al hacer clic fuera
    const handleOutsideClick = () => setOpenMenuId(null)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  useEffect(() => {
    calcularTotal()
  }, [carrito])

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userDB } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_id', user.id)
      .single()
    setRole(userDB?.role)
  }

  async function getPedidos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setPedidos([]); // Limpiar pedidos si no hay sesión activa
      return;
    }

    const res = await fetch('/api/pedidos', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })

    // Validar si la respuesta es JSON antes de parsear
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      let errorMsg = "Error desconocido al obtener pedidos";
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } else {
        errorMsg = await res.text();
      }
      console.error("Error al obtener pedidos:", errorMsg);
      toast.error(`Error al cargar pedidos: ${errorMsg}`); // Notificación al usuario
      setPedidos([]);
      return;
    }

    const data = await res.json()

    const ordenados = data.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
    setPedidos(ordenados)
  }

  function agregar(prod) {
    setCarrito(prev => ({
      ...prev,
      [prod.nombre]: (prev[prod.nombre] || 0) + 1
    }))
  }

  function quitar(prod) {
    setCarrito(prev => {
      const nueva = (prev[prod.nombre] || 0) - 1
      if (nueva <= 0) {
        const copy = { ...prev }
        delete copy[prod.nombre]
        return copy
      }
      return { ...prev, [prod.nombre]: nueva }
    })
  }

  function calcularTotal() {
    let suma = 0
    Object.keys(carrito).forEach(nombre => {
      const prod = PRODUCTOS.find(p => p.nombre === nombre)
      if (prod) suma += prod.precio * carrito[nombre]
    })
    setTotal(suma)
  }

  function agrupar(arr) {
    const c = {}
    arr?.forEach(p => c[p] = (c[p] || 0) + 1)
    return c
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máx 5MB)")
        return
      }

      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  async function confirmarPedido() {
    if (!file && !pagoFisico) {
      toast.warning("Por favor, sube el comprobante o selecciona pago físico")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()

    const crearPedidoPromise = (async () => {
      setLoading(true)
      try {
        let finalUrl = "fisico"

        if (!pagoFisico) {
          const fileName = `comp-${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage.from('comprobantes').upload(fileName, file)
          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage
            .from('comprobantes')
            .getPublicUrl(fileName)
          finalUrl = publicUrlData.publicUrl
        }

        const productosArray = []
        Object.keys(carrito).forEach(n => {
          for (let i = 0; i < carrito[n]; i++) productosArray.push(n)
        })

        const res = await fetch('/api/pedidos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            productos: productosArray,
            total,
            tipo_entrega: tipoEntrega,
            metodo_pago: "yape",
            estado: pagoFisico ? "pendiente_pago" : "enviado",
            comprobante_url: finalUrl
          })
        })

        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Error al crear pedido")

        // 🔥 ENVIAR NOTIFICACIÓN WHATSAPP
        try {
          await fetch('/api/notificar-whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pedido_id: result.id,
              total,
              productos: productosArray,
              comprobante: finalUrl,
              tipo_entrega: tipoEntrega
            })
          })
        } catch (wsErr) {
          console.error("Error al enviar notificación WhatsApp:", wsErr)
        }

        setModalOpen(false)
        setCarrito({})
        setFile(null)
        setPagoFisico(false)
        setPreview(null)
        setShowQR(false)
        getPedidos()
        return result
      } finally {
        setLoading(false)
      }
    })()

    toast.promise(crearPedidoPromise, {
      loading: 'Enviando pedido...',
      success: '¡Pedido enviado correctamente! ✅',
      error: (err) => `Error: ${err.message} ❌`,
    })
  }

  async function actualizarEstado(pedido_id, nuevoEstado) {
    if (nuevoEstado === 'aprobado') {
      const confirmacion = confirm("⚠️ ¿Confirmas la APROBACIÓN?\n\nEsto activará al usuario y repartirá las comisiones en la red de manera irreversible.")
      if (!confirmacion) return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const actualizarPromise = (async () => {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pedido_id, estado: nuevoEstado })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado")
      
      getPedidos()
      // Si se aprobó, recargar para actualizar el saldo en el layout/dashboard
      if (nuevoEstado === 'aprobado') {
        setTimeout(() => window.location.reload(), 1000)
      }
      return data
    })()

    toast.promise(actualizarPromise, {
      loading: 'Actualizando estado...',
      success: 'Estado actualizado correctamente ✅',
      error: (err) => `Error: ${err.message} ❌`
    })
  }

  async function cancelarPedido(id) {
    const confirmar = confirm("¿Estás seguro de cancelar este pedido?")
    if (!confirmar) return

    const { data: { session } } = await supabase.auth.getSession()

    const cancelarPromise = (async () => {
      const res = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pedido_id: id })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cancelar")
      
      getPedidos()
      return data
    })()

    toast.promise(cancelarPromise, {
      loading: 'Cancelando pedido...',
      success: 'Pedido cancelado correctamente ✅',
      error: (err) => `Error: ${err.message} ❌`
    })
  }

  const totalItems = Object.values(carrito).reduce((a, b) => a + b, 0)

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />

      {role !== 'admin' && (
        <>
          <h1>🛒 Crear Pedido</h1>
          <div style={styles.products}>
            {PRODUCTOS.map(p => (
              <div key={p.nombre} style={styles.card}>
                <img src={p.imagen} alt={p.nombre} style={styles.img} />
                <h3>{p.nombre}</h3>
                <p>S/ {p.precio}</p>
                <div style={styles.counter}>
                  <button style={styles.btnSmall} onClick={() => quitar(p)}>-</button>
                  <span style={styles.qty}> {carrito[p.nombre] || 0} </span>
                  <button style={styles.btnSmall} onClick={() => agregar(p)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <button 
            style={{...styles.btnMain, opacity: totalItems > 0 ? 1 : 0.5}} 
            onClick={() => totalItems > 0 && setModalOpen(true)}
            disabled={totalItems === 0}
          >
            Continuar Pedido
          </button>
        </>
      )}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            {/* HEADER */}
            <h2 style={{ 
              textAlign: "center", 
              marginBottom: 15,
              position: "sticky",
              top: 0,
              background: "white",
              paddingBottom: 10,
              zIndex: 10
            }}>
              🧾 Confirmar Pedido
            </h2>

            {/* RESUMEN */}
            <div style={styles.summaryBox}>
              <p style={{ fontWeight: "bold", marginBottom: 10 }}>
                Resumen de tu pedido
              </p>

              {Object.entries(carrito).map(([n, c]) => {
                const p = PRODUCTOS.find(x => x.nombre === n)
                return (
                  <div key={n} style={styles.summaryItem}>
                    <span>{n} x {c}</span>
                    <span>S/ {p.precio * c}</span>
                  </div>
                )
              })}

              <div style={styles.totalRow}>
                <strong>TOTAL</strong>
                <strong>S/ {total}</strong>
              </div>
            </div>

            {/* TOTAL DESTACADO */}
            <div style={styles.totalBox}>
              <p style={{ margin: 0 }}>Total a pagar</p>
              <h1 style={{ margin: 0 }}>S/ {total}</h1>
            </div>

            {/* ENTREGA */}
            <div style={{ marginBottom: 15 }}>
              <label style={styles.labelModal}>Método de entrega</label>
              <select
                style={styles.select}
                value={tipoEntrega}
                onChange={(e) => setTipoEntrega(e.target.value)}
              >
                <option value="recojo_oficina">Recojo en Oficina</option>
                <option value="recojo_tienda">Recojo en Tienda</option>
                <option value="recojo_almacen">Recojo en Almacén</option>
                <option value="delivery">Envío a domicilio</option>
              </select>
            </div>

            {/* YAPE */}
            <div style={styles.yapeBox}>
              <p style={{ margin: 0 }}>💜 Pagar con Yape</p>

              <div
                onClick={() => {
                  navigator.clipboard.writeText(YAPE_NUMERO)
                  toast.success("Número copiado 📋")
                }}
                style={styles.yapeNumber}
              >
                {YAPE_NUMERO}
              </div>

              <small>Toca el número para copiar</small>

              <div style={{ marginTop: 10 }}>
                <img src={YAPE_QR} width={120} />
                <p style={{ fontSize: 12 }}>{YAPE_NOMBRE}</p>
              </div>
            </div>

            {/* COMPROBANTE */}
            <div style={{ marginTop: 15 }}>
              <label style={styles.labelModal}>Subir comprobante de pago</label>

              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', padding: '8px 12px', borderRadius: 8 }}>
                <input 
                  type="checkbox" 
                  id="chkFisico" 
                  checked={pagoFisico} 
                  onChange={(e) => {
                    setPagoFisico(e.target.checked)
                    if(e.target.checked) {
                      setFile(null)
                      setPreview(null)
                    }
                  }}
                />
                <label htmlFor="chkFisico" style={{ cursor: 'pointer', fontSize: 14, fontWeight: '500' }}>
                  Pagaré en físico (en el local)
                </label>
              </div>

              {!pagoFisico && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />

                  {preview && (
                    <img
                      src={preview}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        borderRadius: 10
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* BOTONES */}
            <div style={styles.modalActions}>
              <button
                style={{
                  ...styles.btnConfirm,
                  opacity: ( (file || pagoFisico) && totalItems > 0) ? 1 : 0.5
                }}
                onClick={confirmarPedido}
                disabled={(!file && !pagoFisico) || loading || totalItems === 0}
              >
                {loading ? "Procesando..." : "Confirmar Pedido"}
              </button>

              <button
                style={styles.btnCancel}
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
            </div>

            {/* MENSAJE FINAL */}
            <p style={styles.footerMsg}>
              Tu pedido será enviado para validación después del pago
            </p>

          </div>
        </div>
      )}

      {/* 🔥 HISTORIAL PRO */}
      <h2 style={{ marginTop: 40 }}>📦 Mi Historial de pedidos</h2>

      {pedidos.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p style={{ color: "#666", marginBottom: 20 }}>Aún no has realizado ningún pedido.</p>
          {role !== 'admin' && (
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={styles.btnMain}
            >
              Ver Productos
            </button>
          )}
        </div>
      )}

      <div style={styles.tableContainer}>
        {/* ENCABEZADO ÚNICO */}
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>N° Pedido</div>
          <div style={styles.headerCell}>Fecha</div>
          <div style={styles.headerCell}>Detalle</div>
          <div style={styles.headerCell}>Pago</div>
          <div style={styles.headerCell}>Comprobante</div>
          <div style={styles.headerCell}>Monto</div>
          <div style={styles.headerCell}>Estado</div>
        </div>

        {/* FILAS DE PEDIDOS */}
        <div style={styles.tableBody}>
          {pedidos.map((p, i) => {
            const productos = Object.entries(agrupar(p.productos))
              .map(([n, c]) => `${n} x${c}`)
              .join(", ")

            return (
              <div key={p.id} style={styles.tableRow}>
                <div>#{i + 1}</div>
                <div>{new Date(p.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize: 12 }}>{productos}</div>
                <div>💳 {p.metodo_pago || "N/A"}</div>
                <div>
                  {p.comprobante_url ? (
                    p.comprobante_url === 'fisico' ? (
                      <span style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold' }}>📄 FÍSICO</span>
                    ) : (
                      <button 
                        onClick={() => setViewImg(p.comprobante_url)}
                        style={{ ...styles.btnEye, marginTop: 0, padding: "4px 10px" }}
                      >
                        👁️ Ver
                      </button>
                    )
                  ) : "N/A"}
                </div>
                <div><strong>S/ {p.total}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {role === 'admin' ? (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === p.id ? null : p.id)
                        }}
                        style={{
                          ...styles.estado,
                          background:
                            p.estado === "aprobado" ? "#16a34a" :
                            p.estado === "listo_recojo" ? "#2563eb" :
                            p.estado === "rechazado" ? "#991b1b" :
                            p.estado === "cancelado" ? "#dc2626" :
                            "#f59e0b",
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: '600'
                        }}
                      >
                        {p.estado.replace('_', ' ').toUpperCase()} <span style={{ fontSize: 9 }}>▼</span>
                      </button>

                      {openMenuId === p.id && (
                        <div style={styles.statusMenu} onClick={e => e.stopPropagation()}>
                          {[
                            { val: 'enviado', label: '⏳ Enviado', color: '#f59e0b' },
                            { val: 'pendiente_pago', label: '💳 Pendiente Pago', color: '#f59e0b' },
                            { val: 'aprobado', label: '✅ Aprobar', color: '#16a34a' },
                            { val: 'rechazado', label: '❌ Rechazar', color: '#991b1b' },
                            { val: 'listo_recojo', label: '📦 Listo Recojo', color: '#2563eb' },
                            { val: 'cancelado', label: '🚫 Cancelar', color: '#dc2626' }
                          ].map(opt => (
                            <div
                              key={opt.val}
                              style={{
                                ...styles.statusOption,
                                borderLeft: p.estado === opt.val ? `4px solid ${opt.color}` : '4px solid transparent',
                                background: p.estado === opt.val ? '#f9fafb' : 'white',
                                fontWeight: p.estado === opt.val ? 'bold' : 'normal'
                              }}
                              onClick={() => {
                                actualizarEstado(p.id, opt.val)
                                setOpenMenuId(null)
                              }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{
                      ...styles.estado,
                      background:
                        p.estado === "aprobado" ? "#16a34a" :
                        p.estado === "listo_recojo" ? "#2563eb" :
                        p.estado === "rechazado" ? "#991b1b" :
                        p.estado === "cancelado" ? "#dc2626" :
                        "#f59e0b"
                    }}>
                      {p.estado.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                  {p.estado === "enviado" && role !== 'admin' && (
                    <button 
                      onClick={() => cancelarPedido(p.id)}
                      style={styles.btnCancelMini}
                      title="Cancelar pedido"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL VISTA PREVIA COMPROBANTE */}
      {viewImg && (
        <div style={styles.overlay} onClick={() => setViewImg(null)}>
          <div style={styles.modalImg} onClick={e => e.stopPropagation()}>
            <img src={viewImg} alt="Comprobante" style={{ width: '100%', borderRadius: 10, marginBottom: 15 }} />
            <button style={styles.btnMain} onClick={() => setViewImg(null)}>Cerrar Vista</button>
          </div>
        </div>
      )}

    </div>
  )
}

const styles = {
  container: { padding: 20 },

  products: { display: "flex", gap: 20 },

  card: { background: "white", padding: 15, borderRadius: 10 },

  img: { width: 150 },

  btnMain: {
    marginTop: 20,
    background: "#16a34a",
    color: "white",
    padding: 10,
    border: "none",
    borderRadius: 10
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  modal: {
    background: "white",
    padding: 25,
    borderRadius: 12,
    width: 420,
    maxHeight: "90vh",
    overflowY: "auto"
  },

  summaryBox: {
    background: "#f9fafb",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },

  summaryItem: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 5
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    borderTop: "1px solid #ddd",
    paddingTop: 10
  },

  totalBox: {
    background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
    color: "white",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
    marginBottom: 15
  },

  yapeBox: {
    background: "#ede9fe",
    padding: 15,
    borderRadius: 12,
    textAlign: "center",
    marginBottom: 10
  },

  yapeNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6d28d9",
    marginTop: 5,
    cursor: "pointer"
  },

  modalActions: {
    marginTop: 20,
    display: "flex",
    gap: 10
  },

  btnConfirm: {
    flex: 1,
    background: "#16a34a",
    color: "white",
    padding: 12,
    border: "none",
    borderRadius: 10,
    cursor: "pointer"
  },

  btnCancel: {
    flex: 1,
    background: "#e5e7eb",
    border: "none",
    borderRadius: 10,
    cursor: "pointer"
  },

  labelModal: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    display: "block"
  },

  select: {
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ddd"
  },

  footerMsg: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
    color: "#555"
  },

  tableContainer: {
    marginTop: 20,
    overflowX: "auto",
    background: "white",
    borderRadius: 15,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "100px 120px 1fr 120px 130px 100px 180px",
    gap: 10,
    background: "#f8fafc",
    padding: "15px 20px",
    borderBottom: "2px solid #e2e8f0",
    minWidth: "900px"
  },

  headerCell: {
    fontSize: 11,
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
    gridTemplateColumns: "100px 120px 1fr 120px 130px 100px 180px",
    gap: 10,
    padding: "12px 20px",
    borderBottom: "1px solid #f1f5f9",
    alignItems: "center",
    fontSize: 13,
    color: "#334155"
  },

  btnCancelMini: {
    color: '#dc2626',
    background: 'none',
    border: '1px solid #dc2626',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 10,
    padding: '2px 6px',
    lineHeight: 1
  },

  statusMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    background: "white",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    borderRadius: "10px",
    zIndex: 100,
    marginTop: "8px",
    width: "170px",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    padding: "5px 0"
  },

  statusOption: {
    padding: "10px 15px",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "left",
    color: "#374151",
    display: "block",
    width: "100%",
    transition: "background 0.2s"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  estado: {
    color: "white",
    padding: "3px 10px",
    borderRadius: 10,
    fontSize: 12
  },

  fecha: {
    fontSize: 12,
    color: "#666"
  },

  imgComp: {
    width: 120,
    marginTop: 10,
    borderRadius: 8
  },

  btnEye: {
    marginTop: 10,
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    padding: "5px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  modalImg: {
    background: "white",
    padding: 20,
    borderRadius: 15,
    maxWidth: "450px",
    width: "90%",
    textAlign: "center"
  },

  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#f3f4f6",
    borderRadius: 15,
    marginTop: 20
  }
}