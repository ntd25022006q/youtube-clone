import React, { useContext } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import { Play } from "lucide-react";
import "./pages.css";

const LikedVideos = () => {
  const { videos, likedVideos, handleVideoSelect } = useContext(YoutubeContext);

  // Filter videos that are liked
  const likedList = videos.filter((v) => likedVideos.includes(v.id));

  const handlePlayFirst = () => {
    if (likedList.length > 0) {
      handleVideoSelect(likedList[0]);
    }
  };

  return (
    <div className="liked-videos-container">
      {likedList.length === 0 ? (
        <div className="no-liked">
          <h2>Chưa có video đã thích</h2>
          <p>Các video bạn thích sẽ được lưu tại đây để bạn có thể xem lại.</p>
        </div>
      ) : (
        <div className="liked-layout">
          {/* Left Playlist Card */}
          <div className="playlist-sidebar-card">
            <div className="playlist-cover">
              <img
                src={likedList[0].thumbnailUrl}
                alt="Playlist cover"
                className="playlist-cover-img"
              />
              <div className="cover-overlay" onClick={handlePlayFirst}>
                <Play size={36} fill="white" />
                <span>Phát tất cả</span>
              </div>
            </div>
            <div className="playlist-meta">
              <h2>Video đã thích</h2>
              <p className="playlist-author">Bạn</p>
              <p className="playlist-count">{likedList.length} video</p>
              <button className="play-all-btn" onClick={handlePlayFirst}>
                <Play size={16} fill="currentColor" />
                <span>Phát tất cả</span>
              </button>
            </div>
          </div>

          {/* Right Playlist Items */}
          <div className="playlist-items-list">
            {likedList.map((video, index) => (
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

export default LikedVideos;
