const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

// 1. CARGA DEL CATÁLOGO
let productos;
try {
  productos = require("./productos.json");
} catch (e) {
  console.error("Error al cargar productos.json:", e.message);
}

// SDK NUEVO GEMINI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

module.exports = async (req, res) => {

  // --- VERIFICACIÓN WEBHOOK (GET) ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === "vitalis123") {
      console.log("Webhook verificado correctamente");
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Error de verificación");
  }

  // --- PROCESAMIENTO DE MENSAJES (POST) ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message?.type === "text" && message?.text?.body) {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;

        if (!productos) {
          botReply =
            "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            // FORMATEAR CATÁLOGO
            const catalogoTexto = Object.keys(productos)
              .map((categoria) => {
                return (
                  `--- ${categoria} ---\n` +
                  productos[categoria]
                    .map((p) => `- ${p.nombre}: $${p.precio}`)
                    .join("\n")
                );
              })
              .join("\n\n");

            const promptFinal = `Eres Vitalis, el asistente de la tienda "Happy Tummy" en Neiva.
            
INFORMACIÓN DE LA TIENDA:
- Ubicación: Calle 15 # 5-20, Barrio Centro, Neiva.
- Horarios: Lunes a Sábado de 8:00 AM a 7:00 PM.
- Web: https://happytummy.vercel.app/
- Domicilios: Hacemos envíos en toda Neiva.

REGLAS:
- Sé amable y breve.
- Usa emojis de comida saludable.
- No inventes productos fuera del catálogo.

CATÁLOGO:
${catalogoTexto}

MENSAJE DEL CLIENTE:
"${customerText}"

RESPUESTA VITALIS:`;

            const response = await ai.models.generateContent({
              model: "gemini-1.5-flash",
              contents: promptFinal,
            });

            botReply = response.text;

          } catch (aiError) {
            console.error("Error en Gemini:", aiError);
            botReply =
              "Lo siento, tuve un pequeño problema técnico. ¿Podrías repetirme tu duda? 🌱";
          }
        }

        // --- ENVÍO A WHATSAPP ---
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          data: {
            messaging_product: "whatsapp",
            to: customerPhone,
            text: { body: botReply },
          },
        });
      }

      return res.status(200).send("OK");

    } catch (error) {
      console.error(
        "Error detallado:",
        error.response?.data || error.message
      );
      return res.status(200).send("Error procesado");
    }
  }
};
