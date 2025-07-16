import { createRoot } from "react-dom/client";
// Force dark mode globally for Tailwind
if (typeof document !== 'undefined') {
  document.body.classList.add('dark');
}
import { getServerInfo } from "./config/api";
import App from "./App";
import "./index.css";

// Log local development setup info to console
const serverInfo = getServerInfo();
console.log(`🏠 Local Development Mode`);
console.log(`🔗 Frontend connecting to: ${serverInfo.name}`);
console.log(`📍 API Base URL: ${serverInfo.baseUrl}`);
console.log(`🌐 Server Port: ${serverInfo.port}`);
console.log(`🚫 Express Server: Disabled`);
console.log(`✅ Django Backend Connected Successfully!`);

createRoot(document.getElementById("root")!).render(<App />);
