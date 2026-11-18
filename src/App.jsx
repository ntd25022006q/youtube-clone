import React, { useContext, useEffect, useState, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import VideoDetail from "./pages/VideoDetail";
import SearchResults from "./pages/SearchResults";
import Channel from "./pages/Channel";
import History from "./pages/History";
import LikedVideos from "./pages/LikedVideos";
import YourChannel from "./pages/YourChannel";
import Playlists from "./pages/Playlists";
import WatchLater from "./pages/WatchLater";
import YourVideos from "./pages/YourVideos";
import Downloads from "./pages/Downloads";
import Shorts from "./pages/Shorts";
import Subscriptions from "./pages/Subscriptions";
import { YoutubeContext, YoutubeProvider } from "./context/YoutubeContext";
import { User, Library, Clock, Film, Download, History as HistoryIcon, ThumbsUp, Tv } from "lucide-react";
import "./App.css";

// Reusable Sign-In Gate component
const SignInGate = ({ children, title, desc, icon: Icon }) => {
  const { currentUser, setShowLoginModal } = useContext(YoutubeContext);
  
  if (currentUser) {
    return children;
  }
  
  return (
    <div className="signin-gate-container">
      <div className="signin-gate-card">
        {Icon && <Icon size={64} className="gate-icon" />}
        <h2>{title}</h2>
        <p>{desc}</p>
        <button className="google-signin-btn-blue gate-btn" onClick={() => setShowLoginModal(true)}>
          <User size={18} />
          <span>Đăng nhập</span>
        </button>
      </div>
    </div>
  );
};

const LoadingBar = () => {
  const { isLoading, isDetailsLoading, isChannelLoading } = useContext(YoutubeContext);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval;
    if (isLoading || isDetailsLoading || isChannelLoading) {
      setVisible(true);
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 8;
        });
      }, 150);
    } else {
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(t);
    }
    return () => clearInterval(interval);
  }, [isLoading, isDetailsLoading, isChannelLoading]);

  if (!visible) return null;

  return (
    <div
      className="yt-loading-bar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "3px",
        backgroundColor: "#FF0000",
        boxShadow: "0 0 8px #FF0000, 0 0 4px #FF0000",
        width: `${progress}%`,
        transition: progress === 100 ? "width 0.3s ease-out, opacity 0.3s ease-out" : "width 0.3s cubic-bezier(0.08, 0.82, 0.17, 1)",
        opacity: progress === 100 ? 0 : 1,
        zIndex: 99999,
        pointerEvents: "none"
      }}
    />
  );
};

function AppContent() {
  const { activePage, isSidebarExpanded, activeVideo, searchQuery, isMiniplayerActive, backgroundPage, toast, isNativeMode } = useContext(YoutubeContext);

  // Update browser document tab title dynamically
  useEffect(() => {
    if (isNativeMode || activePage === "native") {
      document.title = "YouTube (Chế độ Gốc)";
    } else if (activePage === "watch" && activeVideo) {
      document.title = `${activeVideo.title} - YouTube`;
    } else if (activePage === "search" && searchQuery) {
      document.title = `${searchQuery} - YouTube`;
    } else if (activePage === "channel") {
      document.title = "Kênh - YouTube";
    } else if (activePage === "history") {
      document.title = "Nhật ký xem - YouTube";
    } else if (activePage === "liked") {
      document.title = "Video đã thích - YouTube";
    } else if (activePage === "your-channel") {
      document.title = "Kênh của bạn - YouTube";
    } else if (activePage === "playlists") {
      document.title = "Danh sách phát - YouTube";
    } else if (activePage === "watch-later") {
      document.title = "Xem sau - YouTube";
    } else if (activePage === "your-videos") {
      document.title = "Video của bạn - YouTube";
    } else if (activePage === "downloads") {
      document.title = "Nội dung tải xuống - YouTube";
    } else if (activePage === "shorts") {
      document.title = "Shorts - YouTube";
    } else {
      document.title = "YouTube";
    }
  }, [activePage, activeVideo, searchQuery, isNativeMode]);

  // Switch-case based page routing
  const renderPage = () => {
    const pageToRender = (activePage === "watch" && isMiniplayerActive)
      ? (backgroundPage || "home")
      : activePage;
    switch (pageToRender) {
      case "native":
        return <NativeYouTube />;
      case "search":
        return <SearchResults />;
      case "channel":
        return <Channel />;
      case "history":
        return (
          <SignInGate title="Video đã xem" desc="Theo dõi những video bạn đã xem. Nhật ký xem không hiển thị khi bạn chưa đăng nhập." icon={HistoryIcon}>
            <History />
          </SignInGate>
        );
      case "liked":
        return (
          <SignInGate title="Video đã thích" desc="Đăng nhập để xem danh sách các video bạn đã thích" icon={ThumbsUp}>
            <LikedVideos />
          </SignInGate>
        );
      case "your-channel":
        return (
          <SignInGate title="Kênh của bạn" desc="Đăng nhập để xem và quản lý kênh cá nhân của bạn" icon={User}>
            <YourChannel />
          </SignInGate>
        );
      case "playlists":
        return (
          <SignInGate title="Danh sách phát" desc="Đăng nhập để xem và tạo danh sách phát mới" icon={Library}>
            <Playlists />
          </SignInGate>
        );
      case "watch-later":
        return (
          <SignInGate title="Xem sau" desc="Đăng nhập để xem danh sách các video đã lưu" icon={Clock}>
            <WatchLater />
          </SignInGate>
        );
      case "your-videos":
        return (
          <SignInGate title="Video của bạn" desc="Đăng nhập để xem và upload các video của bạn" icon={Film}>
            <YourVideos />
          </SignInGate>
        );
      case "downloads":
        return <Downloads />;
      case "shorts":
        return <Shorts />;
      case "subscriptions":
        return (
          <SignInGate title="Kênh đăng ký" desc="Đăng nhập để xem video mới từ các kênh bạn đã đăng ký" icon={Tv}>
            <Subscriptions />
          </SignInGate>
        );
      case "watch":
        return <VideoDetail key={activeVideo?.id || 'watch'} />;
      case "home":
      default:
        return <Home />;
    }
  };

  const showNative = false;

  const [miniPos, setMiniPos] = useState({ x: null, y: null });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    if (!isMiniplayerActive) {
      setMiniPos({ x: null, y: null });
    }
  }, [isMiniplayerActive]);

  const handleMiniDragStart = (e) => {
    if (!isMiniplayerActive) return;
    // Don't drag if clicking buttons, inputs or video player click mask
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".miniplayer-center-controls") || e.target.closest(".miniplayer-actions-col")) {
      return;
    }
    isDraggingRef.current = true;
    const overlayEl = document.querySelector(".global-watch-overlay.mini-mode");
    const rect = overlayEl ? overlayEl.getBoundingClientRect() : { left: window.innerWidth - 384, top: window.innerHeight - 309 };
    
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: rect.left,
      posY: rect.top
    };

    const handlePointerMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;
      
      const newX = Math.max(10, Math.min(window.innerWidth - 370, dragStartRef.current.posX + deltaX));
      const newY = Math.max(60, Math.min(window.innerHeight - 295, dragStartRef.current.posY + deltaY));
      
      setMiniPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="app-container">
      <LoadingBar />
      <Header />
      <div className="main-layout">
        {/* Render Sidebar only in custom Pro mode */}
        {!showNative && (activePage !== "watch" || isSidebarExpanded) && <Sidebar />}
        <main className={`content-area ${showNative || activePage === "watch" ? "no-sidebar" : (!isSidebarExpanded || activePage === "shorts" ? "collapsed" : "")}`} style={showNative ? { padding: 0, margin: 0, maxWidth: "100%", width: "100%", height: "calc(100vh - 56px)" } : {}}>
          {renderPage()}
        </main>
      </div>
      {!showNative && activeVideo && isMiniplayerActive && (
        <div 
          className="global-watch-overlay mini-mode"
          style={miniPos.x !== null ? { left: `${miniPos.x}px`, top: `${miniPos.y}px`, right: 'auto', bottom: 'auto' } : {}}
          onPointerDown={handleMiniDragStart}
        >
          <VideoDetail key={`mini_${activeVideo.id}`} />
        </div>
      )}

      {/* Global Bottom-Left Toast Notification */}
      {toast && toast.visible && (
        <div className="yt-global-toast">
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error caught by ErrorBoundary:", error, errorInfo);
    localStorage.removeItem("yt_active_video");
    localStorage.removeItem("yt_active_channel");
    localStorage.setItem("yt_active_page", "home");
  }

  handleReset = () => {
    localStorage.clear();
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#0f0f0f",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "Roboto, Arial, sans-serif",
          textAlign: "center"
        }}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="#FF0000" style={{ marginBottom: "16px" }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <h2 style={{ fontSize: "22px", marginBottom: "12px", fontWeight: "500" }}>Đã xảy ra sự cố</h2>
          <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "450px", marginBottom: "24px", lineHeight: "1.5" }}>
            Đã có lỗi bất ngờ khi tải trang. Nhấn vào nút bên dưới để khôi phục lại trang chủ YouTube.
          </p>
          {this.state.error && (
            <pre style={{
              background: "rgba(255, 0, 0, 0.1)",
              border: "1px solid rgba(255, 0, 0, 0.3)",
              color: "#ff8888",
              padding: "12px 16px",
              borderRadius: "8px",
              maxWidth: "600px",
              fontSize: "12px",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              marginBottom: "20px"
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              backgroundColor: "#cc0000",
              color: "#fff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            Tải lại trang chủ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <YoutubeProvider>
        <AppContent />
      </YoutubeProvider>
    </ErrorBoundary>
  );
}
