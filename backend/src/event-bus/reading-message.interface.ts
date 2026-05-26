export interface ReadingMessage {
  batch_id: string;
  site_id: string;
  reading: {
    value: number;
    unit: string;
    sensor_id?: string | null;
    timestamp: string;
  };
}
