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

const statusOrder: ModStatus[] = ["Enhanced", "Likely Compatible", "Legacy"];

type SortOption = "updated" | "alphabetical" | "author" | "subscriptions";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "updated", label: "Last Updated" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "author", label: "Author Name" },
  { value: "subscriptions", label: "Subscriptions" },
];

export function App() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<ModStatus | "All">("Enhanced");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedModId, setSelectedModId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError("");
      const res = await fetch("/api/mods");
      if (!res.ok) throw new Error("Failed to load mods");
      const payload: ApiResponse = await res.json();
      setData(payload);
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

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];

    const filtered = data.mods.filter((mod) => {
      const statusMatch = statusFilter === "All" || mod.status === statusFilter;
      const query = search.trim().toLowerCase();
      const searchMatch =
        query.length === 0 ||
        mod.title.toLowerCase().includes(query) ||
        mod.description.toLowerCase().includes(query);
      return statusMatch && searchMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "updated") {
        return new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime();
      }
      if (sortBy === "alphabetical") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "author") {
        return (a.author || "").localeCompare(b.author || "");
      }
      if (sortBy === "subscriptions") {
        return b.subscriptions - a.subscriptions;
      }
      return 0;
    });
  }, [data, statusFilter, search, sortBy]);

  const selectedMod = useMemo(() => {
    return filteredAndSorted.find((m) => m.id === selectedModId) || null;
  }, [filteredAndSorted, selectedModId]);

  useEffect(() => {
    if (filteredAndSorted.length > 0 && (!selectedModId || !filteredAndSorted.some(m => m.id === selectedModId))) {
      setSelectedModId(filteredAndSorted[0].id);
    } else if (filteredAndSorted.length === 0) {
      setSelectedModId(null);
    }
  }, [filteredAndSorted, selectedModId]);

  return (
    <main className="page">
      <header className="hero">
        <h1>Conan Exiles Enhanced Mod Tracker</h1>
        <p>Steam Workshop metadata, compatibility status, and last update timestamps.</p>
        <p className="sync-info">Autosyncs every 5 minutes</p>
      </header>

      <section className="controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mod title or description..."
          aria-label="Search mods"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ModStatus | "All")}>
          <option value="All">All Statuses</option>
          {statusOrder.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
          ))}
        </select>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="meta">
        <span>Showing: {filteredAndSorted.length} mods</span>
        <span>Last Sync: {data ? new Date(data.lastSyncAtIso).toLocaleString() : "..."}</span>
      </section>

      <div className="layout-split">
        <aside className="mod-list">
          {filteredAndSorted.map((mod) => (
            <button
              key={mod.id}
              className={`mod-list-item ${selectedModId === mod.id ? "selected" : ""} ${mod.status.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setSelectedModId(mod.id)}
              type="button"
            >
              <div className="mod-list-info">
                <span className="mod-title">{mod.title}</span>
                <span className="mod-author">by {mod.author || "Unknown"}</span>
              </div>
              <span className="mod-id">ID: {mod.id}</span>
            </button>
          ))}
          {filteredAndSorted.length === 0 && <p className="no-results">No mods found.</p>}
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
