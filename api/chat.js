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

  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message && message.type === "text") {
        const customerPhone = message.from;
        const customerText = message.text.body.toLowerCase(); // Convertimos a minúsculas para evaluar

        let botReply;

        if (!productos) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            const catalogoTexto = Object.keys(productos).map(categoria => {
              return productos[categoria].map(p => `- ${p.nombre}: $${p.precio}`).join("\n");
            }).join("\n\n");

            // --- NUEVAS INSTRUCCIONES DE PERSONALIDAD ---
            const promptFinal = `Eres Vitalis, el asistente de la tienda "Happy Tummy" en Neiva.
            
            INFORMACIÓN DE LA TIENDA:
            - Ubicación: [Inserta tu dirección aquí en Neiva]
            - Horarios: Lunes a Sábado de 8:00 AM a 7:00 PM.
            - Web: https://happytummy.vercel.app/
            - Domicilios: Hacemos envíos en Neiva.

            REGLAS DE COMPORTAMIENTO:
            1. SALUDO: Solo di "Hola, soy Vitalis" si el cliente te está saludando por primera vez. Si es una continuación, no te presentes de nuevo.
            2. CIERRE DE VENTA: Si el cliente dice que quiere comprar, desea un producto o dice "sí" a una compra, responde: "¡Excelente elección! 📝 Para procesar tu pedido, por favor confíame tu nombre completo, dirección en Neiva y un número de contacto."
            3. BREVEDAD: No hagas listas gigantes a menos que te lo pidan.

            CATÁLOGO:
            ${catalogoTexto}

            MENSAJE DEL CLIENTE: "${customerText}"
            RESPUESTA VITALIS:`;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();

          } catch (aiError) {
            botReply = "Lo siento, tuve un problema con el sistema. 🌱";
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
      return res.status(500).send("Error");
    }
  }
};
