import React, { useContext, useRef, useEffect } from "react";
import { 
  Home, 
  Compass, 
  Tv, 
  History, 
  ThumbsUp, 
  User, 
  ListVideo, 
  Clock, 
  Film, 
  Download, 
  Music2, 
  Gamepad2, 
  Newspaper, 
  Trophy,
  Flame,
  Utensils,
  Plane,
  Code2,
  Smile,
  Laptop,
  Radio,
  Settings,
  Flag,
  HelpCircle,
  MessageSquareWarning,
  ChevronRight
} from "lucide-react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import "./components.css";

const YoutubeRedIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Sidebar = () => {
  const {
    isSidebarExpanded,
    setIsSidebarExpanded,
    activePage,
    navigateTo,
    handleChannelSelect,
    subscriptions,
    videos,
    currentUser,
    setShowLoginModal,
    handleCategorySelect
  } = useContext(YoutubeContext);

  const safeVideos = Array.isArray(videos) ? videos : [];
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];

  // Extract unique channels from videos
  const allChannels = Array.from(
    new Map(safeVideos.filter(v => v && v.channel && v.channel.id).map((v) => [v.channel.id, v.channel])).values()
  );

  // Filter channels the user subscribed to
  const subscribedChannels = allChannels.filter((ch) =>
    ch && ch.id && safeSubscriptions.includes(ch.id)
  );

  if (!isSidebarExpanded || activePage === "shorts") {
    if (activePage === "watch") return null;
    return (
      <aside className="yt-sidebar collapsed">
        <div
          className={`sidebar-collapsed-item ${activePage === "home" ? "active" : ""}`}
          onClick={() => navigateTo("home")}
          title="Trang chủ"
        >
          <Home size={22} />
          <span>Trang chủ</span>
        </div>
        <div 
          className={`sidebar-collapsed-item ${activePage === "shorts" ? "active" : ""}`}
          onClick={() => navigateTo("shorts")}
          title="Shorts"
        >
          <Compass size={22} />
          <span>Shorts</span>
        </div>
        <div 
          className={`sidebar-collapsed-item ${activePage === "subscriptions" ? "active" : ""}`}
          onClick={() => {
            if (currentUser) navigateTo("subscriptions");
            else setShowLoginModal(true);
          }}
          title="Kênh đăng ký"
        >
          <Tv size={22} />
          <span>Đăng ký</span>
        </div>
        <div
          className={`sidebar-collapsed-item ${activePage === "history" || activePage === "liked" || activePage === "playlists" ? "active" : ""}`}
          onClick={() => navigateTo("history")}
          title="Bạn"
        >
          <History size={22} />
          <span>Bạn</span>
        </div>
        <div
          className={`sidebar-collapsed-item ${activePage === "downloads" ? "active" : ""}`}
          onClick={() => navigateTo("downloads")}
          title="Tải xuống"
        >
          <Download size={22} />
          <span>Tải xuống</span>
        </div>
      </aside>
    );
  }

  const sidebarRef = useRef(null);
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.scrollLeft = 0;
  }, [isSidebarExpanded, activePage]);

  const handleSidebarScroll = (e) => {
    if (e.currentTarget.scrollLeft !== 0) {
      e.currentTarget.scrollLeft = 0;
    }
  };

  const sidebarElement = (
    <aside 
      ref={sidebarRef} 
      onScroll={handleSidebarScroll}
      className={`yt-sidebar ${activePage === "watch" ? "watch-mode-sidebar" : ""}`}
    >
      {/* SECTION 1: Core Navigation */}
      <div className="sidebar-section">
        <div
          className={`sidebar-item ${activePage === "home" ? "active" : ""}`}
          onClick={() => navigateTo("home")}
        >
          <Home size={20} />
          <span>Trang chủ</span>
        </div>
        <div 
          className={`sidebar-item ${activePage === "shorts" ? "active" : ""}`}
          onClick={() => navigateTo("shorts")}
        >
          <Compass size={20} />
          <span>Shorts</span>
        </div>
        <div
          className={`sidebar-item ${activePage === "subscriptions" ? "active" : ""}`}
          onClick={() => {
            if (currentUser) navigateTo("subscriptions");
            else setShowLoginModal(true);
          }}
        >
          <Tv size={20} />
          <span>Kênh đăng ký</span>
        </div>
      </div>

      <hr className="sidebar-divider" />

      {/* SECTION 2: Bạn (Personal Library) */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title" style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigateTo(currentUser ? "history" : "home")}>
          <span>Bạn</span>
          <ChevronRight size={14} style={{ marginLeft: "4px" }} />
        </h3>
        <div
          className={`sidebar-item ${activePage === "history" ? "active" : ""}`}
          onClick={() => navigateTo("history")}
        >
          <History size={20} />
          <span>Video đã xem</span>
        </div>
        <div
          className={`sidebar-item ${activePage === "playlists" ? "active" : ""}`}
          onClick={() => navigateTo("playlists")}
        >
          <ListVideo size={20} />
          <span>Danh sách phát</span>
        </div>
        <div
          className={`sidebar-item ${activePage === "watch-later" ? "active" : ""}`}
          onClick={() => navigateTo("watch-later")}
        >
          <Clock size={20} />
          <span>Xem sau</span>
        </div>
        <div
          className={`sidebar-item ${activePage === "liked" ? "active" : ""}`}
          onClick={() => navigateTo("liked")}
        >
          <ThumbsUp size={20} />
          <span>Video đã thích</span>
        </div>
        <div
          className={`sidebar-item ${activePage === "downloads" ? "active" : ""}`}
          onClick={() => navigateTo("downloads")}
        >
          <Download size={20} />
          <span>Nội dung tải xuống</span>
        </div>
      </div>

      <hr className="sidebar-divider" />

      {/* SECTION 3: Subscriptions channel list or Login CTA */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Kênh đăng ký</h3>
        {currentUser ? (
          subscribedChannels.length === 0 ? (
            <p className="sidebar-no-subs">Chưa đăng ký kênh nào</p>
          ) : (
            subscribedChannels.map((channel) => (
              <div
                key={channel.id}
                className="sidebar-channel-item"
                onClick={() => handleChannelSelect(channel)}
              >
                <img
                  src={channel.avatar || getFallbackAvatar(channel.name)}
                  alt={channel.name}
                  className="sidebar-channel-avatar" referrerPolicy="no-referrer"
                  onError={e => { e.target.src = getFallbackAvatar(channel.name); }}
                />
                <span className="sidebar-channel-name">{channel.name}</span>
                <span className="live-indicator-dot"></span>
              </div>
            ))
          )
        ) : (
          <div className="sidebar-signin-promo">
            <p>Đăng nhập để đăng ký kênh, xem video và hơn thế nữa.</p>
            <button className="google-signin-btn-blue sidebar-promo-btn" onClick={() => setShowLoginModal(true)}>
              <User size={16} />
              <span>Đăng nhập</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  if (activePage === "watch") {
    return (
      <>
        <div className="sidebar-backdrop" onClick={() => setIsSidebarExpanded(false)} />
        {sidebarElement}
      </>
    );
  }

  return sidebarElement;
};

export default Sidebar;
