import React, { useContext } from "react";
import { Trash2, X } from "lucide-react";
import { YoutubeContext } from "../context/YoutubeContext";
import "./pages.css";

const History = () => {
  const { watchHistory, clearHistory, handleVideoSelect, setWatchHistory } = useContext(YoutubeContext);

  const handleRemoveFromHistory = (e, videoId) => {
    e.stopPropagation();
    setWatchHistory(prev => prev.filter(v => v.id !== videoId));
  };

  return (
    <div className="history-page-container">
      <div className="history-header">
        <h1>{"Nh\u1eadt k\u00fd xem"}</h1>
        {watchHistory.length > 0 && (
          <button className="clear-history-btn" onClick={clearHistory}>
            <Trash2 size={16} />
            <span>{"X\u00f3a t\u1ea5t c\u1ea3 nh\u1eadt k\u00fd xem"}</span>
          </button>
        )}
      </div>

      {watchHistory.length === 0 ? (
        <div className="no-history">
          <h2>{"Theo d\u00f5i nh\u1eefng video b\u1ea1n xem"}</h2>
          <p>{"Nh\u1eadt k\u00fd xem kh\u00f4ng kh\u1ea3 d\u1ee5ng khi b\u1ea1n \u0111\u0103ng xu\u1ea5t ho\u1eb7c khi nh\u1eadt k\u00fd \u0111\u00e3 b\u1ecb x\u00f3a."}</p>
        </div>
      ) : (
        <div className="history-list">
          {watchHistory.map((video, index) => (
            <div
              key={`${video.id}-${index}`}
              className="history-row-card"
              onClick={() => handleVideoSelect(video)}
              style={{ position: "relative" }}
            >
              <div className="history-thumbnail-container">
                <img
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                  alt={video.title}
                  className="history-thumbnail"
                  onError={e => { e.target.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`; }}
                />
                <span className="history-duration">{video.duration}</span>
              </div>
              <div className="history-info">
                <h3 className="history-title">{video.title}</h3>
                <p className="history-channel">{video.channel?.name}</p>
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