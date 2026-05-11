import { Header } from "./components/Header.js";
import { DiffToolbar } from "./components/DiffToolbar.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { ToastHost } from "./components/ToastHost.js";
import { useWebSocket } from "./hooks/useWebSocket.js";

export function App(): JSX.Element {
  useWebSocket();
  return (
    <>
      <Header />
      <DiffToolbar />
      <DiffViewer />
      <ToastHost />
    </>
  );
}
