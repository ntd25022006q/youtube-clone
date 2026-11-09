import React, { useState, useContext, useEffect } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import { 
  Globe, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Maximize2, 
  Zap, 
  Flame, 
  Music2, 
  Gamepad2, 
  Newspaper, 
  Compass,
  SlidersHorizontal
} from "lucide-react";
import "./pages.css";

const ENGINES = [
  { id: "piped", name: "Piped Client (Mã nguồn mở)", baseUrl: "https://piped.video", desc: "Không quảng cáo, SponsorBlock, giao diện YouTube chuẩn 100%" },
  { id: "youtube", name: "YouTube Official Player", baseUrl: "https://www.youtube-nocookie.com/embed", desc: "Luồng phát chính thức của Google 4K/60fps" },
  { id: "invidious", name: "Invidious Client", baseUrl: "https://invidious.f5.si", desc: "Máy chủ mã nguồn mở nhẹ, bảo mật cao" }
];

const CATEGORIES = [
  { id: "trending", label: "Thịnh hành", icon: Flame, pipedPath: "/trending", ytSearch: "trending+vietnam", invidiousPath: "/feed/trending" },
  { id: "music", label: "Âm nhạc", icon: Music2, pipedPath: "/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ", ytSearch: "nhac+tre+moi+nhat+vpop", invidiousPath: "/search?q=nhac+tre+moi+nhat" },
  { id: "gaming", label: "Trò chơi", icon: Gamepad2, pipedPath: "/search?q=gaming+lien+quan+highlight", ytSearch: "gaming+lien+quan+freefire", invidiousPath: "/search?q=gaming+viet+nam" },
  { id: "news", label: "Tin tức", icon: Newspaper, pipedPath: "/channel/UCjhAQhrh_TjS3jO9N9uG_bA", ytSearch: "thoi+su+vtv24+hom+nay", invidiousPath: "/search?q=thoi+su+vtv24" },
  { id: "shorts", label: "Shorts", icon: Compass, pipedPath: "/search?q=youtube+shorts+vietnam", ytSearch: "shorts+vietnam+viral", invidiousPath: "/search?q=shorts+vietnam" },
];

export default function NativeYouTube() {
  const { navigateTo, isNativeMode, setIsNativeMode } = useContext(YoutubeContext);
  const [selectedEngine, setSelectedEngine] = useState("piped");
  const [currentUrl, setCurrentUrl] = useState("https://piped.video/trending");
  const [searchInput, setSearchInput] = useState("");
  const [activeCat, setActiveCat] = useState("trending");
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute URL based on engine and category
  const getCategoryUrl = (engineId, catId) => {
    const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
    if (engineId === "piped") {
      return `https://piped.video${cat.pipedPath}`;
    } else if (engineId === "invidious") {
      return `https://invidious.f5.si${cat.invidiousPath}`;
    } else {
      return `https://www.youtube-nocookie.com/embed?listType=search&list=${cat.ytSearch}`;
    }
  };

  const handleEngineChange = (engineId) => {
    setSelectedEngine(engineId);
    const newUrl = getCategoryUrl(engineId, activeCat);
    setCurrentUrl(newUrl);
    setReloadKey(k => k + 1);
  };

  const handleCategorySelect = (cat) => {
    setActiveCat(cat.id);
    const newUrl = getCategoryUrl(selectedEngine, cat.id);
    setCurrentUrl(newUrl);
    setReloadKey(k => k + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const q = encodeURIComponent(searchInput.trim());
    let url = "";
    if (selectedEngine === "piped") {
      url = `https://piped.video/results?search_query=${q}`;
    } else if (selectedEngine === "invidious") {
      url = `https://invidious.f5.si/search?q=${q}`;
    } else {
      url = `https://www.youtube-nocookie.com/embed?listType=search&list=${q}`;
    }
    setCurrentUrl(url);
    setActiveCat("");
    setReloadKey(k => k + 1);
  };

  const handleReload = () => {
    setReloadKey(k => k + 1);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById("native-viewport-frame");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleBackToPro = () => {
    if (setIsNativeMode) setIsNativeMode(false);
    navigateTo("home");
  };

  return (
    <div className="native-youtube-root" style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 56px)",
      backgroundColor: "#0f0f0f",
      color: "#f1f1f1",
      overflow: "hidden",
      fontFamily: "Roboto, Arial, sans-serif"
    }}>
      {/* Top Professional Control Bar */}
      <div className="native-toolbar-header" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        backgroundColor: "#161616",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        gap: "12px",
        flexWrap: "wrap",
        zIndex: 100
      }}>
        {/* Left Section: Back to Pro & Engine Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleBackToPro}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            title="Quay lại giao diện YouTube Pro tùy biến thủ công"
          >
            <ArrowLeft size={15} />
            <span>YouTube Pro</span>
          </button>

          {/* Engine Selector Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#0a0a0a", padding: "3px", borderRadius: "18px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {ENGINES.map(eng => (
              <button
                key={eng.id}
                onClick={() => handleEngineChange(eng.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  backgroundColor: selectedEngine === eng.id ? "#cc0000" : "transparent",
                  color: selectedEngine === eng.id ? "#fff" : "#aaa",
                  transition: "all 0.2s ease"
                }}
                title={eng.desc}
              >
                {eng.id === "piped" && <Zap size={12} />}
                {eng.id === "youtube" && <Globe size={12} />}
                {eng.id === "invidious" && <ShieldCheck size={12} />}
                <span>{eng.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Search input */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", flex: "1", maxWidth: "420px", minWidth: "200px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            backgroundColor: "#121212",
            border: "1px solid #303030",
            borderRadius: "20px",
            padding: "0 10px"
          }}>
            <input
              type="text"
              placeholder="Tìm kiếm video, ca sĩ, kênh trên YouTube mã nguồn mở..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                padding: "6px 4px",
                fontSize: "13px"
              }}
            />
            <button
              type="submit"
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
            >
              <Search size={16} />
            </button>
          </div>
        </form>

        {/* Right Section: Categories & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 10px",
                  borderRadius: "14px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "500",
                  cursor: "pointer",
                  backgroundColor: isActive ? "#fff" : "rgba(255, 255, 255, 0.08)",
                  color: isActive ? "#000" : "#fff",
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={12} />
                <span>{cat.label}</span>
              </button>
            );
          })}

          <button
            onClick={handleReload}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#fff",
              padding: "6px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            title="Làm mới trang"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#fff",
              padding: "6px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            title="Toàn màn hình"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Full Viewport Frame */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", backgroundColor: "#000" }}>
        <iframe
          id="native-viewport-frame"
          key={reloadKey}
          src={currentUrl}
          title="Open Source YouTube Frontend"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block"
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Status Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 16px",
        backgroundColor: "#121212",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        fontSize: "11px",
        color: "#888"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={13} color="#2ba640" />
          <span>
            Đang chạy engine: <strong style={{ color: "#fff" }}>{ENGINES.find(e => e.id === selectedEngine)?.name}</strong> — Mã nguồn mở, 0 quảng cáo, đầy đủ thuật toán & giao diện chuẩn YouTube
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#3ea6ff", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
          >
            Mở trong tab mới <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
