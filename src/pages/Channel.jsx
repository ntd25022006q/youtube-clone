import React, { useContext, useState, useEffect } from "react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

const VerifiedBadge = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
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
    <div className="thumbnail-container skeleton-box"></div>
    <div className="video-info-container">
      <div className="channel-avatar skeleton-box circle"></div>
      <div className="video-meta" style={{ gap: '8px' }}>
        <div className="skeleton-box text-line-title"></div>
        <div className="skeleton-box text-line-channel"></div>
      </div>
    </div>
  </div>
);

const Channel = () => {
  const {
    activeChannel,
    videos,
    subscriptions,
    toggleSubscribe,
    isChannelLoading,
    formatVideosCountVi,
    hasMoreChannelVideos,
    fetchMoreChannelVideos
  } = useContext(YoutubeContext);
  const [activeTab, setActiveTab] = useState("Videos");
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Prioritize uploads fetched from API over offline mock list
  const channelVideos = activeChannel
    ? (activeChannel.videos && activeChannel.videos.length > 0
        ? activeChannel.videos
        : videos.filter((v) => v.channel && v.channel.id === activeChannel.id))
    : [];

  const activeChannelRef = React.useRef(activeChannel);
  const hasMoreRef = React.useRef(hasMoreChannelVideos);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    hasMoreRef.current = hasMoreChannelVideos;
  }, [activeChannel, hasMoreChannelVideos]);

  // Automatically load channel videos continuously in the background (no scroll needed)
  useEffect(() => {
    let active = true;

    const loadAllVideos = async () => {
      setIsFetchingMore(true);
      while (active && hasMoreRef.current && activeChannelRef.current) {
        try {
          await fetchMoreChannelVideos();
          // Small delay between requests to keep it smooth
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (e) {
          console.warn("Auto channel video fetch loop error:", e);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      if (active) {
        setIsFetchingMore(false);
      }
    };

    if (hasMoreChannelVideos && !isChannelLoading) {
      loadAllVideos();
    }

    return () => {
      active = false;
    };
  }, [activeChannel?.id, isChannelLoading]);



  if (!activeChannel) return <div className="no-channel">Không tìm thấy kênh.</div>;

  const isSubscribed = subscriptions.includes(activeChannel.id);

  // Generate channel banner gradient based on name as fallback if no banner exists
  const getBannerGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 60%, 25%)`;
    const c2 = `hsl(${(hash + 120) % 360}, 65%, 15%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const totalVideosText = activeChannel.videoCountFormatted || formatVideosCountVi(activeChannel.videoCount || 500);

  return (
    <div className="channel-page-container">
      {/* Channel Banner */}
      <div
        className="channel-banner"
        style={{
          background: activeChannel.banner
            ? `url(${activeChannel.banner}) center/cover no-repeat`
            : getBannerGradient(activeChannel.name),
          opacity: isChannelLoading ? 0.7 : 1,
          transition: "opacity 0.3s ease"
        }}
      >
        <div className="banner-overlay"></div>
      </div>

      {/* Channel Identity Header */}
      <div className="channel-header-info">
        <img
          src={activeChannel.avatar || getFallbackAvatar(activeChannel.name)}
          alt={activeChannel.name}
          className="channel-large-avatar"
          onError={e => { e.target.src = getFallbackAvatar(activeChannel.name); }}
        />
        
        <div className="channel-header-text">
          <h1 className="channel-header-name">
            {activeChannel.name}
            {activeChannel.isVerified && <VerifiedBadge />}
          </h1>
          <p className="channel-header-stats">
            <span>@{activeChannel.id || activeChannel.name.toLowerCase().replace(/\s+/g, "")}</span>
            <span className="dot-separator">•</span>
            {isChannelLoading && !activeChannel.subscribers ? (
              <span className="skeleton-box" style={{ display: "inline-block", height: "12px", width: "80px", borderRadius: "3px" }}></span>
            ) : (
              <span>{activeChannel.subscribers}</span>
            )}
            <span className="dot-separator">•</span>
            <span>
              {totalVideosText} video
              <span style={{ marginLeft: "6px", fontSize: "13px", fontWeight: "normal", color: "var(--yt-spec-text-secondary)" }}>
                {`(${channelVideos.length}/${totalVideosText})`}
              </span>
            </span>
          </p>
          <p className="channel-header-desc">
            {activeChannel.description || `Chào mừng bạn đến với kênh chính thức của ${activeChannel.name}.`}
          </p>
          <button
            className={`subscribe-btn channel-sub-btn ${isSubscribed ? "subscribed" : ""}`}
            onClick={() => toggleSubscribe(activeChannel.id)}
          >
            {isSubscribed ? "Đã đăng ký" : "Đăng ký"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="channel-tabs">
        {[
          { id: "Home", label: "Trang chủ" },
          { id: "Videos", label: "Video" },
          { id: "Playlists", label: "Danh sách phát" },
          { id: "About", label: "Giới thiệu" }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`channel-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <hr className="channel-tab-divider" />

      {/* Tab Content */}
      <div className="channel-tab-content">
        {activeTab === "Videos" && (
          <div>
            {channelVideos.length === 0 && isChannelLoading ? (
              <div className="video-grid">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <VideoSkeleton key={idx} />
                ))}
              </div>
            ) : channelVideos.length === 0 ? (
              <p className="no-videos-text">Kênh này chưa có video nào.</p>
            ) : (
              <div className="video-grid">
                {channelVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
                {(isFetchingMore || isChannelLoading) && (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <VideoSkeleton key={`more-${idx}`} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "Home" && (
          <div className="channel-home-tab">
            <h3>Video tải lên phổ biến</h3>
            <div className="video-grid">
              {channelVideos.slice(0, 4).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
              {channelVideos.length === 0 && isChannelLoading && (
                Array.from({ length: 4 }).map((_, idx) => <VideoSkeleton key={idx} />)
              )}
            </div>
          </div>
        )}

        {activeTab === "Playlists" && (
          <div className="no-playlists">
            <p>Kênh này chưa tạo danh sách phát nào.</p>
          </div>
        )}

        {activeTab === "About" && (
          <div className="channel-about-info">
            <div>
              <h2>Mô tả</h2>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {activeChannel.description || "Chưa có mô tả."}
              </p>
            </div>
            <div className="channel-stats-box">
              <h3>Thống kê</h3>
              <hr />
              <p>Đã tham gia YouTube</p>
              <p>{channelVideos.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0).toLocaleString()} lượt xem</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Channel;
