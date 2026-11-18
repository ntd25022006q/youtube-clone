import React, { useContext, useState, useRef, useEffect } from "react";
import { 
  MoreVertical, 
  Clock, 
  ListPlus, 
  Share2, 
  Download, 
  EyeOff, 
  Ban, 
  Flag,
  Check,
  VolumeX
} from "lucide-react";
import { YoutubeContext, getFallbackAvatar, resolveChannelMetaFromVideo } from "../context/YoutubeContext";
import { ShareModal, PlaylistModal, ReportModal } from "./Modals";
import "./components.css";

const VerifiedBadge = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="currentColor"
    className="verified-badge-icon"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "4px", color: "#aaa" }}
    title="Đã xác minh"
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const SAFE_FALLBACK_THUMBNAILS = [
  "https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg",
  "https://i.ytimg.com/vi/zoEtcR5EW08/hqdefault.jpg",
  "https://i.ytimg.com/vi/UVbv-PJXm14/hqdefault.jpg",
  "https://i.ytimg.com/vi/KKc_RMln5UY/hqdefault.jpg",
  "https://i.ytimg.com/vi/wPUmXoS47Hc/hqdefault.jpg",
  "https://i.ytimg.com/vi/BSWgosEc0LQ/hqdefault.jpg",
  "https://i.ytimg.com/vi/PnM3-nzSERc/hqdefault.jpg",
  "https://i.ytimg.com/vi/zepHPnUDROE/hqdefault.jpg",
  "https://i.ytimg.com/vi/knW7-x7Y7RE/hqdefault.jpg",
  "https://i.ytimg.com/vi/z2f7RHgvddc/hqdefault.jpg"
];

const getSafeDeterministicThumbnail = (id = "", title = "") => {
  const str = `${id}_${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SAFE_FALLBACK_THUMBNAILS.length;
  return SAFE_FALLBACK_THUMBNAILS[index];
};

const getPlayableVideoId = (rawId = '') => {
  if (!rawId) return 'abPmZCZZrFA';
  let s = String(rawId).trim();
  if (s.startsWith('RD') && s.length >= 13) {
    const cand = s.slice(2, 13);
    if (/^[a-zA-Z0-9_-]{11}$/.test(cand)) return cand;
  }
  if (s.startsWith('PL') || s.startsWith('OLAK') || s.startsWith('UU') || s.startsWith('mix_')) {
    return 'KPaRJWX0qZc';
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  return s.replace(/^short_(?:api_)?/, '');
};

const VideoCard = ({ video }) => {
  const { 
    handleVideoSelect, 
    handleChannelSelect, 
    prefetchVideo, 
    prefetchChannel,
    watchLater,
    toggleWatchLater,
    downloadVideo,
    hideVideo,
    hideChannel,
    hiddenVideoIds,
    hiddenChannelIds
  } = useContext(YoutubeContext);

  const [thumbStage, setThumbStage] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const hoverTimeoutRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    setThumbStage(0);
    setThumbLoaded(false);
    setAvatarFailed(false);
  }, [video?.id]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  if (!video) return null;
  if (hiddenVideoIds && hiddenVideoIds.includes(video.id)) return null;
  if (video.channel && hiddenChannelIds && hiddenChannelIds.includes(video.channel.id)) return null;

  const channelMeta = resolveChannelMetaFromVideo(video);

  const handleChannelClick = (e) => {
    e.stopPropagation();
    handleChannelSelect({
      id: channelMeta.id,
      name: channelMeta.name,
      avatar: channelMeta.avatar
    });
  };

  const handleMouseEnter = () => {
    prefetchVideo(video);
    prefetchChannel(video.channel);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 800);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Progressive cascading thumbnail strictly for this video ID
  const isSpecialId = !video.id || video.id.startsWith('PL') || video.id.startsWith('UC') || video.id.startsWith('release_') || video.id.length !== 11;
  const validExplicitThumb = (video.thumbnailUrl || video.thumbnail || '').trim();

  const SAFE_FALLBACK_THUMB = 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg';

  const getThumbSrc = () => {
    if (thumbStage >= 4) {
      return SAFE_FALLBACK_THUMB;
    }
    if (validExplicitThumb && !validExplicitThumb.includes('no_thumbnail.jpg') && !validExplicitThumb.includes('default-user') && !validExplicitThumb.includes('/vi/UC') && !validExplicitThumb.includes('/vi/@')) {
      if (thumbStage === 0) return validExplicitThumb;
    }
    if (isSpecialId) {
      return (validExplicitThumb && !validExplicitThumb.includes('/vi/UC') && !validExplicitThumb.includes('/vi/PL') && !validExplicitThumb.includes('/vi/@')) 
        ? validExplicitThumb 
        : SAFE_FALLBACK_THUMB;
    }
    if (thumbStage === 0) {
      return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    }
    if (thumbStage === 1) {
      return `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
    }
    if (thumbStage === 2) {
      return `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`;
    }
    if (thumbStage === 3) {
      return `https://i.ytimg.com/vi/${video.id}/default.jpg`;
    }
    return SAFE_FALLBACK_THUMB;
  };

  const handleThumbError = () => {
    setThumbStage((prev) => {
      const next = prev + 1;
      if (next >= 4) {
        setThumbLoaded(true);
      }
      return next;
    });
  };

  const handleThumbLoad = (e) => {
    // Detect YouTube's 120x90 404 placeholder
    if (e.target.naturalWidth === 120 && e.target.naturalHeight === 90) {
      setThumbStage(4);
    } else {
      setThumbLoaded(true);
    }
  };

  // Robust avatar with authentic channel fallback
  const avatarSrc = avatarFailed
    ? getFallbackAvatar(channelMeta.name)
    : (channelMeta.avatar && !channelMeta.avatar.includes("default-user") ? channelMeta.avatar : getFallbackAvatar(channelMeta.name));

  const isSavedWatchLater = watchLater && watchLater.includes(video.id);
  const isLive = Boolean(video.isLive || (video.title && (video.title.includes("TRỰC TIẾP") || video.title.includes("Trực tiếp") || video.title.includes("🔴"))) || video.duration === "Trực tiếp");
  const playableId = getPlayableVideoId(video.id);

  const hasSubtitles = Boolean(video.hasSubtitles || video.subtitles || video.hasCaptions);

  return (
    <>
      <div 
        className={`video-card ${showMenu ? "menu-open" : ""}`}
        onClick={() => handleVideoSelect(video)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="thumbnail-container" style={{ position: "relative", overflow: "hidden" }}>
          {isHovered && !isLive && playableId && (
            <>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playableId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1&start=5`}
                title={video.title}
                className="video-hover-preview"
                allow="autoplay; encrypted-media"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "12px",
                  pointerEvents: "none",
                  zIndex: 2,
                  background: "#000"
                }}
              />
              <div className="hover-preview-mute-badge" title="Tắt tiếng khi phát trước">
                <VolumeX size={14} />
              </div>
              <div className="hover-preview-progress-track">
                <div className="hover-preview-progress-fill" />
              </div>
            </>
          )}
          <img
            src={getThumbSrc()}
            alt={video.title}
            className={`video-thumbnail ${thumbLoaded ? "loaded" : ""}`}
            loading="lazy"
            decoding="async"
            onLoad={handleThumbLoad}
            onError={handleThumbError}
          />
          <span className={`video-duration ${isLive ? "live-badge-red" : ""}`}>
            {isLive ? "TRỰC TIẾP" : (video.duration || "10:00")}
          </span>
        </div>

        <div className="video-info-container">
          <img
            src={avatarSrc}
            alt={channelMeta.name}
            className="channel-avatar" referrerPolicy="no-referrer"
            loading="eager"
            onClick={handleChannelClick}
            onError={() => { if (!avatarFailed) setAvatarFailed(true); }}
          />
          <div className="video-meta">
            <h3 className="video-title" title={(video.title || "").replace(/[\uFFFC\uFFFD\uFEFF]/g, "").trim()}>
              {(video.title || "").replace(/[\uFFFC\uFFFD\uFEFF]/g, "").trim()}
            </h3>
            <p className="channel-name" onClick={handleChannelClick}>
              {channelMeta.name}
              {channelMeta.isVerified && <VerifiedBadge />}
            </p>
            {(() => {
              const isPlaylistCard = Boolean(video.isPlaylist || (video.duration && String(video.duration).toLowerCase().includes('video')));
              if (isPlaylistCard) {
                const countText = (video.duration && video.duration.toLowerCase() !== 'danh sách phát') ? video.duration : 'Nhiều video';
                return (
                  <div className="stats-row">
                    <span>Danh sách phát</span>
                    <span className="dot-separator">•</span>
                    <span>{countText}</span>
                  </div>
                );
              }

              let rawViews = String(video.views || video.viewCountText || "").replace(/[\u00A0\s]+/g, " ").trim();
              let rawTime = String(video.uploadedAt || video.publishedText || "").replace(/[\u00A0\s]+/g, " ").trim();
              if (rawViews.length > 35 || rawViews.includes('\n')) rawViews = "";
              if (rawTime.length > 35 || rawTime.includes('\n')) rawTime = "";

              rawViews = rawViews.replace(/^[·•.\s-]+|[·•.\s-]+$/g, "").trim();
              rawTime = rawTime.replace(/^[·•.\s-]+|[·•.\s-]+$/g, "").trim();
              rawViews = rawViews.replace(/(lượt\s*xem\s*)+/gi, "").trim();

              const seedStr = video.id || video.title || "yt_card";
              let hash = 0;
              for (let i = 0; i < seedStr.length; i++) hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
              const fallbackTimes = ['3 ngày trước', '5 ngày trước', '1 tuần trước', '2 tuần trước', '1 tháng trước', '3 tháng trước', '6 tháng trước', '1 năm trước', '2 năm trước'];
              const fallbackViews = ['85 N lượt xem', '140 N lượt xem', '320 N lượt xem', '650 N lượt xem', '1,2 Tr lượt xem', '2,8 Tr lượt xem', '4,5 Tr lượt xem'];

              const safeViews = (rawViews && rawViews !== "•" && rawViews !== "." && rawViews !== "Nhiều lượt xem" && rawViews !== "Nhiều video" && /[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/.test(rawViews))
                ? `${rawViews} lượt xem`
                : fallbackViews[hash % fallbackViews.length];

              const safeTime = (rawTime && rawTime !== "•" && rawTime !== "." && rawTime !== "Gần đây" && rawTime !== "Danh sách phát" && /[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/.test(rawTime))
                ? rawTime
                : fallbackTimes[hash % fallbackTimes.length];

              return (
                <div className="stats-row">
                  <span>{safeViews}</span>
                  <span className="dot-separator">•</span>
                  <span>{safeTime}</span>
                </div>
              );
            })()}
            {hasSubtitles && (
              <div className="video-card-badges-row">
                <span className="badge-subtitles">Phụ đề</span>
              </div>
            )}
          </div>

          {/* 3-dots Context Action Menu */}
          <div className="video-card-menu-container" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button 
              className="video-card-menu-btn" 
              onClick={handleMenuToggle} 
              aria-label="Tùy chọn khác"
              title="Tùy chọn khác"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="video-card-dropdown" onClick={e => e.stopPropagation()}>
                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { toggleWatchLater(video); setShowMenu(false); }}
                >
                  <Clock size={18} />
                  <span>{isSavedWatchLater ? "Xóa khỏi Xem sau" : "Lưu vào danh sách Xem sau"}</span>
                </div>

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { setShowPlaylistModal(true); setShowMenu(false); }}
                >
                  <ListPlus size={18} />
                  <span>Lưu vào danh sách phát</span>
                </div>

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { downloadVideo(video); setShowMenu(false); }}
                >
                  <Download size={18} />
                  <span>Tải xuống</span>
                </div>

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { setShowShareModal(true); setShowMenu(false); }}
                >
                  <Share2 size={18} />
                  <span>Chia sẻ</span>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { hideVideo(video.id); setShowMenu(false); }}
                >
                  <EyeOff size={18} />
                  <span>Không quan tâm</span>
                </div>

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { hideChannel(video.channel?.id, video.channel?.name); setShowMenu(false); }}
                >
                  <Ban size={18} />
                  <span>Không đề xuất kênh này</span>
                </div>

                <div 
                  className="video-card-dropdown-item" 
                  onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                >
                  <Flag size={18} />
                  <span>Báo cáo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal video={video} onClose={() => setShowShareModal(false)} />
      )}

      {showPlaylistModal && (
        <PlaylistModal video={video} onClose={() => setShowPlaylistModal(false)} />
      )}

      {showReportModal && (
        <ReportModal video={video} onClose={() => setShowReportModal(false)} />
      )}
    </>
  );
};

export default VideoCard;
