"use client";

/* eslint-disable @next/next/no-img-element */
import QRCode from "qrcode";
import { useEffect, useState } from "react";

type QrCodeProps = {
  value: string;
  label?: string;
  size?: number;
};

export function QrCode({ value, label, size = 220 }: QrCodeProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!value) {
      Promise.resolve().then(() => {
        if (mounted) {
          setSrc("");
        }
      });
      return () => {
        mounted = false;
      };
    }

    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    }).then((url) => {
      if (mounted) {
        setSrc(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [size, value]);

  return (
    <div className="inline-flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
      {src ? (
        <img
          alt={label ?? "QR-code"}
          className="h-auto max-w-full rounded-md"
          height={size}
          src={src}
          width={size}
        />
      ) : (
        <div
          className="grid place-items-center rounded-md bg-zinc-100 text-sm text-zinc-500"
          style={{ height: size, width: size }}
        >
          QR
        </div>
      )}
      {label ? <span className="max-w-64 break-all text-center text-xs text-zinc-600">{label}</span> : null}
    </div>
  );
}
