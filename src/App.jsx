import React, { useContext, useEffect, useState } from "react";
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
  // Auto force-reload on bundle change to clear HMR/React context state cache
  useEffect(() => {
    const version = "1.0.9";
    const saved = localStorage.getItem("yt_version");
    if (saved !== version) {
      localStorage.setItem("yt_version", version);
      window.location.reload();
    }
  }, []);

  const { activePage, isSidebarExpanded, activeVideo, searchQuery, isMiniplayerActive, backgroundPage } = useContext(YoutubeContext);

  // Update browser document tab title dynamically
  useEffect(() => {
    if (activePage === "watch" && activeVideo) {
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
  }, [activePage, activeVideo, searchQuery]);

  // Switch-case based page routing
  const renderPage = () => {
    const pageToRender = activePage === "watch" ? (backgroundPage || "home") : activePage;
    switch (pageToRender) {
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
        return (
          <SignInGate title="Nội dung tải xuống" desc="Đăng nhập để quản lý các video đã tải xuống xem offline" icon={Download}>
            <Downloads />
          </SignInGate>
        );
      case "shorts":
        return <Shorts />;
      case "subscriptions":
        return (
          <SignInGate title="Kênh đăng ký" desc="Đăng nhập để xem video mới từ các kênh bạn đã đăng ký" icon={Tv}>
            <Subscriptions />
          </SignInGate>
        );
      case "home":
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-container">
      <LoadingBar />
      <Header />
      <div className="main-layout">
        {/* Render Sidebar on normal pages. On watch page, render Sidebar only when it is expanded (drawer mode) */}
        {(activePage !== "watch" || isSidebarExpanded) && <Sidebar />}
        <main className={`content-area ${activePage === "watch" ? "no-sidebar" : (!isSidebarExpanded ? "collapsed" : "")}`}>
          {renderPage()}
        </main>
      </div>
      {activeVideo && (
        <div className={`global-watch-overlay ${isMiniplayerActive ? "mini-mode" : "full-mode"}`}>
          <VideoDetail key={activeVideo.id} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <YoutubeProvider>
      <AppContent />
    </YoutubeProvider>
  );
}
