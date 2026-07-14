import React, { useContext } from "react";
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
  ChevronRight
} from "lucide-react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import "./components.css";

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
    setSelectedCategory
  } = useContext(YoutubeContext);

  // Extract unique channels from mock videos
  const allChannels = Array.from(
    new Map(videos.map((v) => [v.channel.id, v.channel])).values()
  );

  // Filter channels the user subscribed to
  const subscribedChannels = allChannels.filter((ch) =>
    subscriptions.includes(ch.id)
  );

  if (!isSidebarExpanded) {
    if (activePage === "watch") return null;
    return (
      <aside className="yt-sidebar collapsed">
        <div
          className={`sidebar-collapsed-item ${activePage === "home" ? "active" : ""}`}
          onClick={() => navigateTo("home")}
        >
          <Home size={20} />
          <span>Trang chủ</span>
        </div>
        <div 
          className={`sidebar-collapsed-item ${activePage === "shorts" ? "active" : ""}`}
          onClick={() => navigateTo("shorts")}
        >
          <Compass size={20} />
          <span>Shorts</span>
        </div>
        <div 
          className={`sidebar-collapsed-item ${activePage === "subscriptions" ? "active" : ""}`}
          onClick={() => navigateTo(currentUser ? "subscriptions" : "home")}
        >
          <Tv size={20} />
          <span>Đăng ký</span>
        </div>
        <div
          className={`sidebar-collapsed-item ${activePage === "history" ? "active" : ""}`}
          onClick={() => navigateTo("history")}
        >
          <History size={20} />
          <span>Nhật ký</span>
        </div>
      </aside>
    );
  }

  const sidebarElement = (
    <aside className={`yt-sidebar ${activePage === "watch" ? "watch-mode-sidebar" : ""}`}>
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
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Tv size={20} />
            <span>Kênh đăng ký</span>
          </div>
          <ChevronRight size={14} className="sidebar-chevron" style={{ opacity: 0.6, marginLeft: "auto" }} />
        </div>
      </div>

      <hr className="sidebar-divider" />

      {/* SECTION 2: Bạn (Personal Library) */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Bạn</h3>
        <div
          className={`sidebar-item ${activePage === "your-channel" ? "active" : ""}`}
          onClick={() => navigateTo("your-channel")}
        >
          <User size={20} />
          <span>Kênh của bạn</span>
        </div>
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
          className={`sidebar-item ${activePage === "your-videos" ? "active" : ""}`}
          onClick={() => navigateTo("your-videos")}
        >
          <Film size={20} />
          <span>Video của bạn</span>
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

      {/* Subscriptions channel list or Login CTA */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title" style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigateTo(currentUser ? "your-channel" : "home")}>
          <span style={{ marginRight: "4px" }}>Đăng ký</span>
          <ChevronRight size={14} />
        </h3>
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
                  src={channel.avatar}
                  alt={channel.name}
                  className="sidebar-channel-avatar"
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

      <hr className="sidebar-divider" />

      {/* SECTION 3: Khám phá */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Khám phá</h3>
        <div className="sidebar-item" onClick={() => { setSelectedCategory("Âm nhạc"); navigateTo("home"); }}>
          <Music2 size={20} />
          <span>Âm nhạc</span>
        </div>
        <div className="sidebar-item" onClick={() => { setSelectedCategory("Trò chơi"); navigateTo("home"); }}>
          <Gamepad2 size={20} />
          <span>Trò chơi</span>
        </div>
        <div className="sidebar-item" onClick={() => { setSelectedCategory("Tin tức"); navigateTo("home"); }}>
          <Newspaper size={20} />
          <span>Tin tức</span>
        </div>
        <div className="sidebar-item" onClick={() => { setSelectedCategory("Thể thao"); navigateTo("home"); }}>
          <Trophy size={20} />
          <span>Thể thao</span>
        </div>
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
