import React, { useContext } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

import { Film } from "lucide-react";

const YourVideos = () => {
  const { videos, currentUser, setShowLoginModal } = useContext(YoutubeContext);

  if (!currentUser) {
    return (
      <div className="your-videos-page-container" style={{ padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Film size={64} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Video của bạn</h2>
        <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>Đăng nhập để xem và quản lý tất cả các video bạn đã tải lên.</p>
        <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

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
