import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderPradoIcon } from "@/lib/icon-render";

export function generateImageMetadata() {
  return [
    {
      id: "192",
      contentType: "image/png",
      size: { width: 192, height: 192 },
    },
    {
      id: "512",
      contentType: "image/png",
      size: { width: 512, height: 512 },
    },
  ];
}

export default async function Icon({
  id,
}: {
  id: Promise<string | number>;
}) {
  const iconId = await id;
  const dim = iconId === "192" ? 192 : 512;
  const fontData = await readFile(
    join(process.cwd(), "assets/Fredoka-SemiBold.ttf"),
  );
  return renderPradoIcon(dim, fontData);
}
