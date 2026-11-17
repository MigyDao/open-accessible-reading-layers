"use client";
import dynamic from "next/dynamic";
const Desktop = dynamic(()=>import("./desktop"),{ssr:false});
export default function Page(){return <Desktop/>;}

