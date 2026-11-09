import React, { useContext, useState } from "react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

import { User } from "lucide-react";

const YourChannel = () => {
  const { currentUser, videos, formatVideosCountVi, setShowLoginModal } = useContext(YoutubeContext);
  const [activeTab, setActiveTab] = useState("Videos");

  if (!currentUser) {
    return (
      <div className="channel-page-container" style={{ padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <User size={64} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Kênh của bạn</h2>
        <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>Đăng nhập để xem kênh cá nhân, quản lý video và tùy chỉnh hồ sơ của bạn.</p>
        <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

  // Filter videos uploaded by the logged-in user
  const uploadedVideos = videos.filter(v => v.channel && v.channel.name === currentUser.name);

  const getBannerGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 60%, 25%)`;
    const c2 = `hsl(${(hash + 120) % 360}, 65%, 15%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  return (
    <div className="channel-page-container">
      <div
        className="channel-banner"
        style={{
          background: getBannerGradient(currentUser.name),
        }}
      >
        <div className="banner-overlay"></div>
      </div>

      <div className="channel-header-info">
        <img src={currentUser.avatar} alt={currentUser.name} className="channel-large-avatar" onError={e => { e.target.src = getFallbackAvatar(currentUser.name); }} />
        <div className="channel-header-text">
          <h1 className="channel-header-name">{currentUser.name}</h1>
          <p className="channel-header-stats">
            <span>@{currentUser.email.split("@")[0]}</span>
            <span className="dot-separator">•</span>
            <span>0 người đăng ký</span>
            <span className="dot-separator">•</span>
            <span>{formatVideosCountVi(uploadedVideos.length)}</span>
          </p>
          <p className="channel-header-desc">
            Kênh cá nhân của bạn. Upload video để chia sẻ nội dung với mọi người.
          </p>
        </div>
      </div>

      <div className="channel-tabs">
        {[
          { id: "Home", label: "Trang chủ" },
          { id: "Videos", label: "Video" },
          { id: "About", label: "Giới thiệu" }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`channel-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <hr className="channel-tab-divider" />

      <div className="channel-tab-content">
        {activeTab === "Videos" && (
          <div>
            {uploadedVideos.length === 0 ? (
              <div className="no-videos-uploaded">
                <p>Bạn chưa tải lên video nào.</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Hãy bấm vào nút Tạo (biểu tượng máy quay) ở đầu trang để tải lên video của bạn.
                </p>
              </div>
            ) : (
              <div className="video-grid">
                {uploadedVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "Home" && (
          <div className="channel-home-tab">
            <h3>Video tải lên</h3>
            {uploadedVideos.length === 0 ? (
              <div className="no-videos-uploaded">
                <p>Bạn chưa tải lên video nào.</p>
              </div>
            ) : (
              <div className="video-grid">
                {uploadedVideos.slice(0, 4).map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "About" && (
          <div className="channel-about-info">
            <div>
              <h2>Mô tả</h2>
              <p>Chưa có mô tả cho kênh của bạn.</p>
            </div>
            <div className="channel-stats-box">
              <h3>Thống kê</h3>
              <hr />
              <p>Đã tham gia hôm nay</p>
              <p>0 lượt xem</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YourChannel;
