import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderPradoIcon } from "@/lib/icon-render";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fontData = await readFile(
    join(process.cwd(), "assets/Fredoka-SemiBold.ttf"),
  );
  return renderPradoIcon(size.width, fontData);
}
