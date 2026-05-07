import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import DOMPurify from "dompurify";

type ModStatus = "Enhanced" | "Likely Compatible" | "Legacy";
type ModRecord = {
  id: string;
  title: string;
  description: string;
  author: string;
  updatedAtIso: string;
  status: ModStatus;
  subscriptions: number;
  steamLink: string;
};

type ApiResponse = {
  lastSyncAtIso: string;
  itemCount: number;
  mods: ModRecord[];
};
type StatusResponse = {
  discoveryMode: "all" | "manual";
  hasSteamApiKey: boolean;
  syncRequiresPassword: boolean;
  lastSyncError: string;
};

const statusOrder: ModStatus[] = ["Enhanced", "Likely Compatible", "Legacy"];

export function App() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<ModStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedModId, setSelectedModId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError("");
      const [modsRes, statusRes] = await Promise.all([fetch("/api/mods"), fetch("/api/status")]);
      if (!modsRes.ok) throw new Error("Failed to load mods");
      if (!statusRes.ok) throw new Error("Failed to load status");
      const modsPayload: ApiResponse = await modsRes.json();
      const statusPayload: StatusResponse = await statusRes.json();
      setData(modsPayload);
      setStatus(statusPayload);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    let active = true;
    void load();
    const timer = setInterval(() => {
      if (!active) return;
      void load();
    }, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setError("");
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: status?.syncRequiresPassword
          ? { "x-admin-password": adminPassword }
          : undefined
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Sync failed");
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.mods.filter((mod) => {
      const statusMatch = statusFilter === "All" || mod.status === statusFilter;
      const query = search.trim().toLowerCase();
      const searchMatch =
        query.length === 0 ||
        mod.title.toLowerCase().includes(query) ||
        mod.description.toLowerCase().includes(query);
      return statusMatch && searchMatch;
    });
  }, [data, statusFilter, search]);

  const selectedMod = useMemo(() => {
    return filtered.find((m) => m.id === selectedModId) || null;
  }, [filtered, selectedModId]);

  // Select the first mod automatically if none is selected or if it disappears from filtered
  useEffect(() => {
    if (filtered.length > 0 && (!selectedModId || !filtered.some(m => m.id === selectedModId))) {
      setSelectedModId(filtered[0].id);
    } else if (filtered.length === 0) {
      setSelectedModId(null);
    }
  }, [filtered, selectedModId]);

  return (
    <main className="page">
      <header className="hero">
        <h1>Conan Exiles Enhanced Mod Tracker</h1>
        <p>Steam Workshop metadata, compatibility status, and last update timestamps.</p>
        <p className="sync-info">Autosyncs at 5 minute intervals</p>
      </header>

      <section className="controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mod title or description..."
          aria-label="Search mods"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ModStatus | "All")}>
          <option value="All">All statuses</option>
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing || (status?.syncRequiresPassword === true && adminPassword.trim().length === 0)}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
        {status?.syncRequiresPassword && (
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Admin password for Sync Now"
            aria-label="Admin sync password"
          />
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {status && status.discoveryMode === "all" && !status.hasSteamApiKey && (
        <p className="error">
          Full auto-discovery is enabled but `STEAM_API_KEY` is missing. Add it to `.env` and restart PM2.
        </p>
      )}
      {status?.lastSyncError && <p className="error">Last sync error: {status.lastSyncError}</p>}

      <section className="meta">
        <span>Total Mods: {filtered.length}</span>
        <span>Last Sync: {data ? new Date(data.lastSyncAtIso).toLocaleString() : "..."}</span>
      </section>

      <div className="layout-split">
        <aside className="mod-list">
          {filtered.map((mod) => (
            <button
              key={mod.id}
              className={`mod-list-item ${selectedModId === mod.id ? "selected" : ""} ${mod.status.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setSelectedModId(mod.id)}
              type="button"
            >
              <span className="mod-title">{mod.title}</span>
              <span className="mod-id">ID: {mod.id}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="no-results">No mods found.</p>}
        </aside>

        <section className="mod-details">
          {selectedMod ? (
            <article className={`card ${selectedMod.status.toLowerCase().replace(/\s+/g, "-")}`}>
              <h2>{selectedMod.title}</h2>
              <div className="desc markdown-content">
                {selectedMod.description ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeRaw]}
                  >
                    {DOMPurify.sanitize(
                      selectedMod.description
                        .replace(/\[h1\](.*?)\[\/h1\]/gis, '<h1>$1</h1>')
                        .replace(/\[h2\](.*?)\[\/h2\]/gis, '<h2>$1</h2>')
                        .replace(/\[h3\](.*?)\[\/h3\]/gis, '<h3>$1</h3>')
                        .replace(/\[b\](.*?)\[\/b\]/gis, '<strong>$1</strong>')
                        .replace(/\[i\](.*?)\[\/i\]/gis, '<em>$1</em>')
                        .replace(/\[u\](.*?)\[\/u\]/gis, '<u>$1</u>')
                        .replace(/\[strike\](.*?)\[\/strike\]/gis, '<del>$1</del>')
                        .replace(/\[hr\]/gis, '<hr />')
                        .replace(/\[spoiler\](.*?)\[\/spoiler\]/gis, '<span class="spoiler">$1</span>')
                        .replace(/\[url=(.*?)\](.*?)\[\/url\]/gis, '<a href="$1" target="_blank" rel="noreferrer">$2</a>')
                        .replace(/\[url\](.*?)\[\/url\]/gis, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
                        .replace(/\[list\]/gis, '<ul>')
                        .replace(/\[olist\]/gi, '<ol>')
                        .replace(/\[\/list\]/gis, '</ul>')
                        .replace(/\[\/olist\]/gi, '</ol>')
                        .replace(/\[\*\](.*?)(?=\n|\[\*\]|\[\/list\]|\[\/olist\]|$)/gis, '<li>$1</li>')
                    )}
                  </ReactMarkdown>
                ) : (
                  "No Steam description available."
                )}
              </div>
              <div className="mod-meta-grid">
                <p><strong>Status:</strong> <span className={`status-badge ${selectedMod.status.toLowerCase().replace(/\s+/g, "-")}`}>{selectedMod.status}</span></p>
                <p><strong>Mod ID:</strong> {selectedMod.id}</p>
                <p><strong>Last Updated:</strong> {new Date(selectedMod.updatedAtIso).toLocaleString()}</p>
                <p><strong>Subscriptions:</strong> {selectedMod.subscriptions.toLocaleString()}</p>
              </div>
              <a href={selectedMod.steamLink} target="_blank" rel="noreferrer" className="workshop-link">
                Open Workshop Page
              </a>
            </article>
          ) : (
            <div className="card placeholder-card">
              <p>Select a mod from the list to view its details.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
