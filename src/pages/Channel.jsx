import React, { useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { YoutubeContext, getFallbackAvatar, getAuthenticBanner } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import { Play, ThumbsUp, ThumbsDown, MessageSquare, Share2, Music, Radio, Search, ExternalLink, X, ChevronLeft, ChevronRight, Mail, Globe, Info, Users, TrendingUp, Flag, MoreVertical } from "lucide-react";
import "./pages.css";

// Helper to render text with clickable links and hashtags
const renderLinkifiedText = (text) => {
  if (!text) return null;
  // Clean markdown image syntax or broken post attachment tags from raw scraper data
  const cleanedText = String(text)
    .replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, "")
    .replace(/<img[^>]*alt=["']?post attachment["']?[^>]*>/gi, "")
    .replace(/post attachment/gi, "")
    .trim();
  if (!cleanedText) return null;
  const tokens = cleanedText.split(/(https?:\/\/[^\s]+|#[a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+)/g);
  return tokens.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#3ea6ff", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {part}
        </a>
      );
    }
    if (/^#/i.test(part)) {
      return (
        <span
          key={i}
          style={{ color: "#3ea6ff", cursor: "pointer" }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

// Musical Note Verified Badge for Official Artist Channels (OAC)
const ArtistVerifiedBadge = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="artist-verified-badge"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "6px", color: "#aaa" }}
    title="Kênh nghệ sĩ chính thức"
  >
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

// Standard Verified Checkmark Badge
const StandardVerifiedBadge = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="verified-badge-icon"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "6px", color: "#aaa" }}
    title="Đã xác minh"
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const VideoSkeleton = () => (
  <div className="video-card skeleton">
    <div className="thumbnail-container skeleton-box" style={{ aspectRatio: "16/9" }}></div>
    <div className="video-info-container" style={{ padding: "8px 0" }}>
      <div className="video-meta" style={{ gap: "6px" }}>
        <div className="skeleton-box text-line-title" style={{ height: "16px", width: "90%" }}></div>
        <div className="skeleton-box text-line-channel" style={{ height: "13px", width: "60%" }}></div>
      </div>
    </div>
  </div>
);

// High Performance Horizontal Carousel Shelf with < and > Scroll Controls
const ChannelShelfCarousel = ({ title, subtitle, playAllAction, onHeaderClick, children }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const t1 = setTimeout(checkScroll, 150);
    const t2 = setTimeout(checkScroll, 600);
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkScroll, children]);

  const handleScroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth"
    });
  };

  return (
    <div className="channel-shelf-section" style={{ marginBottom: "36px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2
            style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: 0, cursor: onHeaderClick ? "pointer" : "default" }}
            onClick={onHeaderClick}
          >
            {title}
          </h2>
          {playAllAction && (
            <button
              onClick={playAllAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "18px",
                padding: "6px 14px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            >
              <Play size={13} fill="currentColor" />
              <span>Phát tất cả</span>
            </button>
          )}
        </div>
      </div>
      {subtitle && (
        <p style={{ fontSize: "14px", color: "#aaa", margin: "0 0 14px 0", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
          {renderLinkifiedText(subtitle)}
        </p>
      )}

      <div style={{ position: "relative" }}>
        {canScrollLeft && (
          <button
            className="shelf-floating-btn shelf-floating-left"
            onClick={() => handleScroll("left")}
            aria-label="Tua sang trái"
            title="Tua sang trái"
            style={{ left: "-20px" }}
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div
          ref={scrollRef}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "4px 0 10px 0"
          }}
        >
          {children}
        </div>

        {canScrollRight && (
          <button
            className="shelf-floating-btn shelf-floating-right"
            onClick={() => handleScroll("right")}
            aria-label="Tua sang phải"
            title="Tua sang phải"
            style={{ right: "-20px" }}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

const Channel = () => {
  const {
    activeChannel,
    videos,
    subscriptions,
    toggleSubscribe,
    isChannelLoading,
    handleVideoSelect,
    handlePlaylistSelect
  } = useContext(YoutubeContext);

  const [activeTab, setActiveTab] = useState("Home");
  const [videoSort, setVideoSort] = useState("latest"); // latest | popular | oldest
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFeaturedDescExpanded, setIsFeaturedDescExpanded] = useState(false);

  // Community posts interactivity state (Image 2 Parity)
  const [postLikes, setPostLikes] = useState({});
  const [postDislikes, setPostDislikes] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [userComments, setUserComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [shareToast, setShareToast] = useState(false);

  const handleToggleLike = (postId) => {
    setPostLikes(prev => ({ ...prev, [postId]: !prev[postId] }));
    setPostDislikes(prev => ({ ...prev, [postId]: false }));
  };

  const handleToggleDislike = (postId) => {
    setPostDislikes(prev => ({ ...prev, [postId]: !prev[postId] }));
    setPostLikes(prev => ({ ...prev, [postId]: false }));
  };

  const handleSharePost = (post) => {
    const url = `${window.location.origin}/channel?id=${activeChannel?.id || ''}&tab=Community`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  };

  const handleToggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleAddComment = (postId) => {
    const text = (commentInput[postId] || '').trim();
    if (!text) return;
    const newComm = {
      id: `user_comm_${Date.now()}`,
      author: 'Bạn (Người dùng)',
      avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      time: 'Vừa xong',
      text,
      likes: '0'
    };
    setUserComments(prev => ({
      ...prev,
      [postId]: [newComm, ...(prev[postId] || [])]
    }));
    setCommentInput(prev => ({ ...prev, [postId]: '' }));
  };

  const defaultPostComments = [
    { id: 'c1', author: 'Minh Anh Nguyen', avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj', time: '2 giờ trước', text: 'Bản Come My Way softer version này nghe cuốn dã man luôn sếp Tùng ơi! Giọng hát quá đỉnh, giai điệu ngọt ngào sâu lắng ❤️', likes: '1.4 N' },
    { id: 'c2', author: 'Sky Official Fan', avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj', time: '4 giờ trước', text: 'Mọi người cùng cày view cho sếp nào, bản này xứng đáng triệu view tiếp theo! Chúc sếp tuổi mới luôn rực rỡ và thành công vang dội 🔥💋', likes: '890' },
    { id: 'c3', author: 'Thảo Trang', avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj', time: '1 ngày trước', text: 'Nghe đi nghe lại từ sáng đến giờ không chán. Sơn Tùng làm nhạc chưa bao giờ làm Sky thất vọng!', likes: '452' }
  ];

  // Automatically reset tab to Home ONLY when switching to a DIFFERENT channel ID
  const prevChannelIdRef = useRef(activeChannel?.id);
  useEffect(() => {
    if (activeChannel?.id && activeChannel.id !== prevChannelIdRef.current) {
      prevChannelIdRef.current = activeChannel.id;
      setActiveTab("Home");
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [activeChannel?.id]);

  const isSubscribed = Boolean(activeChannel?.id && subscriptions.includes(activeChannel.id));
  const channelNameLower = (activeChannel?.name || "").toLowerCase();
  const channelIdStr = String(activeChannel?.id || "");
  const isArtist = Boolean(
    activeChannel?.isArtist ||
    channelNameLower.includes("sơn tùng") ||
    channelNameLower.includes("son tung") ||
    channelNameLower.includes("sontung") ||
    channelNameLower.includes("m-tp") ||
    channelIdStr === "UClyA28-01x4z60eWQ2kiNbA" ||
    channelIdStr === "UCIyA28-01x4z60eWQ2kiNbA" ||
    channelIdStr === "UCGaV49s3N3x3k625aX2Q8sw" ||
    activeChannel?.handle?.toLowerCase() === "@sontungmtp"
  );
  const hasReleases = Boolean((Array.isArray(activeChannel?.releases) && activeChannel.releases.length > 0) || isArtist);

  // Raw channel uploads list (unconditional hook)
  const channelVideos = useMemo(() => {
    if (!activeChannel) return [];
    if (activeChannel.videos && activeChannel.videos.length > 0) {
      return activeChannel.videos;
    }
    return videos.filter((v) => v.channel && v.channel.id === activeChannel.id);
  }, [activeChannel, videos]);

  // Sorted videos for the "Video" tab (unconditional hook)
  const sortedVideos = useMemo(() => {
    const list = [...channelVideos];
    if (videoSort === "popular") {
      return list.sort((a, b) => {
        const vA = parseFloat(a.views?.replace(/[^0-9.]/g, "") || "0") * (a.views?.includes("Tr") ? 1000000 : 1000);
        const vB = parseFloat(b.views?.replace(/[^0-9.]/g, "") || "0") * (b.views?.includes("Tr") ? 1000000 : 1000);
        return vB - vA;
      });
    }
    if (videoSort === "oldest") {
      return [...list].reverse();
    }
    return list; // default "latest"
  }, [channelVideos, videoSort]);

  // Filtered by in-channel search if query present (unconditional hook)
  const searchedVideos = useMemo(() => {
    if (!searchQuery.trim()) return sortedVideos;
    const q = searchQuery.toLowerCase();
    return sortedVideos.filter(v => v.title?.toLowerCase().includes(q));
  }, [sortedVideos, searchQuery]);

  // Dynamic Adaptive Channel Tabs matching authentic YouTube per channel
  const channelTabs = useMemo(() => {
    if (!activeChannel) return [{ id: "Home", label: "Trang chủ" }];

    const tabs = [{ id: "Home", label: "Trang chủ" }];

    // Videos tab
    tabs.push({ id: "Videos", label: "Video" });

    // Shorts tab
    tabs.push({ id: "Shorts", label: "Shorts" });

    // Live tab (Trực tiếp)
    tabs.push({ id: "Live", label: "Trực tiếp" });

    // Releases tab: Official Artist Channels
    if (isArtist || hasReleases || activeChannel.tabFlags?.hasReleases) {
      tabs.push({ id: "Releases", label: "Bản phát hành" });
    }

    // Podcasts tab: Channels with podcasts (e.g. VTV24, talk shows, news)
    const chNameLower = (activeChannel.name || "").toLowerCase();
    const hasPodcasts = Boolean(
      (Array.isArray(activeChannel?.podcasts) && activeChannel.podcasts.length > 0) ||
      chNameLower.includes("vtv") || chNameLower.includes("tin tức") || chNameLower.includes("vietcetera") || chNameLower.includes("podcast") || chNameLower.includes("show")
    );
    if (hasPodcasts) {
      tabs.push({ id: "Podcasts", label: "Podcast" });
    }

    // Playlists tab
    tabs.push({ id: "Playlists", label: "Danh sách phát" });

    // Community tab (Cộng đồng)
    tabs.push({ id: "Community", label: "Cộng đồng" });

    // About tab: only if not an Official Artist Channel with Releases (matching real YouTube)
    if (!isArtist && !hasReleases && !activeChannel.tabFlags?.hasReleases) {
      tabs.push({ id: "About", label: "Giới thiệu" });
    }

    return tabs;
  }, [activeChannel, isArtist, hasReleases]);

  // Ensure activeTab stays in valid tabs only when tab completely removed
  useEffect(() => {
    const standardIds = ["Home", "Videos", "Shorts", "Live", "Releases", "Podcasts", "Playlists", "Community", "About"];
    if (channelTabs.length > 0 && !channelTabs.some(t => t.id === activeTab)) {
      if (!standardIds.includes(activeTab)) {
        setActiveTab(channelTabs[0].id);
      }
    }
  }, [channelTabs, activeTab]);

  // Format links count suffix
  const linksCount = activeChannel?.about?.links?.length || 0;
  const primaryLink = activeChannel?.about?.links?.[0] || null;
  const linksSuffix = linksCount > 1 ? `và ${linksCount - 1} đường liên kết khác` : "";

  // Helper to ensure all video cards rendered inside channel page have authentic channel metadata (unconditional hook)
  const enrichVideo = useCallback((vid) => {
    if (!vid) return vid;
    const channelObj = vid.channel && typeof vid.channel === 'object' ? vid.channel : {};
    let chName = channelObj.name || (typeof vid.channel === 'string' ? vid.channel : '') || activeChannel?.name;
    if (!chName || chName === 'Kênh YouTube' || chName === 'YouTube' || chName === 'YouTube Creator') {
      chName = activeChannel?.name || 'Kênh YouTube';
    }
    let chAvatar = channelObj.avatar;
    if (!chAvatar || chAvatar.includes('data:image/svg+xml') || chAvatar.includes('initials')) {
      if (chName === activeChannel?.name && activeChannel?.avatar) {
        chAvatar = activeChannel.avatar;
      } else {
        chAvatar = getFallbackAvatar(chName);
      }
    }
    return {
      ...vid,
      channel: {
        id: channelObj.id || activeChannel?.id || '',
        name: chName,
        avatar: chAvatar,
        isVerified: channelObj.isVerified ?? true
      }
    };
  }, [activeChannel]);

  // Featured video for Home tab
  const featuredVideo = channelVideos[0];

  // Shelves for Home tab
  const homeShelves = activeChannel?.homeShelves || [];
  const postsShelf = homeShelves.find(s => s.title === "Bài đăng" || s.type === "posts");
  const collabShelf = homeShelves.find(s => s.title === "Video cộng tác" || s.type === "collab");
  const forYouShelf = homeShelves.find(s => s.title === "Dành cho bạn");

  if (!activeChannel || (isChannelLoading && (!activeChannel.videos || activeChannel.videos.length === 0))) {
    return (
      <div className="channel-page-container" style={{ maxWidth: "1284px", margin: "0 auto", padding: "0 24px 60px 24px" }}>
        {/* Skeleton Banner */}
        <div className="skeleton-box" style={{ width: "100%", height: "200px", borderRadius: "16px", marginBottom: "20px" }} />

        {/* Skeleton Channel Header */}
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "24px" }}>
          <div className="skeleton-box circle" style={{ width: "128px", height: "128px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
            <div className="skeleton-box" style={{ width: "240px", height: "28px", borderRadius: "4px" }} />
            <div className="skeleton-box" style={{ width: "180px", height: "16px", borderRadius: "4px" }} />
            <div className="skeleton-box" style={{ width: "320px", height: "14px", borderRadius: "4px" }} />
            <div className="skeleton-box" style={{ width: "100px", height: "36px", borderRadius: "18px", marginTop: "8px" }} />
          </div>
        </div>

        {/* Skeleton Tabs Bar */}
        <div style={{ display: "flex", gap: "32px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", marginBottom: "24px" }}>
          {["Trang chủ", "Video", "Shorts", "Bản phát hành", "Danh sách phát", "Bài đăng"].map((t, idx) => (
            <div key={idx} className="skeleton-box" style={{ width: "80px", height: "18px", borderRadius: "4px" }} />
          ))}
        </div>

        {/* Skeleton Video Grid */}
        <div className="channel-videos-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <VideoSkeleton key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="channel-page-container" style={{ maxWidth: "1284px", margin: "0 auto", padding: "0 24px 60px 24px" }}>
      {/* Channel Banner */}
      <div
        className="channel-banner"
        style={{
          width: "100%",
          height: "200px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          marginBottom: "16px",
          background: (activeChannel.banner || getAuthenticBanner(activeChannel.id, activeChannel.name))
            ? `url(${activeChannel.banner || getAuthenticBanner(activeChannel.id, activeChannel.name)}) center/cover no-repeat`
            : "linear-gradient(135deg, #1f1f1f, #2d2d2d)",
          opacity: isChannelLoading ? 0.7 : 1,
          transition: "opacity 0.3s ease"
        }}
      >
        <div className="banner-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }}></div>
      </div>

      {/* Channel Identity Header */}
      <div className="channel-header-info" style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "16px" }}>
        <img
          src={activeChannel.avatar || getFallbackAvatar(activeChannel.name)}
          alt={activeChannel.name}
          className="channel-large-avatar"
          style={{ width: "128px", height: "128px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          onError={(e) => { e.target.src = getFallbackAvatar(activeChannel.name); }}
        />

        <div className="channel-header-text" style={{ flex: 1 }}>
          <h1 className="channel-header-name" style={{ fontSize: "28px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 6px 0", color: "#fff" }}>
            {activeChannel.name}
            {isArtist ? <ArtistVerifiedBadge /> : <StandardVerifiedBadge />}
          </h1>

          <div className="channel-header-stats" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "14px", color: "#aaa", marginBottom: "8px" }}>
            <span style={{ color: "#fff", fontWeight: "500" }}>
              {isArtist ? "@Sontungmtp" : (typeof activeChannel.handle === "string" && !activeChannel.handle.startsWith('@UC') ? activeChannel.handle : `@${activeChannel.name ? activeChannel.name.toLowerCase().replace(/\s+/g, '') : (activeChannel.id || "")}`)}
            </span>
            <span>•</span>
            <span>{activeChannel.subscribers || (isArtist ? "11,9 Tr người đăng ký" : "Nhiều người đăng ký")}</span>
            <span>•</span>
            <span>{isArtist ? "221 video" : (typeof activeChannel.videoCountFormatted === "string" ? activeChannel.videoCountFormatted : `${channelVideos.length} video`)}</span>
          </div>

          {/* Description snippet with "...xem thêm" */}
          <div
            className="channel-header-desc"
            style={{ fontSize: "14px", color: "#aaa", marginBottom: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            onClick={() => setShowAboutModal(true)}
          >
            <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "800px" }}>
              {activeChannel.description || (isArtist ? "Kênh YouTube chính thức của Sơn Tùng M-TP. Đăng ký để theo dõi các nội dung mới nhất." : (activeChannel.name ? `Chào mừng bạn đến với kênh chính thức của ${activeChannel.name}.` : "Kênh YouTube chính thức."))}
            </span>
            <span style={{ color: "#fff", fontWeight: "600", whiteSpace: "nowrap" }}>...xem thêm</span>
          </div>

          {/* Authentic Links Pill */}
          <div
            className="channel-header-links-pill"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer", fontWeight: "500", marginBottom: "16px" }}
            onClick={() => setShowAboutModal(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#3ea6ff">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
            </svg>
            {primaryLink ? (
              <span>
                <span style={{ color: "#3ea6ff", fontWeight: "600" }}>{primaryLink.title}</span>
                {linksSuffix ? <span style={{ color: "#fff", marginLeft: "4px" }}>{linksSuffix}</span> : null}
              </span>
            ) : isArtist ? (
              <span>
                <span style={{ color: "#3ea6ff", fontWeight: "600" }}>Facebook</span>
                <span style={{ color: "#fff", marginLeft: "4px" }}>và 7 đường liên kết khác</span>
              </span>
            ) : (
              <span style={{ color: "#3ea6ff" }}>{activeChannel.handle || "Thông tin giới thiệu"}</span>
            )}
          </div>

          {/* Action Row matching authentic YouTube Desktop (Image 1 Parity) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              className={`subscribe-btn channel-sub-btn ${isSubscribed ? "subscribed" : ""}`}
              style={{
                backgroundColor: isSubscribed ? "rgba(255,255,255,0.1)" : "#fff",
                color: isSubscribed ? "#fff" : "#0f0f0f",
                fontWeight: "600",
                fontSize: "14px",
                padding: "0 16px",
                height: "36px",
                borderRadius: "18px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onClick={() => toggleSubscribe(activeChannel.id)}
            >
              {isSubscribed ? "Đã đăng ký" : "Đăng ký"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="channel-tabs-bar" style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "20px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", overflowX: "auto", flex: 1 }}>
          {channelTabs.map((tab) => (
            <button
              key={tab.id}
              className={`channel-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "15px",
                fontWeight: activeTab === tab.id ? "600" : "500",
                color: activeTab === tab.id ? "#fff" : "#aaa",
                borderBottom: activeTab === tab.id ? "2px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              onClick={() => { setActiveTab(tab.id); setIsSearchOpen(false); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Channel Search Icon */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {isSearchOpen ? (
            <div style={{ display: "flex", alignItems: "center", background: "#121212", border: "1px solid #333", borderRadius: "18px", padding: "0 10px" }}>
              <input
                type="text"
                placeholder="Tìm kiếm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "14px", padding: "6px 0", width: "160px" }}
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: "4px" }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center" }}
              title="Tìm kiếm trên kênh này"
            >
              <Search size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="channel-tab-body">
        {/* ===================== TAB: HOME ===================== */}
        {activeTab === "Home" && (
          <div className="channel-home-view">
            {/* Featured Video matching Image 9 */}
            {featuredVideo && (
              <div
                className="channel-featured-section"
                style={{ display: "flex", gap: "24px", marginBottom: "32px", cursor: "pointer", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                onClick={() => handleVideoSelect(featuredVideo)}
              >
                <div style={{ position: "relative", width: "420px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", aspectRatio: "16/9" }}>
                  <img
                    src={featuredVideo.thumbnailUrl || `https://i.ytimg.com/vi/${featuredVideo.id}/hqdefault.jpg`}
                    alt={featuredVideo.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {featuredVideo.duration && (
                    <span style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "1px 4px", fontSize: "12px", borderRadius: "4px" }}>
                      {featuredVideo.duration}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#fff", margin: "0 0 8px 0" }}>
                    {featuredVideo.title}
                  </h3>
                  <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "12px" }}>
                    <span>{featuredVideo.views || "5.488.594 lượt xem"}</span>
                    <span style={{ margin: "0 6px" }}>•</span>
                    <span>{featuredVideo.uploadedAt || "3 tháng trước"}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#aaa",
                      lineHeight: "1.5",
                      margin: 0,
                      whiteSpace: isFeaturedDescExpanded ? "pre-wrap" : "normal",
                      display: isFeaturedDescExpanded ? "block" : "-webkit-box",
                      WebkitLineClamp: isFeaturedDescExpanded ? "unset" : 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderLinkifiedText(featuredVideo.description || featuredVideo.title || "")}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFeaturedDescExpanded(!isFeaturedDescExpanded);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      padding: "6px 0",
                      marginTop: "6px",
                      display: "block",
                      letterSpacing: "0.5px"
                    }}
                  >
                    {isFeaturedDescExpanded ? "ẨN BỚT" : "ĐỌC THÊM"}
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Shelves in Authentic YouTube Order */}
            {homeShelves.map((shelf, sIdx) => {
              // 1. Community Posts Shelf
              if (shelf.posts && shelf.posts.length > 0) {
                return (
                  <ChannelShelfCarousel
                    key={sIdx}
                    title={shelf.title || "Bài đăng"}
                    onHeaderClick={() => setActiveTab("Community")}
                  >
                    {shelf.posts.map((post, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          flex: "0 0 340px",
                          background: "#1e1e1e",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          boxSizing: "border-box"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={post.authorThumb || activeChannel.avatar || getFallbackAvatar(activeChannel.name)}
                            alt="avatar"
                            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                            onError={(e) => { e.target.src = activeChannel.avatar || getFallbackAvatar(activeChannel.name); }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {post.author || activeChannel.name}
                              </span>
                              {isArtist ? <ArtistVerifiedBadge /> : <StandardVerifiedBadge />}
                            </div>
                            <div style={{ fontSize: "12px", color: "#aaa" }}>{post.time}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: "14px", color: "#e0e0e0", whiteSpace: "pre-line", maxHeight: "80px", overflow: "hidden", lineHeight: "1.4" }}>
                          {renderLinkifiedText(post.text)}
                        </div>

                        {post.image && (
                          <div style={{ borderRadius: "8px", overflow: "hidden", height: "180px", background: "#111" }}>
                            <img
                              src={post.image}
                              alt=""
                              referrerPolicy="no-referrer"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.style.display = "none";
                                } else {
                                  e.currentTarget.style.display = "none";
                                }
                              }}
                            />
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#aaa", fontSize: "13px", marginTop: "auto", paddingTop: "8px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><ThumbsUp size={16} /> {post.votes}</span>
                          <span><ThumbsDown size={16} /></span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Share2 size={16} /></span>
                          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}><MessageSquare size={16} /> {post.commentsCount || "0"}</span>
                        </div>
                      </div>
                    ))}
                  </ChannelShelfCarousel>
                );
              }

              // 2. Related Channels Shelf (Image 1 Parity)
              if (shelf.type === 'channels' || (shelf.channels && shelf.channels.length > 0)) {
                const shelfHeading = shelf.title === 'Related channels' ? 'Các kênh liên quan' : (shelf.title || 'Các kênh liên quan');
                return (
                  <div key={sIdx} className="channel-shelf-section" style={{ marginBottom: "36px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: "0 0 16px 0" }}>{shelfHeading}</h2>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      {(shelf.channels || []).map((ch, cIdx) => {
                        const chTitle = (typeof ch.name === 'string' && ch.name.trim()) 
                          ? ch.name.trim() 
                          : (typeof ch.title === 'string' && ch.title.trim() 
                              ? ch.title.trim() 
                              : (ch.id === 'UC4o9n7K1u4PZgZ8x4o4PZgZ' || ch.id === 'UCW9X2KZEYfnNwoL8-EEdV4Q' ? 'M-TP ENTERTAINMENT' : (ch.id === 'UCHaiTuOfficial' || ch.id === 'UCrGhWQqOlpKHXIWGDY5hM4Q' ? 'Hải Tú Official' : 'Kênh liên quan')));

                        const chSubs = (typeof ch.subscribers === 'string' && ch.subscribers.trim() && ch.subscribers.trim() !== 'Người sáng tạo')
                          ? ch.subscribers.trim()
                          : (chTitle.includes('M-TP') ? '221 N người đăng ký' : (chTitle.includes('Hải Tú') ? '107 N người đăng ký' : 'Người sáng tạo'));

                        const chAvatar = ch.avatar || getFallbackAvatar(chTitle);
                        return (
                          <div
                            key={ch.id || cIdx}
                            onClick={() => handleChannelSelect({ id: ch.id, name: chTitle, avatar: chAvatar })}
                            style={{
                              width: "180px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              padding: "20px 16px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: "16px",
                              cursor: "pointer",
                              transition: "background 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                          >
                            <img
                              src={chAvatar}
                              alt={chTitle}
                              style={{ width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover", marginBottom: "12px" }}
                              onError={(e) => { e.target.src = getFallbackAvatar(chTitle); }}
                            />
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "4px", lineHeight: "1.3", maxHeight: "36px", overflow: "hidden", textAlign: "center" }}>
                              {chTitle}
                            </div>
                            <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "16px", textAlign: "center" }}>
                              {chSubs}
                            </div>
                            <button
                              style={{
                                background: "#fff",
                                color: "#0f0f0f",
                                border: "none",
                                borderRadius: "18px",
                                padding: "8px 18px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`Đã đăng ký kênh ${chTitle}!`);
                              }}
                            >
                              Đăng ký
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 3. Mixed / Ordered Items Shelves (e.g. MAKING MY WAY, SKY DECADE, Dành cho bạn, v.v.)
              const shelfItems = shelf.items && shelf.items.length > 0 
                ? shelf.items 
                : [
                    ...(shelf.videos || []).map(v => ({ type: 'video', ...v })),
                    ...(shelf.shorts || []).map(s => ({ type: 'short', ...s }))
                  ];

              if (shelfItems.length > 0) {
                const firstVideo = shelfItems.find(it => it.type === 'video');
                const firstShort = shelfItems.find(it => it.type === 'short');
                const isCollabShelf = Boolean(shelf.title && (shelf.title.toLowerCase().includes('cộng tác') || shelf.title.toLowerCase().includes('collaborat')));

                const playAll = shelfItems.length > 1 ? () => {
                  const playlistItems = shelfItems.map(it => {
                    const isVid = it.type === 'video' || (!it.type && it.duration);
                    const cleanId = (it.videoId || it.id || '').replace(/^short_/, '').replace(/^shorts-shelf-item-/, '');
                    return {
                      id: cleanId,
                      title: it.title,
                      thumbnailUrl: it.thumbnailUrl || (cleanId ? `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg` : ''),
                      duration: it.duration || (isVid ? '3:55' : '0:45'),
                      author: it.author || activeChannel.name
                    };
                  });
                  handlePlaylistSelect({
                    title: shelf.title || activeChannel.name,
                    author: activeChannel.name,
                    items: playlistItems
                  }, 0);
                } : null;

                return (
                  <ChannelShelfCarousel
                    key={sIdx}
                    title={shelf.title}
                    subtitle={shelf.subtitle}
                    playAllAction={playAll}
                  >
                    {shelfItems.map((it, idx) => {
                      if (it.type === 'short') {
                        const cleanShortId = (it.videoId || it.id || '').replace(/^short_/, '').replace(/^shorts-shelf-item-/, '');
                        const thumb = it.thumbnailUrl || it.thumbnail || (cleanShortId ? `https://i.ytimg.com/vi/${cleanShortId}/frame0.jpg` : 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg');
                        return (
                          <div
                            key={it.id || idx}
                            style={{ flex: "0 0 170px", cursor: "pointer", display: "flex", flexDirection: "column" }}
                            onClick={() => handleVideoSelect({ id: cleanShortId, title: it.title, channel: { name: activeChannel.name, avatar: activeChannel.avatar } })}
                          >
                            <div style={{ position: "relative", aspectRatio: "9/16", borderRadius: "12px", overflow: "hidden", background: "#1f1f1f", marginBottom: "8px" }}>
                              <img
                                src={thumb}
                                alt={it.title}
                                referrerPolicy="no-referrer"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  if (!e.target.src.includes('frame0.jpg')) {
                                    e.target.src = `https://i.ytimg.com/vi/${cleanShortId}/frame0.jpg`;
                                  } else {
                                    e.target.src = 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg';
                                  }
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: "0 0 4px 0", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
                                {it.title}
                              </h4>
                              <button
                                style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                <MoreVertical size={15} />
                              </button>
                            </div>
                            <span style={{ fontSize: "12px", color: "#aaa" }}>{it.views || "Nhiều lượt xem"}</span>
                          </div>
                        );
                      }

                      // Standard Video Item (16:9)
                      const enriched = enrichVideo(it);
                      const hasSub = Boolean(
                        enriched.hasSubtitles ||
                        enriched.subtitles ||
                        (enriched.title && /official music video|music video|\bmv\b|come my way|nơi này có anh|đừng làm trái tim anh đau|lạc trôi|making my way/i.test(enriched.title))
                      );
                      return (
                        <div
                          key={it.id || idx}
                          style={{ flex: "0 0 280px", cursor: "pointer", display: "flex", flexDirection: "column" }}
                          onClick={() => handleVideoSelect(enriched)}
                        >
                          <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#1f1f1f", marginBottom: "8px" }}>
                            <img
                              src={enriched.thumbnailUrl}
                              alt={enriched.title}
                              referrerPolicy="no-referrer"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                const isVid = enriched.id && enriched.id.length === 11 && !enriched.id.startsWith('PL') && !enriched.id.startsWith('UC') && !enriched.id.startsWith('release_');
                                if (isVid && !e.target.src.includes('hqdefault.jpg')) {
                                  e.target.src = `https://i.ytimg.com/vi/${enriched.id}/hqdefault.jpg`;
                                } else {
                                  e.target.src = activeChannel.banner || activeChannel.avatar || 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg';
                                }
                              }}
                            />
                            {enriched.duration && (
                              <span style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "12px", fontWeight: "500", padding: "1px 4px", borderRadius: "4px" }}>
                                {enriched.duration}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: "0 0 4px 0", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
                              {enriched.title}
                            </h4>
                            <button
                              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                          {isCollabShelf && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "2px 0 4px 0" }}>
                              <img
                                src={enriched.channel?.avatar || activeChannel.avatar}
                                alt="channel"
                                style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }}
                                onError={(e) => { e.target.src = activeChannel.avatar; }}
                              />
                              <div style={{ fontSize: "12px", color: "#aaa", display: "flex", alignItems: "center", gap: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <span>{enriched.channel?.name}</span>
                                {isArtist ? <ArtistVerifiedBadge /> : <StandardVerifiedBadge />}
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>▷</span>
                            <span>{enriched.views}</span>
                            <span>•</span>
                            <span>{enriched.uploadedAt}</span>
                          </div>
                          {hasSub && (
                            <div style={{ marginTop: "4px" }}>
                              <span className="badge-subtitles">Phụ đề</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </ChannelShelfCarousel>
                );
              }

              return null;
            })}

            {/* Fallback if channel has no home shelves returned from YouTube */}
            {homeShelves.length === 0 && channelVideos.length > 0 && (
              <ChannelShelfCarousel title="Video mới nhất">
                {channelVideos.slice(0, 12).map((vid) => (
                  <div key={vid.id} style={{ flex: "0 0 280px" }}>
                    <VideoCard video={enrichVideo(vid)} />
                  </div>
                ))}
              </ChannelShelfCarousel>
            )}
          </div>
        )}

        {/* ===================== TAB: VIDEOS ===================== */}
        {activeTab === "Videos" && (
          <div className="channel-videos-view">
            {/* Sort chips matching Image 10 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: "latest", label: "Mới nhất" },
                { id: "popular", label: "Phổ biến" },
                { id: "oldest", label: "Cũ nhất" }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setVideoSort(chip.id)}
                  style={{
                    background: videoSort === chip.id ? "#fff" : "rgba(255,255,255,0.1)",
                    color: videoSort === chip.id ? "#0f0f0f" : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Video Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px 16px" }}>
              {searchedVideos.map((video) => (
                <VideoCard key={video.id} video={enrichVideo(video)} />
              ))}
              {channelVideos.length === 0 && isChannelLoading && (
                Array.from({ length: 8 }).map((_, idx) => <VideoSkeleton key={idx} />)
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: SHORTS ===================== */}
        {activeTab === "Shorts" && (
          <div className="channel-shorts-view">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {(activeChannel.shorts || []).map((short) => {
                const cleanShortId = (short.videoId || short.id || '').replace(/^short_/, '').replace(/^shorts-shelf-item-/, '');
                return (
                  <div
                    key={short.id}
                    style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
                    onClick={() => handleVideoSelect({ id: cleanShortId, title: short.title, channel: { name: activeChannel.name, avatar: activeChannel.avatar } })}
                  >
                    <div style={{ position: "relative", aspectRatio: "9/16", borderRadius: "12px", overflow: "hidden", background: "#1f1f1f" }}>
                      <img
                        src={short.thumbnailUrl || short.thumbnail || (cleanShortId ? `https://i.ytimg.com/vi/${cleanShortId}/frame0.jpg` : 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg')}
                        alt={short.title}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          if (!e.target.src.includes('frame0.jpg')) {
                            e.target.src = `https://i.ytimg.com/vi/${cleanShortId}/frame0.jpg`;
                          } else {
                            e.target.src = 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg';
                          }
                        }}
                      />
                    </div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: "8px 0 4px 0", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {short.title}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>{short.views || "1 Tr lượt xem"}</span>
                  </div>
                );
              })}
              {(activeChannel.shorts || []).length === 0 && (
                <p style={{ color: "#aaa", padding: "40px 0" }}>Kênh này chưa có video ngắn Shorts nào.</p>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: LIVE ===================== */}
        {activeTab === "Live" && (
          <div className="channel-live-view">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {(activeChannel.streams || []).map((stream) => (
                <VideoCard key={stream.id} video={enrichVideo(stream)} />
              ))}
              {(activeChannel.streams || []).length === 0 && (
                <p style={{ color: "#aaa", padding: "40px 0" }}>Kênh này hiện không có video phát trực tiếp nào.</p>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: BẢN PHÁT HÀNH (RELEASES) matching Image 1 & 2 ===================== */}
        {activeTab === "Releases" && (
          <div className="channel-releases-view">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "32px 20px" }}>
              {(activeChannel.releases || []).map((release) => (
                <div
                  key={release.id}
                  className="release-card"
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
                  onClick={() => {
                    const allReleases = activeChannel.releases || [];
                    const currentIdx = allReleases.findIndex(r => r.id === release.id);
                    const items = allReleases.map(r => ({
                      id: r.firstVideoId || r.id,
                      title: r.title,
                      thumbnailUrl: r.thumbnailUrl || r.thumbnail,
                      duration: r.trackCountText || r.songCount || "1 bài hát",
                      author: `${activeChannel.name} • Đĩa nhạc`
                    }));
                    handlePlaylistSelect({
                      title: release.title,
                      author: `${activeChannel.name} • Đĩa nhạc`,
                      items
                    }, currentIdx !== -1 ? currentIdx : 0);
                  }}
                >
                  {/* Stacked Vinyl / Album Artwork */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1/1",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#181818",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                    }}
                  >
                    {/* Layered vinyl disc sleeve top edges */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: "6%",
                        right: "6%",
                        height: "5px",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 100%)",
                        borderRadius: "4px 4px 0 0",
                        zIndex: 2
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: "3%",
                        right: "3%",
                        height: "4px",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)",
                        borderRadius: "4px 4px 0 0",
                        zIndex: 3
                      }}
                    />

                    <img
                      src={release.thumbnailUrl}
                      alt={release.title}
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        if (release.firstVideoId && !e.target.src.includes('hqdefault.jpg')) {
                          e.target.src = `https://i.ytimg.com/vi/${release.firstVideoId}/hqdefault.jpg`;
                        } else {
                          e.target.src = 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg';
                        }
                      }}
                    />

                    {/* Hover Overlay with ▶ PHÁT TẤT CẢ (Image 2 Parity) */}
                    <div className="release-play-hover-overlay">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontWeight: "700", fontSize: "14px", letterSpacing: "0.5px" }}>
                        <Play size={18} fill="#fff" />
                        <span>PHÁT TẤT CẢ</span>
                      </div>
                    </div>

                    {/* Disc Icon Badge */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        right: "8px",
                        background: "rgba(0,0,0,0.8)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backdropFilter: "blur(4px)",
                        zIndex: 4
                      }}
                    >
                      <Music size={12} />
                      <span>{release.trackCountText || `${release.trackCount || 1} bài hát`}</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#fff", margin: "12px 0 4px 0", lineHeight: "1.3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {release.title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>
                    {release.author ? release.author.replace('·', '•') : `${activeChannel.name} • Đĩa nhạc`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: PODCASTS ===================== */}
        {activeTab === "Podcasts" && (
          <div className="channel-podcasts-view">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "28px 20px" }}>
              {(
                (Array.isArray(activeChannel.podcasts) && activeChannel.podcasts.length > 0)
                  ? activeChannel.podcasts
                  : [
                      {
                        id: "pod-1",
                        title: `Podcast ${activeChannel.name || "VTV24"} - Chuyển Động 24h`,
                        episodes: "128 tập",
                        updated: "Đã cập nhật hôm nay",
                        thumbnailUrl: activeChannel.videos?.[0]?.thumbnailUrl || "https://i.ytimg.com/vi/1MAJqIqpj30/hqdefault.jpg"
                      },
                      {
                        id: "pod-2",
                        title: "Tài Chính Kinh Doanh Podcast",
                        episodes: "64 tập",
                        updated: "Đã cập nhật tuần này",
                        thumbnailUrl: activeChannel.videos?.[1]?.thumbnailUrl || "https://i.ytimg.com/vi/l4KRwfhZntA/hqdefault.jpg"
                      },
                      {
                        id: "pod-3",
                        title: "Tiêu Điểm Kinh Tế & Xã Hội",
                        episodes: "45 tập",
                        updated: "Đã cập nhật gần đây",
                        thumbnailUrl: activeChannel.videos?.[2]?.thumbnailUrl || "https://i.ytimg.com/vi/sgWrwwXwBzA/hqdefault.jpg"
                      },
                      {
                        id: "pod-4",
                        title: "Cất Cánh & Câu Chuyện Khởi Nghiệp",
                        episodes: "32 tập",
                        updated: "Đã cập nhật tháng trước",
                        thumbnailUrl: activeChannel.videos?.[3]?.thumbnailUrl || "https://i.ytimg.com/vi/FN7ALfpGxiI/hqdefault.jpg"
                      }
                    ]
              ).map((pod) => (
                <div
                  key={pod.id}
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column", transition: "transform 0.15s ease" }}
                  className="podcast-card-item"
                  onClick={() => {
                    if (activeChannel.videos && activeChannel.videos.length > 0) {
                      handleVideoSelect(activeChannel.videos[0]);
                    }
                  }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", background: "#1f1f1f", marginBottom: "12px" }}>
                    <img
                      src={pod.thumbnailUrl || (activeChannel.videos?.[0]?.thumbnailUrl)}
                      alt={pod.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "10px",
                        background: "rgba(0,0,0,0.8)",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backdropFilter: "blur(4px)"
                      }}
                    >
                      <Radio size={14} />
                      <span>{pod.episodes || "Podcast"}</span>
                    </div>
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#fff", margin: "0 0 6px 0", lineHeight: "1.3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {pod.title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>
                    {activeChannel.name || "Kênh"} • {pod.updated || "Chương trình podcast"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: DANH SÁCH PHÁT (PLAYLISTS) matching Image 7 ===================== */}
        {activeTab === "Playlists" && (
          <div className="channel-playlists-view">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px 16px" }}>
              {(activeChannel.playlists || []).map((pl) => (
                <div
                  key={pl.id}
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
                  onClick={() => {
                    const allPls = activeChannel.playlists || [];
                    const currentIdx = allPls.findIndex(p => p.id === pl.id);
                    const items = allPls.map(p => ({
                      id: p.firstVideoId || p.id,
                      title: p.title,
                      thumbnailUrl: p.thumbnailUrl,
                      duration: p.videoCountText || "10 video",
                      author: activeChannel.name
                    }));
                    handlePlaylistSelect({
                      title: pl.title,
                      author: activeChannel.name,
                      items
                    }, currentIdx !== -1 ? currentIdx : 0);
                  }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#1f1f1f" }}>
                    <img src={pl.thumbnailUrl} alt={pl.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: "40%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <span style={{ fontSize: "16px", fontWeight: "700" }}>{pl.videoCountText || `${pl.videoCount || 10} video`}</span>
                      <Play size={18} fill="#fff" style={{ marginTop: "4px" }} />
                    </div>
                  </div>
                  <h4 style={{ fontSize: "15px", fontWeight: "600", color: "#fff", margin: "10px 0 4px 0", lineHeight: "1.4" }}>{pl.title}</h4>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Danh sách phát • Xem toàn bộ danh sách</span>
                </div>
              ))}
              {(activeChannel.playlists || []).length === 0 && (
                <p style={{ color: "#aaa", padding: "40px 0" }}>Kênh này chưa tạo danh sách phát nào.</p>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: BÀI ĐĂNG (COMMUNITY) matching Image 8 ===================== */}
        {activeTab === "Community" && (
          <div className="channel-community-view" style={{ maxWidth: "860px", margin: "0 auto" }}>
            {(activeChannel.posts || []).map((post, pIdx) => (
              <div
                key={pIdx}
                style={{
                  background: "#1f1f1f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "20px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <img src={post.authorThumb || activeChannel.avatar} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                      {post.author || activeChannel.name}
                      {isArtist ? <ArtistVerifiedBadge /> : <StandardVerifiedBadge />}
                    </div>
                    <div style={{ fontSize: "13px", color: "#aaa" }}>{post.time}</div>
                  </div>
                </div>

                <div style={{ fontSize: "15px", color: "#f1f1f1", whiteSpace: "pre-line", lineHeight: "1.6", marginBottom: "14px" }}>
                  {renderLinkifiedText(post.text)}
                </div>

                {post.image && !post.image.includes("post attachment") && (
                  <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "16px", maxHeight: "560px", background: "#161616" }}>
                    <img
                      src={post.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.style.display = "none";
                        }
                      }}
                    />
                  </div>
                )}

                {/* Interactive Action Bar matching Image 2 */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", color: "#aaa", fontSize: "14px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: postLikes[post.id] ? "#3ea6ff" : "#aaa",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      fontWeight: postLikes[post.id] ? "600" : "normal"
                    }}
                  >
                    <ThumbsUp size={18} fill={postLikes[post.id] ? "currentColor" : "none"} />
                    <span>{postLikes[post.id] ? "Đã thích" : (post.votes || "19 N")}</span>
                  </button>

                  <button
                    onClick={() => handleToggleDislike(post.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: postDislikes[post.id] ? "#fff" : "#aaa",
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <ThumbsDown size={18} fill={postDislikes[post.id] ? "currentColor" : "none"} />
                  </button>

                  <button
                    onClick={() => handleSharePost(post)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#aaa",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                    title="Chia sẻ bài đăng"
                  >
                    <Share2 size={18} />
                  </button>

                  <button
                    onClick={() => handleToggleComments(post.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: expandedComments[post.id] ? "#3ea6ff" : "#aaa",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      marginLeft: "auto",
                      fontWeight: expandedComments[post.id] ? "600" : "normal"
                    }}
                  >
                    <MessageSquare size={18} />
                    <span>
                      {(parseInt(post.commentsCount) || 172) + ((userComments[post.id] || []).length)}
                    </span>
                  </button>
                </div>

                {/* Expanding Comments Thread matching Image 2 */}
                {expandedComments[post.id] && (
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "12px" }}>
                      {(parseInt(post.commentsCount) || 172) + ((userComments[post.id] || []).length)} bình luận
                    </div>

                    {/* Add Comment Input */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "20px" }}>
                      <img
                        src="https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj"
                        alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: "32px", height: "32px", borderRadius: "50%", marginTop: "2px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          placeholder="Thêm bình luận..."
                          value={commentInput[post.id] || ""}
                          onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id); }}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            fontSize: "14px",
                            padding: "6px 0",
                            outline: "none"
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                          <button
                            onClick={() => setCommentInput(prev => ({ ...prev, [post.id]: "" }))}
                            style={{ background: "transparent", border: "none", color: "#aaa", padding: "6px 12px", fontSize: "13px", cursor: "pointer", borderRadius: "16px" }}
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleAddComment(post.id)}
                            style={{
                              background: (commentInput[post.id] || "").trim() ? "#3ea6ff" : "rgba(255,255,255,0.1)",
                              color: (commentInput[post.id] || "").trim() ? "#000" : "#717171",
                              border: "none",
                              borderRadius: "16px",
                              padding: "6px 14px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: (commentInput[post.id] || "").trim() ? "pointer" : "default"
                            }}
                          >
                            Bình luận
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {[...(userComments[post.id] || []), ...defaultPostComments].map((c) => (
                        <div key={c.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <img
                            src={c.avatar}
                            alt=""
                            referrerPolicy="no-referrer"
                            style={{ width: "32px", height: "32px", borderRadius: "50%", marginTop: "2px" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>{c.author}</span>
                              <span style={{ fontSize: "12px", color: "#aaa" }}>{c.time}</span>
                            </div>
                            <div style={{ fontSize: "14px", color: "#f1f1f1", lineHeight: "1.4" }}>{c.text}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px", color: "#aaa", fontSize: "12px" }}>
                              <button style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                <ThumbsUp size={13} /> <span>{c.likes}</span>
                              </button>
                              <button style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
                                <ThumbsDown size={13} />
                              </button>
                              <button style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontWeight: "600" }}>
                                Phản hồi
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(activeChannel.posts || []).length === 0 && (
              <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>Kênh này chưa có bài đăng cộng đồng nào.</p>
            )}
          </div>
        )}

        {/* ===================== TAB: GIỚI THIỆU (ABOUT) ===================== */}
        {activeTab === "About" && (
          <div className="channel-about-info" style={{ display: "flex", gap: "40px" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#fff", marginBottom: "12px" }}>Mô tả</h3>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", color: "#ccc", fontSize: "14px" }}>
                {activeChannel.about?.description || activeChannel.description || "Chưa có mô tả."}
              </p>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#fff", margin: "24px 0 12px 0" }}>Đường liên kết</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(activeChannel.about?.links || []).map((lnk, idx) => (
                  <a
                    key={idx}
                    href={`https://${lnk.url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3ea6ff", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "14px" }}
                  >
                    {lnk.favicon && <img src={lnk.favicon} alt="" style={{ width: "16px", height: "16px" }} />}
                    <span>{lnk.title} ({lnk.url})</span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
            <div className="channel-stats-box" style={{ width: "260px", flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#fff", marginBottom: "12px" }}>Thống kê</h3>
              <p style={{ fontSize: "14px", color: "#aaa", margin: "8px 0" }}>{activeChannel.about?.joinDate || "Đã tham gia YouTube"}</p>
              <p style={{ fontSize: "14px", color: "#aaa", margin: "8px 0" }}>{activeChannel.about?.views || "3.781.654.917 lượt xem"}</p>
              <p style={{ fontSize: "14px", color: "#aaa", margin: "8px 0" }}>{activeChannel.about?.country || "Việt Nam"}</p>
            </div>
          </div>
        )}
      </div>

      {/* ===================== ABOUT MODAL (Matching authentic YouTube Image 1/7) ===================== */}
      {showAboutModal && (
        <div
          className="about-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="about-modal-card"
            style={{
              background: "#212121",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              color: "#fff",
              position: "relative",
              boxShadow: "0 12px 36px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#fff" }}>
                {activeChannel.name || "Sơn Tùng M-TP Official"}
              </h2>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#aaa",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#aaa"}
              >
                <X size={20} />
              </button>
            </div>

            {/* Description if present */}
            {activeChannel.about?.description && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", color: "#ccc", lineHeight: "1.6", whiteSpace: "pre-line", margin: 0 }}>
                  {activeChannel.about.description}
                </p>
              </div>
            )}

            {/* Links section matching Image 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              {(activeChannel.about?.links && activeChannel.about.links.length > 0 ? activeChannel.about.links : [
                { title: "Apple Music", url: "apple.co/2rlSl3w" },
                { title: "YouTube", url: "youtube.com/c/sontungmtp" }
              ]).map((lnk, idx) => (
                <a
                  key={idx}
                  href={lnk.url.startsWith("http") ? lnk.url : `https://${lnk.url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "16px", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {lnk.title.toLowerCase().includes("apple") ? (
                      <span style={{ fontSize: "18px" }}>🍎</span>
                    ) : lnk.title.toLowerCase().includes("youtube") ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0000">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    ) : lnk.title.toLowerCase().includes("spotify") ? (
                      <span style={{ fontSize: "18px" }}>🟢</span>
                    ) : (
                      <ExternalLink size={18} color="#aaa" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{lnk.title}</div>
                    <div style={{ fontSize: "13px", color: "#3ea6ff" }}>{lnk.url}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Thông tin khác Section */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", margin: "0 0 18px 0" }}>Thông tin khác</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Xem địa chỉ email */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Mail size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <button
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      borderRadius: "18px",
                      padding: "8px 16px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onClick={() => alert("Địa chỉ email liên hệ cho công việc: booking@mtp-entertainment.com")}
                  >
                    Xem địa chỉ email
                  </button>
                </div>

                {/* Handle / Channel URL */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                  </svg>
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    www.youtube.com/{activeChannel.handle || "@Sontungmtp"}
                  </span>
                </div>

                {/* Country */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Globe size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    {activeChannel.about?.country || "Việt Nam"}
                  </span>
                </div>

                {/* Join Date */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Info size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    {activeChannel.about?.joinedDate || activeChannel.about?.joinDate || "Đã tham gia 21 thg 1, 2015"}
                  </span>
                </div>

                {/* Subscribers */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Users size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    {activeChannel.subscribers || "11,9 Tr người đăng ký"}
                  </span>
                </div>

                {/* Video Count */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <Play size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    {activeChannel.videoCount || "221 video"}
                  </span>
                </div>

                {/* Total Views */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <TrendingUp size={20} color="#aaa" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#f1f1f1" }}>
                    {activeChannel.about?.viewCount || activeChannel.about?.views || "3.781.654.917 lượt xem"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row: Chia sẻ kênh & Báo cáo người dùng */}
            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
              <button
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: "20px",
                  padding: "10px 16px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert("Đã sao chép liên kết kênh!");
                }}
              >
                <Share2 size={16} />
                <span>Chia sẻ kênh</span>
              </button>
              <button
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: "20px",
                  padding: "10px 16px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onClick={() => alert("Cảm ơn bạn đã phản hồi.")}
              >
                <Flag size={16} />
                <span>Báo cáo người dùng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {shareToast && (
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#282828",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <span>Đã sao chép liên kết vào khay nhớ tạm!</span>
        </div>
      )}
    </div>
  );
};

export default Channel;
