import { WebSocketServer, WebSocket } from 'ws';
import { escribirDato } from './influxdb.js';
import 'dotenv/config'

// --- SERVIDOR WEBSOCKET ---
const wss = new WebSocketServer({ port:process.env.PORT });

let ultimodato = null;

wss.on("connection", ws => {
  console.log('Cliente conectado');

  ws.on('message', (message, isBinary) => {
    const data = isBinary ? message : message.toString();
    console.log('Dato recibido:', data);

    try {
      const jsonData = JSON.parse(data);
      ultimodato = jsonData;

      escribirDato('lux', { ubicacion: 'maceta1' }, { valor: jsonData.lux });
      escribirDato('temperature_bmp', { ubicacion: 'maceta1' }, { valor: jsonData.temperature_bmp });
      escribirDato('temperature_ds18b20', { ubicacion: 'maceta1' }, { valor: jsonData.temperature_ds18b20 });
      escribirDato('pressure', { ubicacion: 'maceta1' }, { valor: jsonData.pressure });
      escribirDato('altitude', { ubicacion: 'maceta1' }, { valor: jsonData.altitude });
      escribirDato('soil_moisture', { ubicacion: 'maceta1' }, { valor: jsonData.soil_moisture });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(ultimodato));
        }
      });

    } catch (err) {
      console.error('Error procesando dato:', err);
    }
  });

  if (ultimodato) {
    ws.send(JSON.stringify(ultimodato));
  } else {
    ws.send('No hay datos disponibles todavía');
  }
});


console.log('Servidor WebSocket escuchando en ws://localhost:8080');
