const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// 1. CARGA ÚNICA DEL CATÁLOGO
let productos;
try {
  productos = require("./productos.json");
} catch (e) {
  console.error("Error al cargar productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. CONFIGURACIÓN DEL MODELO (Asegúrate que coincida con el que probaste)
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview", 
});

module.exports = async (req, res) => {
  // --- VERIFICACIÓN WEBHOOK ---
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error de token");
  }

  // --- PROCESAMIENTO MENSAJE ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message && message.type === "text") {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;

        // Validamos si el catálogo cargó correctamente
        if (!productos) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            // 3. TRANSFORMACIÓN DEL JSON A TEXTO (Crucial para evitar errores de API)
            const catalogoTexto = Object.keys(productos).map(categoria => {
              return productos[categoria].map(p => 
                `- ${p.nombre}: $${p.precio}. ${p.descripcion}`
              ).join("\n");
            }).join("\n\n");

            const promptFinal = `Actúa como Vitalis, asistente de Happy Tummy. 
            Responde de forma amable y breve. Si un precio es 0, di que está agotado.
            
            PRODUCTOS:
            ${catalogoTexto}

            CLIENTE DICE: "${customerText}"
            RESPUESTA VITALIS:`;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();

          } catch (aiError) {
            console.error("DETALLE DEL FALLO IA:", aiError);
            botReply = "¡Hola! 🌱 Tuve un problema al consultar los precios. ¿Te ayudo con algo más o prefieres ver la web?";
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
      return res.status(200).send("OK");
    } catch (error) {
      console.error("Error General:", error.message);
      return res.status(500).send("Error interno");
    }
  }
};
