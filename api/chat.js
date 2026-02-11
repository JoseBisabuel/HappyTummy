const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Carga del catálogo
let productosData;
try {
  productosData = require("./productos.json");
} catch (e) {
  console.error("Error cargando productos.json:", e.message);
}

// Inicializamos la IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SOLUCIÓN AL 404: Usamos el nombre exacto que Google reconoce en la versión estable
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

module.exports = async (req, res) => {
  // --- VERIFICACIÓN WEBHOOK ---
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error");
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

        if (!productosData) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            // Limpiamos el catálogo para enviarlo como texto simple
            const catalogoTexto = Object.keys(productosData).map(cat => {
              return productosData[cat].map(p => 
                `- ${p.nombre}: $${p.precio}. ${p.descripcion}`
              ).join("\n");
            }).join("\n\n");

            // Prompt optimizado
            const promptFinal = `Eres Vitalis, el asistente de Happy Tummy. 
            Responde brevemente usando esta lista:
            
            ${catalogoTexto}

            Pregunta: ${customerText}`;

            // Llamada a la IA con manejo de respuesta actualizado
            const result = await model.generateContent(promptFinal);
            const response = result.response;
            botReply = response.text();

          } catch (aiError) {
            console.error("Error Gemini:", aiError.message);
            botReply = "¡Hola! 🌱 Tuve un problema técnico con la lista de precios. ¿Te puedo ayudar con otra cosa o prefieres ver la web?";
          }
        }

        // --- ENVIAR A WHATSAPP ---
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
      console.error("Error POST:", error.message);
      return res.status(500).send("Error");
    }
  }
};
