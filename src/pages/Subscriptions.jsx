import React, { useContext, useEffect, useState } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
import VideoCard from "../components/VideoCard";
import "./pages.css";

import { Tv } from "lucide-react";

const Subscriptions = () => {
  const { videos, subscriptions, fetchFromInvidious, handleVideoSelect, currentUser, setShowLoginModal } = useContext(YoutubeContext);
  const [extraVideos, setExtraVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return (
      <div className="subscriptions-page" style={{ padding: "60px 24px", minHeight: "100vh", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Tv size={64} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Đừng bỏ lỡ các video mới</h2>
        <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>Đăng nhập để xem cập nhật từ các kênh YouTube yêu thích của bạn.</p>
        <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

  // Videos from currently loaded state that match subscribed channels
  const subscribedFromState = videos.filter(
    (video) => video && video.channel && subscriptions.includes(video.channel.id)
  );

  // Fetch fresh videos from subscribed channels not covered by state
  useEffect(() => {
    if (subscriptions.length === 0) return;
    const missingChannels = subscriptions.filter(
      chId => !subscribedFromState.some(v => v.channel.id === chId)
    );
    if (missingChannels.length === 0) return;

    setLoading(true);
    Promise.allSettled(
      missingChannels.slice(0, 5).map(chId =>
        fetchFromInvidious(`/api/v1/channels/${chId}/videos`, res => res && Array.isArray(res.videos))
          .then(({ data, instance }) => {
            if (!data || !Array.isArray(data.videos)) return [];
            return data.videos.slice(0, 4);
          })
          .catch(() => [])
      )
    ).then(results => {
      const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
      setExtraVideos(all);
      setLoading(false);
    });
  }, [subscriptions.join(",")]);

  const allSubscribedVideos = [
    ...subscribedFromState,
    ...extraVideos.filter(v => v && v.videoId && !subscribedFromState.some(sv => sv.id === v.videoId))
      .map(item => ({
        id: item.videoId,
        title: item.title || "",
        thumbnailUrl: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        channel: { id: item.authorId || "", name: item.author || "", avatar: "" },
        views: `${(item.viewCount || 0).toLocaleString("vi-VN")} views`,
        uploadedAt: item.publishedText || "",
        duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds/60)}:${String(item.lengthSeconds%60).padStart(2,"0")}` : "0:00",
        description: item.description || "",
        likes: "0",
        comments: []
      }))
  ];

  return (
    <div className="subscriptions-page" style={{ padding: "24px", minHeight: "100vh" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", color: "#fff" }}>
        {"K\u00eanh \u0111\u0103ng k\u00fd"}
      </h2>
      
      {loading && allSubscribedVideos.length === 0 && (
        <div style={{ color: "#aaa", textAlign: "center", padding: "40px" }}>
          {"\u0110ang t\u1ea3i video t\u1eeb c\u00e1c k\u00eanh \u0111\u0103ng k\u00fd..."}
        </div>
      )}

      {!loading && allSubscribedVideos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 16px", textAlign: "center", color: "#aaa" }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ marginBottom: "16px", opacity: 0.6 }}>
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z" />
          </svg>
          <h3 style={{ color: "#fff", fontSize: "16px", marginBottom: "8px" }}>{"Ch\u01b0a c\u00f3 n\u1ed9i dung m\u1edbi n\u00e0o"}</h3>
          <p style={{ fontSize: "14px", maxWidth: "400px", margin: 0 }}>
            {"\u0110\u0103ng k\u00fd c\u00e1c k\u00eanh y\u00eau th\u00edch c\u1ee7a b\u1ea1n \u0111\u1ec3 c\u1eadp nh\u1eadt nh\u1eefng video m\u1edbi nh\u1ea5t t\u1ea1i \u0111\u00e2y."}
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {allSubscribedVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;