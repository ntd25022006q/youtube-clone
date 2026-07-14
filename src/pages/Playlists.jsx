import React from "react";
import "./pages.css";

const Playlists = () => {
  return (
    <div className="playlists-page-container">
      <div className="playlists-header">
        <h1>Danh sách phát</h1>
      </div>
      <div className="no-playlists-prompt">
        <p>Bạn chưa tạo danh sách phát nào.</p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Các danh sách phát bạn tạo hoặc lưu từ video khác sẽ xuất hiện ở đây.
        </p>
      </div>
    </div>
  );
};

export default Playlists;
