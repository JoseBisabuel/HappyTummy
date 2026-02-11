const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

let productos;
try {
  productos = require("./productos.json");
} catch (e) {
  console.error("Error catálogo:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CAMBIO: Usamos gemini-1.5-pro para mayor estabilidad con prompts largos
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", 
});

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    return token === "vitalis123" ? res.status(200).send(challenge) : res.status(403).send("Error");
  }

  if (req.method === "POST") {
    // 1. RESPUESTA INMEDIATA: Detiene reintentos y evita que te marquen como spam
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
            // Simplificación agresiva del catálogo para evitar bloqueos de la IA
            const catalogoTexto = Object.keys(productos).map(cat => {
              return productos[cat].map(p => `- ${p.nombre}: $${p.precio}`).join("\n");
            }).join("\n\n");

            const promptFinal = `Eres Vitalis, asistente de "Vitalis Tienda Vegana" en Neiva.
            UBICACIÓN: Cl 4 #7-64. Maps: https://maps.google.com/?q=Calle+4+%237-64,+Neiva,+Huila
            HORARIOS: Lun-Jue 8am-6pm, Vie 8am-5pm.
            REGLAS: Solo di "Hola, soy Vitalis" al inicio. Si piden asesor o dan datos de envío, indica que un humano confirmará pronto.

            CATÁLOGO:
            ${catalogoTexto}

            CLIENTE: "${customerText}"
            VITALIS:`;

            // 2. TIMEOUT MANUAL: Si la IA tarda mucho, lanzamos error para usar respuesta de respaldo
            const result = await Promise.race([
              model.generateContent(promptFinal),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]);

            botReply = result.response.text();

          } catch (aiError) {
            console.error("Fallo IA:", aiError.message);
            // Respuesta de emergencia si falla por "tostadas" o "horarios"
            botReply = "¡Hola! 🌱 Para darte la mejor información, consulta nuestra web: https://happytummy.vercel.app/ o espera un momento a que un asesor te atienda personalmente.";
          }
        }

        // 3. ENVÍO FINAL
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
      console.error("Error Crítico:", error.message);
    }
  }
};
