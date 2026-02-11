const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Carga segura del catálogo
let productosData;
try {
  productosData = require("./productos.json");
} catch (e) {
  console.error("Error cargando productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CAMBIO CLAVE: Usamos la versión estable del nombre del modelo
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest", // Agregamos '-latest' para forzar la versión más reciente
});

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error");
  }

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
            // Limpieza y estructuración del catálogo para la IA
            const catalogoTexto = Object.keys(productosData).map(cat => {
              return productosData[cat].map(p => 
                `- ${p.nombre}: $${p.precio}. ${p.descripcion}`
              ).join("\n");
            }).join("\n\n");

            // Prompt directo y sin systemInstruction por separado para evitar el 404
            const promptFinal = `Actúa como Vitalis, asistente de la tienda Happy Tummy. 
            Usa EXCLUSIVAMENTE esta lista de productos para responder de forma amable y breve:
            
            ${catalogoTexto}

            Pregunta del cliente: ${customerText}
            Respuesta:`;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();

          } catch (aiError) {
            console.error("Error detallado de Gemini:", aiError);
            botReply = "¡Hola! 🌱 Tuve un inconveniente al consultar la lista. ¿Podrías intentar de nuevo o visitar nuestra web?";
          }
        }

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
      console.error("Error en el proceso POST:", error.message);
      return res.status(500).send("Error");
    }
  }
};
