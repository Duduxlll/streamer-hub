// Gerador de payload PIX no formato EMV QRCPS (Merchant Presented Mode)
// Compatível com qualquer app bancário brasileiro que suporte PIX

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadParams {
  pixKey: string;
  amount: number;
  merchantName?: string;
  merchantCity?: string;
  txId?: string;
}

export function generatePixPayload({
  pixKey,
  amount,
  merchantName = "PAGAMENTO",
  merchantCity = "BRASIL",
  txId = "***",
}: PixPayloadParams): string {
  const mai = field("26",
    field("00", "BR.GOV.BCB.PIX") +
    field("01", pixKey),
  );

  const payload =
    field("00", "01") +                                       // Payload Format Indicator
    mai +                                                      // Merchant Account Information
    field("52", "0000") +                                      // MCC
    field("53", "986") +                                       // Currency (BRL)
    field("54", amount.toFixed(2)) +                           // Amount
    field("58", "BR") +                                        // Country Code
    field("59", merchantName.slice(0, 25).toUpperCase()) +    // Merchant Name
    field("60", merchantCity.slice(0, 15).toUpperCase()) +    // Merchant City
    field("62", field("05", txId.slice(0, 25))) +             // Additional Data
    "6304";                                                    // CRC placeholder

  return payload + crc16(payload);
}
