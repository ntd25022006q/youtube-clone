import React, { useContext } from "react";
import { YoutubeContext, handleThumbnailError } from "../context/YoutubeContext";
import { Download, Play, Trash2, CheckCircle2 } from "lucide-react";
import "./pages.css";

const Downloads = () => {
  const { downloadedVideos, removeDownload, handleVideoSelect, currentUser, setShowLoginModal } = useContext(YoutubeContext);

  const hasDownloads = downloadedVideos && downloadedVideos.length > 0;

  if (!currentUser && !hasDownloads) {
    return (
      <div className="liked-videos-container" style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Download size={64} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Xem lại các video đã tải xuống của bạn</h2>
        <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>Đăng nhập để đồng bộ hoặc bấm nút Tải xuống ở bất kỳ video nào để xem ngoại tuyến ngay.</p>
        <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

  const handlePlayFirst = () => {
    if (downloadedVideos && downloadedVideos.length > 0) {
      handleVideoSelect(downloadedVideos[0]);
    }
  };

  return (
    <div className="liked-videos-container" style={{ padding: "24px" }}>
      {!downloadedVideos || downloadedVideos.length === 0 ? (
        <div className="no-liked">
          <Download size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
          <h2>Bạn chưa tải video nào xuống</h2>
          <p>Các video bạn bấm Tải xuống sẽ xuất hiện tại đây để xem ngoại tuyến.</p>
        </div>
      ) : (
        <div className="liked-layout">
          {/* Left Downloads Card */}
          <div className="playlist-sidebar-card">
            <div className="playlist-cover">
              <img
                src={downloadedVideos[0].thumbnailUrl || `https://i.ytimg.com/vi/${downloadedVideos[0].id}/sddefault.jpg`}
                alt="Downloads cover"
                className="playlist-cover-img"
                onError={(e) => handleThumbnailError(e, downloadedVideos[0].id, downloadedVideos[0].title)}
              />
              <div className="cover-overlay" onClick={handlePlayFirst}>
                <Play size={36} fill="white" />
                <span>Phát tất cả</span>
              </div>
            </div>
            <div className="playlist-meta">
              <h2>Nội dung tải xuống</h2>
              <p className="playlist-author">{currentUser ? currentUser.name : "Ngoại tuyến trên thiết bị này"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3ea6ff", fontSize: "13px", marginTop: "4px" }}>
                <CheckCircle2 size={16} />
                <span>Đã sẵn sàng xem ngoại tuyến</span>
              </div>
              <p className="playlist-count" style={{ marginTop: "6px" }}>{downloadedVideos.length} video</p>
              <button className="play-all-btn" onClick={handlePlayFirst}>
                <Play size={16} fill="currentColor" />
                <span>Phát tất cả</span>
              </button>
            </div>
          </div>

          {/* Right Downloaded Items List */}
          <div className="playlist-items-list">
            {downloadedVideos.map((video, index) => (
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
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                  <a
                    href={`/api/download?id=${encodeURIComponent(video.id)}&title=${encodeURIComponent(video.title || "video")}`}
                    download={`${(video.title || "video").replace(/[/\\?%*:|"<>]/g, '_')}.mp4`}
                    className="icon-btn"
                    title="Tải tệp .mp4 trực tiếp về máy"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#3ea6ff", background: "rgba(62, 166, 255, 0.12)", borderRadius: "50%", border: "none", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                  >
                    <Download size={18} />
                  </a>
                  <button
                    className="icon-btn"
                    title="Xóa khỏi nội dung tải xuống"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDownload(video.id);
                    }}
                    style={{ color: "#aaa", background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Downloads;
