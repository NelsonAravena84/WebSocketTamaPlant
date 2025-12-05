import WebSocket from "ws";

const ws = new WebSocket("ws://tamapla1.sytes.net:8080"); // cambia al puerto que uses tú

ws.on("open", () => {
  console.log("Cliente conectado");

  // Crear mensaje gigante de prueba (20.000 bytes)
  const bigMessage = "A".repeat(20000);

  console.log("Enviando mensaje gigante...");
  ws.send(bigMessage);
});

ws.on("close", (code, reason) => {
  console.log("Conexión cerrada por el servidor");
  console.log("Code:", code);
  console.log("Reason:", reason.toString());
});
