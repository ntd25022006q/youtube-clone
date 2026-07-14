import React, { useContext, useState } from "react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
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

const VideoCard = ({ video }) => {
  const { handleVideoSelect, handleChannelSelect, prefetchVideo, prefetchChannel } = useContext(YoutubeContext);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef(null);

  const handleChannelClick = (e) => {
    e.stopPropagation();
    handleChannelSelect(video.channel);
  };

  const handleMouseEnter = () => {
    prefetchVideo(video);
    prefetchChannel(video.channel);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 800); // Trigger autoplay hover preview after 800ms hover
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Robust thumbnail with fallback
  const thumbSrc = thumbFailed
    ? `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`
    : (video.thumbnailUrl || `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`);

  // Robust avatar with fallback
  const avatarSrc = avatarFailed
    ? getFallbackAvatar(video.channel.name)
    : (video.channel.avatar || getFallbackAvatar(video.channel.name));

  return (
    <div 
      className="video-card" 
      onClick={() => handleVideoSelect(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="thumbnail-container">
        {isHovered && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1&start=5`}
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
        )}
        <img
          src={thumbSrc}
          alt={video.title}
          className={`video-thumbnail ${thumbLoaded ? "loaded" : ""}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setThumbLoaded(true)}
          onError={() => { if (!thumbFailed) setThumbFailed(true); }}
        />
        <span className="video-duration">{video.duration}</span>
      </div>
      <div className="video-info-container">
        <img
          src={avatarSrc}
          alt={video.channel.name}
          className="channel-avatar"
          loading="eager"
          onClick={handleChannelClick}
          onError={() => { if (!avatarFailed) setAvatarFailed(true); }}
        />
        <div className="video-meta">
          <h3 className="video-title" title={video.title}>
            {video.title}
          </h3>
          <p className="channel-name" onClick={handleChannelClick}>
            {video.channel.name}
            {video.channel.isVerified && <VerifiedBadge />}
          </p>
          <div className="stats-row">
            <span>{video.views}</span>
            <span className="dot-separator">•</span>
            <span>{video.uploadedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
