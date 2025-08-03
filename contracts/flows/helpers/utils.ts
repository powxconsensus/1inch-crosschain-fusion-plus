export function getBytes(hexString: string) {
  return Uint8Array.from(Buffer.from(hexString.replace("0x", ""), "hex"));
}

export async function sleep(ms: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
