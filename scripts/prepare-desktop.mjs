import {cp,mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const pub=path.join(root,"apps/desktop/public");
await mkdir(pub,{recursive:true});
for(const dir of ["fonts","locales"]) await cp(path.join(root,"node_modules/@edrlab/thorium-web/dist",dir),path.join(pub,dir),{recursive:true});
await cp(path.join(root,"examples/demo-book/the-water-line.orl.json"),path.join(pub,"demo.orl.json"));

