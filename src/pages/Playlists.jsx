import React, { useContext, useState } from "react";
import { YoutubeContext, handleThumbnailError } from "../context/YoutubeContext";
import { Play, Plus, ListVideo, Trash2, ArrowLeft, Globe, Lock, EyeOff } from "lucide-react";
import "./pages.css";

const Playlists = () => {
  const { playlists, createPlaylist, removeFromPlaylist, handleVideoSelect, currentUser, setShowLoginModal } = useContext(YoutubeContext);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrivacy, setNewPrivacy] = useState("Công khai");

  if (!currentUser) {
    return (
      <div className="liked-videos-container" style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ListVideo size={64} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Tận hưởng các danh sách phát của bạn</h2>
        <p style={{ color: "#aaa", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>Đăng nhập để tạo, sắp xếp và lưu các danh sách phát yêu thích.</p>
        <button className="google-signin-btn-blue" onClick={() => setShowLoginModal(true)}>
          <span>Đăng nhập</span>
        </button>
      </div>
    );
  }

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createPlaylist(newTitle.trim(), newPrivacy);
    setNewTitle("");
    setShowCreateModal(false);
  };

  const activePlaylist = playlists.find(p => p.id === selectedPlaylistId);

  if (activePlaylist) {
    const handlePlayAll = () => {
      if (activePlaylist.videos && activePlaylist.videos.length > 0) {
        handleVideoSelect(activePlaylist.videos[0]);
      }
    };

    return (
      <div className="liked-videos-container" style={{ padding: "24px" }}>
        <button
          onClick={() => setSelectedPlaylistId(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "none",
            color: "#aaa",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "20px",
            padding: "6px 0"
          }}
        >
          <ArrowLeft size={18} />
          <span>Quay lại tất cả danh sách phát</span>
        </button>

        <div className="liked-layout">
          {/* Left Playlist Cover Card */}
          <div className="playlist-sidebar-card">
            <div className="playlist-cover">
              {activePlaylist.videos && activePlaylist.videos.length > 0 ? (
                <img
                  src={activePlaylist.videos[0].thumbnailUrl || `https://i.ytimg.com/vi/${activePlaylist.videos[0].id}/sddefault.jpg`}
                  alt="Playlist cover"
                  className="playlist-cover-img"
                  onError={(e) => handleThumbnailError(e, activePlaylist.videos[0].id, activePlaylist.videos[0].title)}
                />
              ) : (
                <div style={{ width: "100%", height: "180px", background: "#333", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ListVideo size={48} color="#777" />
                </div>
              )}
              {activePlaylist.videos && activePlaylist.videos.length > 0 && (
                <div className="cover-overlay" onClick={handlePlayAll}>
                  <Play size={36} fill="white" />
                  <span>Phát tất cả</span>
                </div>
              )}
            </div>
            <div className="playlist-meta">
              <h2>{activePlaylist.title}</h2>
              <p className="playlist-author">{currentUser?.name || "Bạn"}</p>
              <p className="playlist-count">{activePlaylist.videos?.length || 0} video • {activePlaylist.privacy}</p>
              {activePlaylist.videos && activePlaylist.videos.length > 0 && (
                <button className="play-all-btn" onClick={handlePlayAll}>
                  <Play size={16} fill="currentColor" />
                  <span>Phát tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Playlist Items */}
          <div className="playlist-items-list">
            {!activePlaylist.videos || activePlaylist.videos.length === 0 ? (
              <div className="no-liked" style={{ padding: "40px 0" }}>
                <h3>Danh sách phát này chưa có video nào</h3>
                <p>Hãy bấm vào biểu tượng 3 chấm trên bất kỳ video nào để thêm vào danh sách này.</p>
              </div>
            ) : (
              activePlaylist.videos.map((video, index) => (
                <div
                  key={video.id}
                  className="playlist-item-row"
                  onClick={() => handleVideoSelect(video)}
                >
                  <span className="item-index">{index + 1}</span>
                  <img
                    src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`}
                    alt={video.title}
                    className="playlist-item-thumb"
                    onError={(e) => handleThumbnailError(e, video.id, video.title)}
                  />
                  <div className="playlist-item-info">
                    <h4>{video.title}</h4>
                    <p>{video.channel?.name || video.channelTitle || video.author || (typeof video.channel === 'string' ? video.channel : "YouTube")}</p>
                    <span>{video.views} • {video.uploadedAt}</span>
                  </div>
                  <button
                    className="icon-btn"
                    title="Xóa khỏi danh sách phát"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromPlaylist(activePlaylist.id, video.id);
                    }}
                    style={{ marginLeft: "auto", color: "#aaa", background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playlists-page-container" style={{ padding: "24px" }}>
      <div className="playlists-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff" }}>Danh sách phát</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#3ea6ff",
            color: "#0f0f0f",
            border: "none",
            borderRadius: "20px",
            padding: "8px 18px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          <Plus size={18} />
          <span>Tạo danh sách phát mới</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="no-playlists-prompt">
          <p>Bạn chưa tạo danh sách phát nào.</p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Các danh sách phát bạn tạo hoặc lưu từ video khác sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
          {playlists.map(pl => {
            const hasVideos = pl.videos && pl.videos.length > 0;
            const coverSrc = hasVideos 
              ? (pl.videos[0].thumbnailUrl || `https://i.ytimg.com/vi/${pl.videos[0].id}/hqdefault.jpg`)
              : null;

            return (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylistId(pl.id)}
                style={{
                  background: "#1f1f1f",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s, background-color 0.2s",
                  border: "1px solid rgba(255,255,255,0.06)"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ position: "relative", width: "100%", height: "150px", background: "#282828" }}>
                  {coverSrc ? (
                    <img 
                      src={coverSrc} 
                      alt={pl.title} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ListVideo size={48} color="#666" />
                    </div>
                  )}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    left: 0,
                    background: "rgba(0,0,0,0.8)",
                    padding: "6px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#fff"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ListVideo size={14} />
                      <span>{pl.videos?.length || 0} video</span>
                    </div>
                    <span>{pl.privacy}</span>
                  </div>
                </div>

                <div style={{ padding: "14px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#fff", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {pl.title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#aaa" }}>{currentUser?.name || "Bạn"}</p>
                  <span style={{ fontSize: "12px", color: "#3ea6ff", fontWeight: "500", marginTop: "8px", display: "inline-block" }}>
                    Xem toàn bộ danh sách phát
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "380px", background: "#212121", borderRadius: "12px", padding: "20px", color: "#fff" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Tạo danh sách phát mới</h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "#aaa", display: "block", marginBottom: "6px" }}>Tiêu đề</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề danh sách phát..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#121212",
                    border: "1px solid #3f3f3f",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#aaa", display: "block", marginBottom: "6px" }}>Quyền riêng tư</label>
                <select
                  value={newPrivacy}
                  onChange={e => setNewPrivacy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#121212",
                    border: "1px solid #3f3f3f",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                >
                  <option value="Công khai">Công khai</option>
                  <option value="Không công khai">Không công khai</option>
                  <option value="Riêng tư">Riêng tư</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: "14px", padding: "8px 16px" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  style={{
                    background: newTitle.trim() ? "#3ea6ff" : "#555",
                    border: "none",
                    color: "#0f0f0f",
                    borderRadius: "20px",
                    fontWeight: "600",
                    cursor: newTitle.trim() ? "pointer" : "default",
                    fontSize: "14px",
                    padding: "8px 20px"
                  }}
                >
                  Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;
