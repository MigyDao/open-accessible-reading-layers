"use client";
import dynamic from "next/dynamic";
const Desktop = dynamic(()=>import("./desktop"),{ssr:false,loading:()=> <main className="library"><p role="status">Opening your local library…</p></main>});
export default function Page(){return <Desktop/>;}

