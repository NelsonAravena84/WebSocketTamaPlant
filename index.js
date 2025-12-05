import { WebSocketServer, WebSocket } from 'ws';
import 'dotenv/config';

// --- SERVIDOR WEBSOCKET ---
const wss = new WebSocketServer({ port: process.env.PORT, host: '0.0.0.0' });

let ultimodato = null;

// Intervalo PING/PONG
const HEARTBEAT_INTERVAL = 10000;

// Marca al cliente como vivo al recibir PONG
function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", ws => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  console.log('Cliente conectado');

  
  const alo = setInterval(() => {
    if (ws.isAlive === false) {
      console.log("Cliente no responde → Terminando conexión");
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  // --- RECEPCIÓN DE DATOS ---
  ws.on('message', (message, isBinary, code, reason) => {
    const data = isBinary ? message : message.toString();
    console.log('Dato recibido (raw):', data);

    const sizeBinaryMessage = Buffer.byteLength(message);
    if(sizeBinaryMessage > 10000){
      ws.close(1009, "Mensaje demasiado grande");
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      ultimodato = jsonData;

      // SENSOR DE LUZ (BH1750)
      console.log("\n=== Datos Sensor BH1750 (Luz) ===");
      console.log("Intensidad lumínica:", jsonData.lux, "lux");
      console.log("==================================");

      // BMP280
      console.log("\n=== Datos BMP280 ===");
      console.log("Temperatura:", jsonData.temperature_bmp, "°C");
      console.log("Presión:", jsonData.pressure, "hPa");
      console.log("Altitud:", jsonData.altitude, "m");
      console.log("======================");

      // DS18B20
      console.log("\n=== Datos DS18B20 ===");
      console.log("Temperatura del suelo:", jsonData.temperature_ds18b20, "°C");
      console.log("======================");

      // HUMEDAD DE SUELO
      console.log("\n=== Datos Sensor Humedad de Suelo ===");
      console.log("Valor crudo ADC:", jsonData.soil_moisture_raw);
      console.log("Porcentaje humedad:", jsonData.soil_moisture_percent, "%");
      console.log("=====================================\n");

      // Reenvía datos a los clientes conectados
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(ultimodato));
        }
      });

    } catch (err) {
      console.error('Error procesando dato:', err);
    }
  });

  // --- LIMPIAR INTERVALO AL CERRAR ---
  ws.on('close', (code, reason) => {
    clearInterval(alo);
    console.log(`Cliente desconectado. Código:${code}, Razón:${reason}`);
    console.log("Esperando nueva conexión..")
  });

  // Enviar último dato si existe
  if (ultimodato) {
    ws.send(JSON.stringify(ultimodato));
  } else {
    ws.send('No hay datos disponibles todavía');
  }

});

console.log(`Servidor WebSocket escuchando en ws://localhost:${process.env.PORT}`);
