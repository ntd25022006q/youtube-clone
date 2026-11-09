import React, { useContext } from "react";
import { YoutubeContext, handleThumbnailError } from "../context/YoutubeContext";
import { Play, Trash2, Bookmark, LogIn } from "lucide-react";
import "./pages.css";

const WatchLater = () => {
  const { videos, watchLater, watchLaterVideos, handleVideoSelect, currentUser, toggleWatchLater, setShowLoginModal } = useContext(YoutubeContext);

  if (!currentUser) {
    return (
      <div className="playlists-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
        <Bookmark size={48} style={{ color: "#aaa", marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Xem sau</h2>
        <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>Đăng nhập để xem danh sách video bạn muốn xem sau.</p>
        <button 
          onClick={() => setShowLoginModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "#3ea6ff", color: "#000", border: "none", borderRadius: "18px", padding: "8px 20px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
        >
          <LogIn size={18} />
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

  // Filter videos that are saved in watch later list (persistent first)
  const safeWatchLaterList = Array.isArray(watchLaterVideos) ? watchLaterVideos : [];
  const safeWatchLaterIds = Array.isArray(watchLater) ? watchLater : [];
  const safeVideos = Array.isArray(videos) ? videos : [];

  const watchLaterList = safeWatchLaterList.length > 0
    ? safeWatchLaterList
    : safeVideos.filter((v) => v && v.id && safeWatchLaterIds.includes(v.id));

  const handlePlayFirst = () => {
    if (watchLaterList.length > 0) {
      handleVideoSelect(watchLaterList[0]);
    }
  };

  return (
    <div className="liked-videos-container">
      {watchLaterList.length === 0 ? (
        <div className="no-liked">
          <h2>Danh sách Xem sau trống</h2>
          <p>Các video bạn lưu để Xem sau sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="liked-layout">
          {/* Left Playlist Card */}
          <div className="playlist-sidebar-card watch-later-playlist-card">
            <div className="playlist-cover">
              <img
                src={watchLaterList[0].thumbnailUrl || `https://i.ytimg.com/vi/${watchLaterList[0].id}/sddefault.jpg`}
                alt="Playlist cover"
                className="playlist-cover-img"
                onError={(e) => handleThumbnailError(e, watchLaterList[0].id, watchLaterList[0].title)}
              />
              <div className="cover-overlay" onClick={handlePlayFirst}>
                <Play size={36} fill="white" />
                <span>Phát tất cả</span>
              </div>
            </div>
            <div className="playlist-meta">
              <h2>Xem sau</h2>
              <p className="playlist-author">{currentUser?.name || "Bạn"}</p>
              <p className="playlist-count">{watchLaterList.length} video</p>
              <button className="play-all-btn" onClick={handlePlayFirst}>
                <Play size={16} fill="currentColor" />
                <span>Phát tất cả</span>
              </button>
            </div>
          </div>

          {/* Right Playlist Items */}
          <div className="playlist-items-list">
            {watchLaterList.map((video, index) => (
              <div
                key={video.id}
                className="playlist-item-row"
                onClick={() => handleVideoSelect(video)}
              >
                <span className="item-index">{index + 1}</span>
                <img
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`}
                  alt={video.title}
                  className="playlist-item-thumb"
                  onError={(e) => handleThumbnailError(e, video.id, video.title)}
                />
                <div className="playlist-item-info">
                  <h4>{video.title}</h4>
                  <p>{video.channel?.name}</p>
                  <span>{video.views} • {video.uploadedAt}</span>
                </div>
                <button
                  className="icon-btn"
                  title="Xóa khỏi Xem sau"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchLater(video);
                  }}
                  style={{ marginLeft: "auto", color: "#aaa", background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchLater;
