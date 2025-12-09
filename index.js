import 'dotenv/config'
import { escribirDato } from './influxdb.js'
import { WebSocketServer, WebSocket } from 'ws';
import 'dotenv/config';

/* ============================================================
   CONFIGURACIÓN SERVIDORES WEBSOCKET
   ============================================================ */

// 1) WebSocket para ESP32 (SIN SSL)
const wss_esp = new WebSocketServer({
  port: 8080,
  host: '0.0.0.0'
});

// 2) WebSocket para la WEB (CON SSL → Nginx lo convierte en WSS)
const wss_web = new WebSocketServer({
  port: 8443,
  host: '0.0.0.0'
});

/* ============================================================
   VARIABLES GLOBALES
   ============================================================ */

let ultimodato = null;
let espConectada = false;

// Intervalo PING/PONG
const HEARTBEAT_INTERVAL = 10000;

// Marca al cliente como vivo al recibir PONG
function heartbeat() {
  this.isAlive = true;
}

/* ============================================================
   1) SERVIDOR PARA ESP32
   ============================================================ */

wss_esp.on("connection", ws => {
  espConectada = true; // Marcar ESP32 como conectada
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  console.log('ESP32 conectada al WebSocket');

  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log("ESP32 no responde → Cerrando conexión");
      espConectada = false;
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  // RECEPCIÓN DE DATOS DESDE ESP32
  ws.on('message', (message, isBinary) => {
    const data = isBinary ? message : message.toString();
    console.log('Dato recibido desde ESP32 (raw):', data);

    try {
      const jsonData = JSON.parse(data);
      ultimodato = jsonData;

      // Logs estructurados
      console.log("\n=== Datos Sensor ===");
      console.log(jsonData);
      console.log("====================\n");

      // Reenvía datos a TODOS los clientes web conectados
      wss_web.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(ultimodato));
        }
      });

      // --- INTEGRACIÓN CON INFLUXDB ---
      escribirDato('sensores_esp32', {}, ultimodato);

    } catch (err) {
      console.error('Error procesando dato:', err);
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    espConectada = false;
    console.log("ESP32 desconectada");
  });
});

/* ============================================================
   SERVIDOR PARA LA PÁGINA WEB
   ============================================================ */

wss_web.on("connection", ws => {
  // Si ESP32 no está conectada, cerramos la conexión
  if (!espConectada) {
    console.log("Cliente WEB intentó conectarse pero ESP32 no está conectada → Cerrando conexión");
    ws.close();
    return;
  }

  ws.isAlive = true;
  ws.on('pong', heartbeat);

  console.log('Cliente WEB conectado');

  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log("Cliente WEB no responde → Cerrando conexión");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  // Enviar último dato registrado al entrar
  if (ultimodato) {
    ws.send(JSON.stringify(ultimodato));
  } else {
    ws.send('No hay datos disponibles todavía');
  }

  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log("Cliente WEB desconectado");
  });
});

/* ============================================================
   MENSAJES DEL SERVIDOR
   ============================================================ */

console.log("Servidor ESP32 escuchando en ws://0.0.0.0:8080");
console.log("Servidor WEB escuchando en ws://0.0.0.0:8443 (Nginx → WSS)");
