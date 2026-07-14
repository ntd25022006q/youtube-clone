import React, { useContext } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

const YourVideos = () => {
  const { videos, currentUser } = useContext(YoutubeContext);

  if (!currentUser) return null;

  // Filter videos that are published by the user
  const userVideos = videos.filter((v) => v.channel && v.channel.name === currentUser.name);

  return (
    <div className="your-videos-page-container">
      <div className="your-videos-header">
        <h1>Video của bạn</h1>
      </div>
      {userVideos.length === 0 ? (
        <div className="no-videos-uploaded">
          <p>Bạn chưa tải lên video nào.</p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Hãy bấm vào nút Tạo (biểu tượng máy quay) ở đầu trang để tải lên video của bạn.
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {userVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default YourVideos;
