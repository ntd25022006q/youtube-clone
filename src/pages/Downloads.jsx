import React from "react";
import "./pages.css";

const Downloads = () => {
  return (
    <div className="downloads-page-container">
      <div className="downloads-header">
        <h1>Nội dung tải xuống</h1>
      </div>
      <div className="no-downloads-prompt">
        <p>Bạn chưa tải video nào xuống.</p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Các video bạn tải xuống sẽ xuất hiện tại đây để xem ngoại tuyến khi không có mạng.
        </p>
      </div>
    </div>
  );
};

export default Downloads;
