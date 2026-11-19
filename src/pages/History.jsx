import React, { useContext } from "react";
import { Trash2, X } from "lucide-react";
import { YoutubeContext, handleThumbnailError } from "../context/YoutubeContext";
import "./pages.css";

const History = () => {
  const { watchHistory, clearHistory, handleVideoSelect, setWatchHistory } = useContext(YoutubeContext);

  const safeHistory = Array.isArray(watchHistory) ? watchHistory : [];

  const handleRemoveFromHistory = (e, videoId) => {
    e.stopPropagation();
    setWatchHistory(prev => (Array.isArray(prev) ? prev : []).filter(v => v && v.id !== videoId));
  };

  return (
    <div className="history-page-container">
      <div className="history-header">
        <h1>{"Nhật ký xem"}</h1>
        {safeHistory.length > 0 && (
          <button className="clear-history-btn" onClick={clearHistory}>
            <Trash2 size={16} />
            <span>{"Xóa tất cả nhật ký xem"}</span>
          </button>
        )}
      </div>

      {safeHistory.length === 0 ? (
        <div className="no-history">
          <h2>{"Theo dõi những video bạn xem"}</h2>
          <p>{"Nhật ký xem không khả dụng khi bạn đăng xuất hoặc khi nhật ký đã bị xóa."}</p>
        </div>
      ) : (
        <div className="history-list">
          {safeHistory.filter(v => v && v.id).map((video, index) => (
            <div
              key={`${video.id}-${index}`}
              className="history-row-card"
              onClick={() => handleVideoSelect(video)}
              style={{ position: "relative" }}
            >
              <div className="history-thumbnail-container">
                <img
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`}
                  alt={video.title}
                  className="history-thumbnail"
                  onError={(e) => handleThumbnailError(e, video.id, video.title)}
                />
                <span className="history-duration">{video.duration}</span>
              </div>
              <div className="history-info">
                <h3 className="history-title">{video.title}</h3>
                <p className="history-channel">{video.channel?.name || video.channelTitle || video.author || (typeof video.channel === 'string' ? video.channel : "YouTube")}</p>
                <div className="history-stats">
                  <span>{video.views}</span>
                  <span className="dot-separator">{"•"}</span>
                  <span>{"\u0110\u00e3 xem g\u1ea7n \u0111\u00e2y"}</span>
                </div>
                {video.description && (
                  <p className="history-description">
                    {video.description.slice(0, 120)}{video.description.length > 120 ? "..." : ""}
                  </p>
                )}
              </div>
              <button
                title={"\u0058\u00f3a kh\u1ecfi nh\u1eadt k\u00fd"}
                onClick={e => handleRemoveFromHistory(e, video.id)}
                style={{ marginLeft: "auto", flexShrink: 0, color: "#aaa", padding: "8px", borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;