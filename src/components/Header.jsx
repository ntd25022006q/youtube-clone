import React, { useState, useEffect, useRef, useContext } from "react";
import { Menu, Search, Mic, Video, Bell, X, User, LogOut, Globe, Zap } from "lucide-react";
import { YoutubeContext } from "../context/YoutubeContext";
import { VoiceSearchModal, CreateVideoModal, GoogleLoginModal } from "./Modals";
import "./components.css";

const Header = () => {
  const {
    isSidebarExpanded,
    setIsSidebarExpanded,
    searchQuery,
    setSearchQuery,
    navigateTo,
    videos,
    notifications,
    activeInstance,
    currentUser,
    logout,
    showLoginModal,
    setShowLoginModal,
    checkAuth,
    handleVideoSelect,
    isNativeMode,
    setIsNativeMode,
  } = useContext(YoutubeContext);

  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const suggestionsRef = useRef(null);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Sync unread notifications count
  useEffect(() => {
    setUnreadNotifications(Array.isArray(notifications) ? notifications.length : 0);
  }, [notifications]);

  // Generate suggestions based on input (live API with debounce)
  useEffect(() => {
    if (!inputVal.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        // 1. Direct YouTube suggestions proxy
        const ytRes = await fetch(`/yt-suggest?client=youtube&ds=yt&hl=vi&gl=VN&q=${encodeURIComponent(inputVal)}`);
        if (ytRes.ok) {
          const text = await ytRes.text();
          const match = text.match(/window\.google\.ac\.h\((.*)\)/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            if (Array.isArray(data[1]) && data[1].length > 0) {
              const liveSuggestions = data[1].map(item => Array.isArray(item) ? item[0] : item).filter(Boolean);
              if (liveSuggestions.length > 0) {
                setSuggestions(liveSuggestions.slice(0, 10));
                return;
              }
            }
          }
        }
      } catch (e) {}

      try {
        // 2. Invidious suggestions fallback
        const base = activeInstance || "";
        const response = await fetch(
          `${base}/api/v1/search/suggestions?q=${encodeURIComponent(inputVal)}`
        );
        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.suggestions && resData.suggestions.length > 0) {
            setSuggestions(resData.suggestions.slice(0, 10));
            return;
          }
        }
      } catch (err) {
        console.warn("Live suggestions failed, fallback to local indexing:", err);
      }

      // Offline fallback: filter from loaded videos
      const q = inputVal.toLowerCase();
      const filtered = videos
        .filter((video) => video.title.toLowerCase().includes(q))
        .map((video) => video.title)
        .slice(0, 5);

      // Add some static popular Vietnamese suggestions based on common patterns
      const staticSuggestions = [];
      if (filtered.length < 5) {
        const patterns = [
          `${inputVal} mới nhất`,
          `${inputVal} hay nhất`,
          `${inputVal} 2026`,
          `${inputVal} full`,
          `${inputVal} tập 1`,
        ];
        staticSuggestions.push(...patterns.slice(0, 5 - filtered.length));
      }

      setSuggestions([...filtered, ...staticSuggestions].slice(0, 8));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [inputVal, videos, activeInstance]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setSearchQuery(inputVal);
    navigateTo("search");
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (title) => {
    setInputVal(title);
    setSearchQuery(title);
    navigateTo("search");
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setInputVal("");
    setSearchQuery("");
    navigateTo("home");
  };

  const handleLogoClick = () => {
    setInputVal("");
    setSearchQuery("");
    navigateTo("home");
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setUnreadNotifications(0);
  };

  return (
    <header className="yt-header">
      <div className="header-left">
        <button
          className="icon-btn menu-btn"
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="logo-container" onClick={handleLogoClick}>
          <svg viewBox="0 0 200 60" className="yt-logo" width="90" height="24">
            <path
              fill="#FF0000"
              d="M63,14.8c-0.7-2.6-2.7-4.7-5.3-5.4C53,8,32.5,8,32.5,8S12,8,7.3,9.3c-2.6,0.7-4.7,2.8-5.3,5.4C0.7,19.5,0.7,29.3,0.7,29.3s0,9.8,1.3,14.5c0.7,2.6,2.7,4.7,5.3,5.4C12,50.6,32.5,50.6,32.5,50.6s20.5,0,25.2-1.3c2.6-0.7,4.7-2.8,5.3-5.4C64.3,39.1,64.3,29.3,64.3,29.3S64.3,19.5,63,14.8z"
            />
            <polygon fill="#FFFFFF" points="26,38 42,29.3 26,20.6" />
            <text
              fill="#FFFFFF"
              fontFamily="Roboto, sans-serif"
              fontWeight="bold"
              fontSize="34"
              x="76"
              y="40"
              letterSpacing="-1"
            >
              YouTube
            </text>
          </svg>
          <span className="logo-country-code" style={{ fontSize: "10px", color: "#aaa", alignSelf: "flex-start", marginTop: "3px", marginLeft: "2px", fontWeight: "500" }}>VN</span>
        </div>
      </div>

      <div className="header-middle-wrapper" ref={suggestionsRef}>
        <form className="header-middle" onSubmit={handleSearchSubmit}>
          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Tìm kiếm"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="search-input"
              />
              {inputVal && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={handleClear}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button type="submit" className="search-btn" aria-label="Search button">
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-dropdown">
            {suggestions.map((item, idx) => (
              <li
                key={idx}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(item)}
              >
                <Search size={16} className="suggestion-icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="header-right">
        {/* Voice search mic button */}
        <button
          className="icon-btn action-btn"
          aria-label="Tìm kiếm bằng giọng nói"
          onClick={() => setShowVoiceModal(true)}
          title="Tìm kiếm bằng giọng nói"
          style={{ display: "flex" }}
        >
          <Mic size={20} />
        </button>

        {/* Create / Upload video button */}
        <button
          className="icon-btn action-btn"
          aria-label="Tạo video hoặc bài đăng"
          onClick={() => {
            if (!currentUser) {
              setShowLoginModal(true);
            } else {
              setShowCreateModal(true);
            }
          }}
          title="Tạo video hoặc bài đăng"
          style={{ display: "flex" }}
        >
          <Video size={20} />
        </button>

        {/* Notifications Popover */}
        <div className="notifications-wrapper" ref={notificationsRef}>
          <button
            className="icon-btn action-btn relative-btn"
            onClick={toggleNotifications}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="notification-badge">{unreadNotifications}</span>
            )}
          </button>
          {showNotifications && (
            <div className="notifications-popover">
              <div className="notifications-popover-header">
                <h3>Thông báo</h3>
              </div>
              <div className="notifications-popover-list">
                {currentUser ? (
                  notifications.length === 0 ? (
                    <div className="no-notifications-prompt">Chưa có thông báo nào.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className="notification-item-card"
                        onClick={() => {
                          const matchingVideo = videos.find(v => v.channel.name.toLowerCase().includes(notif.channelName.toLowerCase())) || videos[0];
                          if (matchingVideo) {
                            handleVideoSelect(matchingVideo);
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <img src={notif.avatar} alt="Channel avatar" className="notif-avatar" />
                        <div className="notif-text-area">
                          <p className="notif-message">
                            <strong>{notif.channelName}</strong> {notif.message}
                          </p>
                          <span className="notif-time">{notif.time}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="notif-signin-prompt">
                    <Bell size={48} className="prompt-bell-icon" />
                    <p className="prompt-text">Đăng nhập để xem thông báo mới từ các kênh bạn đăng ký</p>
                    <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
                      <User size={16} />
                      <span>Đăng nhập</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="user-profile-menu-container" ref={userMenuRef}>
            <div className="user-profile" onClick={() => setShowUserMenu(!showUserMenu)}>
              <img
                src={currentUser.avatar}
                alt="User avatar"
                className="user-avatar"
              />
            </div>
            {showUserMenu && (
              <div className="user-menu-dropdown">
                <div className="user-menu-header">
                  <img src={currentUser.avatar} alt="Avatar" className="menu-avatar" />
                  <div className="menu-info">
                    <span className="menu-name">{currentUser.name}</span>
                    <span className="menu-email">{currentUser.email}</span>
                  </div>
                </div>
                <hr className="menu-divider" />
                <div className="menu-item" onClick={() => { navigateTo("your-channel"); setShowUserMenu(false); }}>
                  <User size={18} />
                  <span>Kênh của bạn</span>
                </div>
                <div className="menu-item" onClick={() => { navigateTo("your-videos"); setShowUserMenu(false); }}>
                  <Video size={18} />
                  <span>YouTube Studio (Video của bạn)</span>
                </div>
                <div className="menu-item" onClick={() => { setShowLoginModal(true); setShowUserMenu(false); }}>
                  <User size={18} />
                  <span>Chuyển đổi tài khoản</span>
                </div>
                <hr className="menu-divider" />
                <div className="menu-item" onClick={() => { logout(); setShowUserMenu(false); navigateTo("home"); }}>
                  <LogOut size={18} />
                  <span>Đăng xuất</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="header-signin-btn" onClick={() => setShowLoginModal(true)}>
            <User size={18} />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>

      {/* Voice Search Modal */}
      {showVoiceModal && (
        <VoiceSearchModal onClose={() => setShowVoiceModal(false)} />
      )}

      {/* Google Login Modal */}
      {showLoginModal && (
        <GoogleLoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {/* Create Video Modal */}
      {showCreateModal && (
        <CreateVideoModal onClose={() => setShowCreateModal(false)} />
      )}
    </header>
  );
};

export default Header;
