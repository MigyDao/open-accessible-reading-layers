import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "node_modules/@edrlab/thorium-web/dist");
const destination = path.join(root, "apps/reference-reader/public");
await mkdir(destination, { recursive: true });
for (const directory of ["locales", "fonts"]) {
  await cp(path.join(source, directory), path.join(destination, directory), {
    recursive: true
  });
}
