import 'dotenv/config'
import { InfluxDB, Point } from '@influxdata/influxdb-client';
// --- CONFIG INFLUXDB ---
const token = process.env.token;
const url = process.env.url;
const org = process.env.org;
const bucket = process.env.bucket;

// Cliente Influx
const client = new InfluxDB({ url, token });
const writeClient = client.getWriteApi(org, bucket, 'ns');

export function escribirDato(measurement, tags = {}, fields = {}) {
  const point = new Point(measurement);
  for (const tag in tags) point.tag(tag, tags[tag]);
  for (const field in fields) point.floatField(field, fields[field]);
  writeClient.writePoint(point);
  writeClient.flush();
}


