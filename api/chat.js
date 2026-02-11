const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// 1. CARGA SEGURA DEL CATÁLOGO
let productos = null;
try {
  // Asegúrate de que el nombre del archivo sea exacto (mayúsculas/minúsculas)
  productos = require("./productos.json");
} catch (e) {
  console.error("⚠️ No se pudo cargar productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

module.exports = async (req, res) => {
  // --- VERIFICACIÓN WEBHOOK (GET) ---
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error de token");
  }

  // --- PROCESAMIENTO DE MENSAJES (POST) ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      // VALIDACIÓN CRUCIAL: Solo procesar si es un mensaje de texto real
      if (message?.type === "text" && message?.text?.body) {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;

        if (!productos) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            const catalogoTexto = Object.keys(productos).map(categoria => {
              return productos[categoria].map(p => `- ${p.nombre}: $${p.precio}`).join("\n");
            }).join("\n\n");

            const promptFinal = `Eres Vitalis, asistente de "Happy Tummy" en Neiva. 
            Catálogo:\n${catalogoTexto}\n
            Mensaje: "${customerText}"\n
            Respuesta:`;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();
          } catch (aiError) {
            console.error("❌ Error Gemini:", aiError.message);
            botReply = "Lo siento, tuve un problema temporal. ¿Me repites eso? 🌱";
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

      // IMPORTANTE: Siempre responder 200 a WhatsApp para que no reintente el envío
      return res.status(200).send("OK");

    } catch (error) {
      // Log detallado para ver en Vercel qué pasó exactamente
      console.error("❌ ERROR CRÍTICO:", error.response?.data || error.message);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
};
