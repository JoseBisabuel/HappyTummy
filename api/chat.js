const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Cargamos el catálogo (Ruta relativa correcta si está en /api)
let productosData;
try {
  productosData = require("./productos.json");
} catch (e) {
  console.error("Error cargando productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CORRECCIÓN: Usamos el nombre técnico del modelo
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
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Mira todo aquí: https://happytummy.vercel.app/";
        } else {
          try {
            // Limpieza del JSON para que la IA no se pierda
            const catalogoTexto = Object.keys(productosData).map(cat => {
              return productosData[cat].map(p => 
                `- ${p.nombre}: $${p.precio}. ${p.descripcion}`
              ).join("\n");
            }).join("\n\n");

            const promptFinal = `Eres Vitalis, asistente de Happy Tummy. 
            Usa este catálogo:
            ${catalogoTexto}

            Cliente: ${customerText}
            Respuesta:`;

            const result = await model.generateContent(promptFinal);
            const response = await result.response;
            botReply = response.text();

          } catch (aiError) {
            console.error("Error detallado de Gemini:", aiError);
            botReply = "¡Hola! 🌱 No pude consultar el catálogo. Revisa nuestra web: https://happytummy.vercel.app/";
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
      console.error("Error en el POST:", error.message);
      return res.status(500).send("Error");
    }
  }
};
