import React, { useContext } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import { Play } from "lucide-react";
import "./pages.css";

const WatchLater = () => {
  const { videos, watchLater, handleVideoSelect, currentUser } = useContext(YoutubeContext);

  if (!currentUser) return null;

  // Filter videos that are saved in watch later list
  const watchLaterList = videos.filter((v) => watchLater.includes(v.id));

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
                src={watchLaterList[0].thumbnailUrl || `https://i.ytimg.com/vi/${watchLaterList[0].id}/hqdefault.jpg`}
                alt="Playlist cover"
                className="playlist-cover-img"
                onError={e => { e.target.src = `https://i.ytimg.com/vi/${watchLaterList[0].id}/hqdefault.jpg`; }}
              />
              <div className="cover-overlay" onClick={handlePlayFirst}>
                <Play size={36} fill="white" />
                <span>Phát tất cả</span>
              </div>
            </div>
            <div className="playlist-meta">
              <h2>Xem sau</h2>
              <p className="playlist-author">{currentUser.name}</p>
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
                <span className="row-index">{index + 1}</span>
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="playlist-item-thumb"
                />
                <div className="playlist-item-details">
                  <h4 className="item-title">{video.title}</h4>
                  <p className="item-channel">{video.channel.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchLater;
