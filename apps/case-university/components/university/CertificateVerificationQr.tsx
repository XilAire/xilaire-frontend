"use client";
import { QRCodeSVG } from "qrcode.react";
export default function CertificateVerificationQr({value}:{value:string}){return <div className="rounded-xl bg-white p-3"><QRCodeSVG value={value} size={116} level="M" marginSize={1}/></div>}
