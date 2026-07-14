import React, { useContext } from "react";
import { Trash2 } from "lucide-react";
import { YoutubeContext } from "../context/YoutubeContext";
import "./pages.css";

const History = () => {
  const { watchHistory, clearHistory, handleVideoSelect } = useContext(YoutubeContext);

  return (
    <div className="history-page-container">
      <div className="history-header">
        <h1>Nhật ký xem</h1>
        {watchHistory.length > 0 && (
          <button className="clear-history-btn" onClick={clearHistory}>
            <Trash2 size={16} />
            <span>Xóa tất cả nhật ký xem</span>
          </button>
        )}
      </div>

      {watchHistory.length === 0 ? (
        <div className="no-history">
          <h2>Theo dõi những video bạn xem</h2>
          <p>Nhật ký xem không khả dụng khi bạn đăng xuất hoặc khi nhật ký đã bị xóa.</p>
        </div>
      ) : (
        <div className="history-list">
          {watchHistory.map((video, index) => (
            <div
              key={`${video.id}-${index}`}
              className="history-row-card"
              onClick={() => handleVideoSelect(video)}
            >
              <div className="history-thumbnail-container">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="history-thumbnail"
                />
                <span className="history-duration">{video.duration}</span>
              </div>
              <div className="history-info">
                <h3 className="history-title">{video.title}</h3>
                <p className="history-channel">{video.channel.name}</p>
                <div className="history-stats">
                  <span>{video.views}</span>
                  <span className="dot-separator">•</span>
                  <span>Đã xem gần đây</span>
                </div>
                <p className="history-description">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
