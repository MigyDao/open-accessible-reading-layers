import demoPackage from "../../../../../examples/demo-book/the-water-line.orl.json";

export function GET() {
  return Response.json(demoPackage);
}
