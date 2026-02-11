const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

let productos;
try {
  productos = require("./productos.json");
} catch (e) {
  console.error("Error al cargar productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview", // Versión estable para evitar errores de preview
});

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error");
  }

  if (req.method === "POST") {
    // 1. RESPUESTA INMEDIATA A META (Evita reintentos y mensajes duplicados/spam)
    res.status(200).send("EVENT_RECEIVED");

    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message && message.type === "text") {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;

        if (!productos) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            // Simplificamos el catálogo para que la IA no se bloquee con tanta info
            const catalogoTexto = Object.keys(productos).map(cat => {
              return productos[cat].map(p => `- ${p.nombre}: $${p.precio}`).join("\n");
            }).join("\n\n");

            const promptFinal = `Eres Vitalis, asistente de "Vitalis Tienda Vegana y Vegetariana" en Neiva.
            
            INFO:
            - Ubicación: Cl 4 #7-64, Neiva. Maps: https://maps.google.com/?q=Calle+4+%237-64,+Neiva,+Huila
            - Horarios: Lun-Jue 8am-6pm, Vie 8am-5pm (Jornada continua).
            - Web: https://happytummy.vercel.app/
            - Redes: @vitalistiendavegana (IG y FB).

            REGLAS:
            1. No te presentes si ya saludaste.
            2. Si piden catálogo, envía la web.
            3. Si piden comprar o dan datos, di que un asesor verificará pronto.
            4. Si preguntan cuanto se demora el pedido, di que un asesor informará pronto.
            5. Si preguntan que cuanto vale el domicilio, di que un asesor revisará la información y te dará el precio.
            6. Si preguntan que si hacen domicilios, di que si, que envíe la dirección, el barrio y un numero de telefono.

            PRODUCTOS:
            ${catalogoTexto}

            CLIENTE: "${customerText}"
            VITALIS:`;

            const result = await model.generateContent(promptFinal);
            const response = await result.response;
            botReply = response.text();

          } catch (aiError) {
            console.error("Error de IA:", aiError);
            // Respuesta de respaldo si la IA se bloquea por filtros o tiempo
            botReply = "¡Hola! 🌱 Para darte una mejor información sobre precios o productos, por favor consulta nuestra web: https://happytummy.vercel.app/ o espera un momento a que un asesor te atienda.";
          }
        }

        // --- ENVÍO A WHATSAPP ---
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
          headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          data: {
            messaging_product: "whatsapp",
            to: customerPhone,
            text: { body: botReply }
          }
        });
      }
    } catch (error) {
      console.error("Error General:", error.message);
    }
  }
};
