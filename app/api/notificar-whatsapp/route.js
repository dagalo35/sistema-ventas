import twilio from "twilio"

export async function POST(req) {
  try {
    const body = await req.json()

    const client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH
    )

    const mensaje = `
📦 NUEVO PEDIDO

🆔 Pedido: ${body.pedido_id}
💰 Total: S/${body.total}
📦 Productos: ${body.productos.join(", ")}
🚚 Entrega: ${body.tipo_entrega}

📎 Comprobante:
${body.comprobante}
`

    await client.messages.create({
      from: "whatsapp:+14155238886", // Sandbox de Twilio
      to: `whatsapp:${process.env.ADMIN_WHATSAPP}`, // Usar variable de entorno
      body: mensaje
    })

    return Response.json({ ok: true })

  } catch (err) {
    console.error("Error enviando WhatsApp:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}