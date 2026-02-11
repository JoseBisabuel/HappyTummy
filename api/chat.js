const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Intentamos cargar el archivo JSON
let productosData;
try {
  productosData = require("./productos.json");
} catch (e) {
  console.error("Error cargando productos.json:", e.message);
  productosData = null;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `Eres "Vitalis", el asistente de Happy Tummy en Neiva. 
  Tu misión es dar información de productos de forma amable y saludable.
  - Si el producto tiene precio 0 o dice "Agotado", informa que no hay stock.
  - Usa emojis como 🌱, 🍎, ✨.
  - Si no encuentras algo, sugiere visitar: https://happytummy.vercel.app/`
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

        // VERIFICACIÓN DE CATÁLOGO
        if (!productosData) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Por ahora puedes ver todo en nuestra web: https://happytummy.vercel.app/";
        } else {
          try {
            // Simplificamos el JSON para la IA: solo nombre, precio y descripción
            // Esto evita que el mensaje sea demasiado largo (ahorra tokens)
            const catalogoLimpio = Object.keys(productosData).map(cat => {
              return productosData[cat].map(p => 
                `- ${p.nombre}: $${p.precio} (${p.descripcion})`
              ).join("\n");
            }).join("\n\n");

            const promptFinal = `
              CATÁLOGO DISPONIBLE:
              ${catalogoLimpio}

              PREGUNTA DEL CLIENTE: "${customerText}"
              
              Responde de forma breve basándote en la lista anterior.
            `;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();

          } catch (aiError) {
            console.error("Error Gemini:", aiError);
            botReply = "¡Hola! 🌱 Tuve un problema al consultar los precios. ¿Te ayudo con algo más o prefieres ver la web?";
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
      console.error("Error General:", error.message);
      return res.status(500).send("Error");
    }
  }
};
