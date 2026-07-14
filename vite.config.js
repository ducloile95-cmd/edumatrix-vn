import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function manualChunks(id) {
    const normalizedId = id.replace(/\\/g, "/");
    if (!normalizedId.includes("/node_modules/")) return;
    if (normalizedId.includes("/node_modules/react/") || normalizedId.includes("/node_modules/react-dom/") || normalizedId.includes("/node_modules/react-router-dom/") || normalizedId.includes("/node_modules/@tanstack/react-query/")) return "react-vendor";
    if (normalizedId.includes("/node_modules/recharts/")) return "charts";
    if (normalizedId.includes("/node_modules/date-fns/") || normalizedId.includes("/node_modules/date-fns-tz/")) return "date";
    if (normalizedId.includes("/node_modules/lucide-react/") || normalizedId.includes("/node_modules/qrcode.react/")) return "ui-vendor";
    if (normalizedId.includes("/node_modules/firebase/app-check") || normalizedId.includes("/node_modules/@firebase/app-check/")) return "firebase-app-check";
    if (normalizedId.includes("/node_modules/firebase/app/") || normalizedId.includes("/node_modules/@firebase/app/")) return "firebase-app";
    if (normalizedId.includes("/node_modules/firebase/auth") || normalizedId.includes("/node_modules/@firebase/auth/")) return "firebase-auth";
    if (normalizedId.includes("/node_modules/@firebase/webchannel-wrapper/")) return "firebase-webchannel";
    if (normalizedId.includes("/node_modules/idb/")) return "idb";
    if (normalizedId.includes("/node_modules/@firebase/firestore/") || normalizedId.includes("/node_modules/firebase/firestore")) return "firebase-firestore";
    if (normalizedId.includes("/node_modules/@firebase/")) return "firebase-shared";
}

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
});
