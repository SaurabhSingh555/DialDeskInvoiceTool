import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

// App shell: sidebar + topbar + scrollable content.
export default function Layout({ title, children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
