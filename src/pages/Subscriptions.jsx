import React, { useContext } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

const Subscriptions = () => {
  const { videos, subscriptions, isDetailsLoading } = useContext(YoutubeContext);

  // Filter videos from subscribed channels
  const subscribedVideos = videos.filter(
    (video) => video && video.channel && subscriptions.includes(video.channel.id)
  );

  return (
    <div className="subscriptions-page" style={{ padding: "24px", minHeight: "100vh" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", color: "#fff" }}>
        Kênh đăng ký
      </h2>
      
      {subscribedVideos.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 16px",
          textAlign: "center",
          color: "#aaa"
        }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ marginBottom: "16px", opacity: 0.6 }}>
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z" />
          </svg>
          <h3 style={{ color: "#fff", fontSize: "16px", marginBottom: "8px" }}>Chưa có nội dung mới nào</h3>
          <p style={{ fontSize: "14px", maxWidth: "400px", margin: 0 }}>
            Đăng ký các kênh yêu thích của bạn để cập nhật những video mới nhất tại đây.
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {subscribedVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
