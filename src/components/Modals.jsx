import React, { useState, useEffect, useContext, useRef } from "react";
import { X, Copy, Check, Mic, Film, ChevronDown } from "lucide-react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import "./components.css";

/* ==========================================================================
   SHARE MODAL
   ========================================================================== */
export const ShareModal = ({ video, onClose }) => {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const videoUrl = `${origin}/watch?v=${video.id}`;

  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(videoUrl);
        success = true;
      }
    } catch (e) {}

    if (!success) {
      try {
        const ta = document.createElement("textarea");
        ta.value = videoUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        success = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e) {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareOptions = [
    { label: "Facebook", icon: "📘", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}` },
    { label: "Twitter", icon: "🐦", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(video.title || "")}` },
    { label: "WhatsApp", icon: "💬", href: `https://wa.me/?text=${encodeURIComponent(videoUrl)}` },
    { label: "Zalo", icon: "🟦", href: `https://zalo.me/?url=${encodeURIComponent(videoUrl)}` },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chia sẻ</h3>
          <button className="close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="share-body">
          {/* Social share buttons */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            {shareOptions.map(opt => (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  color: "#fff", textDecoration: "none", fontSize: "12px",
                  background: "#3f3f3f", borderRadius: "12px", padding: "12px 16px",
                  minWidth: "64px", cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "24px" }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </a>
            ))}
          </div>
          <p className="share-description" style={{ color: "#aaa", marginBottom: "8px", fontSize: "13px" }}>Sao chép liên kết</p>
          <div className="share-link-container">
            <input type="text" readOnly value={videoUrl} className="share-input-field" />
            <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? "Đã sao chép!" : "Sao chép"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ==========================================================================
   VOICE SEARCH MODAL
   ========================================================================== */
export const VoiceSearchModal = ({ onClose }) => {
  const { setSearchQuery, setActiveVideo, setActivePage } = useContext(YoutubeContext);
  const [statusText, setStatusText] = useState("Đang lắng nghe...");
  const [audioLevel, setAudioLevel] = useState(1);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Web Audio API visualizer
  useEffect(() => {
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let javascriptNode = null;
    let stream = null;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((s) => {
        stream = s;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.7;
        analyser.fftSize = 256;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;

          const length = array.length;
          for (let i = 0; i < length; i++) {
            values += array[i];
          }

          const average = values / length;
          // Scale it to a nice number for styling: 1.0 to ~2.2
          const scale = 1 + (average / 15);
          setAudioLevel(scale > 2.2 ? 2.2 : scale < 1 ? 1 : scale);
        };
      })
      .catch((err) => {
        console.warn("Microphone access for visualizer denied:", err);
      });

    return () => {
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close().catch(() => {});
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    let active = true;
    let accumulatedText = "";
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false; // single-shot mode is extremely robust for search inputs
    recognition.interimResults = true;
    recognition.lang = "vi-VN";

    const startRecognition = () => {
      if (!active) return;
      try {
        recognition.start();
      } catch (e) {
        // already started
      }
    };

    recognition.onstart = () => {
      setStatusText("Đang lắng nghe... Hãy nói gì đó");
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setStatusText("Không thể truy cập Micro. Vui lòng cho phép quyền truy cập.");
        active = false;
      } else if (event.error === "no-speech") {
        setStatusText("Không nghe thấy giọng nói. Đang thử lại...");
      } else if (event.error === "network") {
        setStatusText("Lỗi kết nối mạng. Đang thử lại...");
      }
    };

    recognition.onend = () => {
      if (active) {
        if (accumulatedText.trim()) {
          setStatusText(`Nhận diện: "${accumulatedText}"`);
          setTimeout(() => {
            setSearchQuery(accumulatedText.trim());
            setActiveVideo(null);
            setActivePage("search");
            onClose();
          }, 600);
        } else {
          // Restart recognition if nothing was detected
          setTimeout(() => {
            startRecognition();
          }, 400);
        }
      }
    };

    recognition.onresult = (event) => {
      let resultText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        resultText += event.results[i][0].transcript;
      }

      if (resultText.trim()) {
        accumulatedText = resultText;
        setStatusText(`Đang nghe: "${resultText}"`);
      }
    };

    startRecognition();

    return () => {
      active = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [onClose, setSearchQuery, setActiveVideo, setActivePage]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content voice-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn top-right-close" onClick={onClose} aria-label="Đóng tìm kiếm bằng giọng nói">
          <X size={20} />
        </button>
        <div className="voice-body">
          <h2 className="voice-status" style={{ minHeight: "60px", padding: "0 20px" }}>{statusText}</h2>
          <div className="voice-mic-circle-outer" style={{ transform: `scale(${audioLevel})`, transition: "transform 0.05s ease-out" }}>
            <div className="voice-mic-circle-inner" style={{ background: "#ff0000" }}>
              <Mic size={40} className="text-white" style={{ color: "#ffffff" }} />
            </div>
            <div className="pulse-ring ring-1" style={{ transform: `scale(${1 + (audioLevel - 1) * 0.4})` }}></div>
            <div className="pulse-ring ring-2" style={{ transform: `scale(${1 + (audioLevel - 1) * 0.7})` }}></div>
          </div>
          <p className="voice-tip">Thử nói "nhạc trẻ mới nhất", "vtv24" hoặc "sơn tùng mtp"</p>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   CREATE VIDEO MODAL
   ========================================================================== */
export const CreateVideoModal = ({ onClose }) => {
  const { uploadVideo } = useContext(YoutubeContext);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [category, setCategory] = useState("Coding");
  const [duration, setDuration] = useState("10:00");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !youtubeUrl.trim() || !channelName.trim()) return;

    // Extract video ID from youtube URL if possible
    let videoId = youtubeUrl;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }

    const channelId = channelName.toLowerCase().replace(/\s+/g, "");

    const newVideo = {
      id: videoId,
      title,
      description: description || "No description provided.",
      videoUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channel: {
        id: channelId,
        name: channelName,
        avatar: getFallbackAvatar(channelName),
        subscribers: "1 subscriber",
        subscribersCount: 1,
      },
      category,
      views: "0 views",
      viewsCount: 0,
      uploadedAt: "Just now",
      duration,
      likes: "0",
      likesCount: 0,
      comments: [],
    };

    uploadVideo(newVideo);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Film size={20} className="text-red" />
            <h3>Upload video</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close upload modal">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="create-video-form">
          <div className="form-group">
            <label htmlFor="video-title">Title *</label>
            <input
              type="text"
              id="video-title"
              placeholder="Add a title that describes your video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="video-url">YouTube Video URL or ID *</label>
            <input
              type="text"
              id="video-url"
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
            />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="channel-name">Channel Name *</label>
              <input
                type="text"
                id="channel-name"
                placeholder="e.g. MyTechChannel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="video-duration">Duration</label>
              <input
                type="text"
                id="video-duration"
                placeholder="e.g. 12:45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="video-category">Category</label>
            <select
              id="video-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="Coding">Coding</option>
              <option value="Music">Music</option>
              <option value="Tech">Tech</option>
              <option value="Gaming">Gaming</option>
              <option value="ASMR">ASMR</option>
              <option value="Comedy">Comedy</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="video-desc">Description</label>
            <textarea
              id="video-desc"
              rows="4"
              placeholder="Tell viewers about your video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div className="form-actions-footer">
            <button type="button" className="form-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="form-submit-btn">
              Publish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==========================================================================
   GOOGLE LOGIN MODAL
   ========================================================================== */
export const GoogleLoginModal = ({ onClose }) => {
  const { login } = useContext(YoutubeContext);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("email"); // "email" or "name"
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelectAccount = (name, email) => {
    setLoading(true);
    setTimeout(() => {
      login({
        name,
        email,
        avatar: getFallbackAvatar(name)
      });
      setLoading(false);
      onClose();
    }, 800);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const emailVal = emailInput.trim();
    if (!emailVal) return;
    if (!emailVal.toLowerCase().endsWith("@gmail.com")) {
      setErrorMsg("Vui lòng nhập địa chỉ Gmail hợp lệ kết thúc bằng @gmail.com (ví dụ: tenban@gmail.com). Đăng nhập bằng số điện thoại không được hỗ trợ.");
      return;
    }
    setErrorMsg("");
    setMode("name");
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    handleSelectAccount(nameInput.trim(), emailInput.trim());
  };

  return (
    <div className="google-modal-overlay" onClick={onClose} style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      fontFamily: "Roboto, Arial, sans-serif"
    }}>
      <div className="google-modal-content" onClick={e => e.stopPropagation()} style={{
        width: "450px",
        minHeight: "500px",
        padding: "40px",
        borderRadius: "8px",
        background: "#ffffff",
        color: "#202124",
        position: "relative",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box"
      }}>
        {/* Header Close button */}
        <button className="google-close-btn" onClick={onClose} aria-label="Đóng" style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#5f6368",
          padding: "8px",
          borderRadius: "50%"
        }}>
          <X size={20} />
        </button>

        {/* Top Section */}
        <div>
          {/* Google Logo */}
          <div className="google-logo" style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "24px",
            fontSize: "24px",
            fontWeight: "500"
          }}>
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" }}>
              <div className="google-spinner" style={{
                width: "40px",
                height: "40px",
                border: "3px solid #f3f3f3",
                borderTop: "3px solid #1a73e8",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ marginTop: "24px", fontSize: "16px", color: "#202124", fontWeight: "400" }}>Đang đăng nhập...</p>
            </div>
          ) : mode === "email" ? (
            <div style={{ width: "100%" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "400", margin: "0 0 8px 0", color: "#202124", textAlign: "center" }}>Đăng nhập</h2>
              <p style={{ fontSize: "16px", color: "#202124", margin: "0 0 28px 0", textAlign: "center" }}>để tiếp tục đến YouTube</p>

              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={e => {
                      setEmailInput(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    required
                    placeholder="Địa chỉ Gmail của bạn"
                    style={{
                      width: "100%",
                      padding: "16px 14px",
                      borderRadius: "4px",
                      border: errorMsg ? "2px solid #d93025" : "1px solid #dadce0",
                      fontSize: "16px",
                      color: "#202124",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={e => e.target.style.borderColor = errorMsg ? "#d93025" : "#1a73e8"}
                    onBlur={e => e.target.style.borderColor = errorMsg ? "#d93025" : "#dadce0"}
                  />
                  {errorMsg && (
                    <div style={{ color: "#d93025", fontSize: "12px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", textAlign: "left" }}>
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="16px" height="16px" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <span style={{ fontSize: "14px", color: "#1a73e8", fontWeight: "500", cursor: "pointer" }}>
                    Tạo tài khoản
                  </span>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 24px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#1a73e8",
                      color: "#ffffff",
                      fontWeight: "500",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)"
                    }}
                  >
                    Tiếp theo
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "400", margin: "0 0 8px 0", color: "#202124", textAlign: "center" }}>Chào mừng</h2>
              
              {/* Selected Email Pill */}
              <div 
                onClick={() => setMode("email")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "100px",
                  border: "1px solid #dadce0",
                  fontSize: "14px",
                  color: "#3c4043",
                  cursor: "pointer",
                  margin: "0 auto 24px auto",
                  display: "table"
                }}
              >
                <span>{emailInput}</span>
                <ChevronDown size={14} style={{ display: "inline-block", verticalAlign: "middle" }} />
              </div>

              <form onSubmit={handleNameSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    required
                    placeholder="Họ và tên của bạn"
                    style={{
                      width: "100%",
                      padding: "16px 14px",
                      borderRadius: "4px",
                      border: "1px solid #dadce0",
                      fontSize: "16px",
                      color: "#202124",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={e => e.target.style.borderColor = "#1a73e8"}
                    onBlur={e => e.target.style.borderColor = "#dadce0"}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <span 
                    onClick={() => setMode("email")}
                    style={{ fontSize: "14px", color: "#1a73e8", fontWeight: "500", cursor: "pointer" }}
                  >
                    Quay lại
                  </span>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 24px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#1a73e8",
                      color: "#ffffff",
                      fontWeight: "500",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)"
                    }}
                  >
                    Đăng nhập
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info (Google UI) */}
        {!loading && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#757575",
            marginTop: "32px",
            borderTop: "1px solid #f1f3f4",
            paddingTop: "16px"
          }}>
            <span>Tiếng Việt</span>
            <div style={{ display: "flex", gap: "16px" }}>
              <span style={{ cursor: "pointer" }}>Trợ giúp</span>
              <span style={{ cursor: "pointer" }}>Bảo mật</span>
              <span style={{ cursor: "pointer" }}>Điều khoản</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   SAVE TO PLAYLIST MODAL
   ========================================================================== */
export const PlaylistModal = ({ video, onClose }) => {
  const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, watchLater, toggleWatchLater, currentUser, setShowLoginModal } = useContext(YoutubeContext);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [privacy, setPrivacy] = useState("Công khai");

  if (!currentUser) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "380px", padding: "24px", textAlign: "center" }}>
          <h3 style={{ marginBottom: "12px" }}>Bạn muốn lưu video này?</h3>
          <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>Đăng nhập để thêm video này vào danh sách phát.</p>
          <button className="google-signin-btn-blue" style={{ margin: "0 auto" }} onClick={() => { onClose(); setShowLoginModal(true); }}>
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const pl = createPlaylist(newTitle.trim(), privacy);
    if (pl && video) {
      addToPlaylist(pl.id, video);
    }
    setNewTitle("");
    setShowNewForm(false);
  };

  const isWatchLater = video && watchLater.includes(video.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content playlist-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "340px", background: "#212121", borderRadius: "12px", padding: "16px", color: "#fff" }}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Lưu video vào...</h3>
          <button className="close-btn" onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div className="playlist-list-container" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "240px", overflowY: "auto" }}>
          {/* Watch later option */}
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px" }}>
            <input
              type="checkbox"
              checked={isWatchLater}
              onChange={() => video && toggleWatchLater(video)}
              style={{ width: "18px", height: "18px", accentColor: "#3ea6ff", cursor: "pointer" }}
            />
            <span>Xem sau</span>
          </label>

          {/* User playlists */}
          {playlists.map(pl => {
            const checked = video && pl.videos && pl.videos.some(v => v.id === video.id);
            return (
              <label key={pl.id} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      removeFromPlaylist(pl.id, video.id);
                    } else {
                      addToPlaylist(pl.id, video);
                    }
                  }}
                  style={{ width: "18px", height: "18px", accentColor: "#3ea6ff", cursor: "pointer" }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.title}</span>
              </label>
            );
          })}
        </div>

        <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "16px 0" }} />

        {!showNewForm ? (
          <button
            onClick={() => setShowNewForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              border: "none",
              color: "#3ea6ff",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              padding: "4px 0"
            }}
          >
            <span>+ Tạo danh sách phát mới</span>
          </button>
        ) : (
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#aaa", display: "block", marginBottom: "4px" }}>Tên</label>
              <input
                type="text"
                placeholder="Nhập tên danh sách phát..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#121212",
                  border: "1px solid #3f3f3f",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "13px"
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#aaa", display: "block", marginBottom: "4px" }}>Quyền riêng tư</label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#121212",
                  border: "1px solid #3f3f3f",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "13px"
                }}
              >
                <option value="Công khai">Công khai</option>
                <option value="Không công khai">Không công khai</option>
                <option value="Riêng tư">Riêng tư</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: "13px", padding: "6px 12px" }}
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
                  borderRadius: "18px",
                  fontWeight: "600",
                  cursor: newTitle.trim() ? "pointer" : "default",
                  fontSize: "13px",
                  padding: "6px 16px"
                }}
              >
                Tạo
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   REPORT MODAL
   ========================================================================== */
export const ReportModal = ({ video, onClose }) => {
  const { showToast } = useContext(YoutubeContext);
  const [reason, setReason] = useState("Nội dung không phù hợp");

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast("Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét video này.");
    onClose();
  };

  const reasons = [
    "Nội dung khiêu dâm hoặc phản cảm",
    "Nội dung bạo lực hoặc phản cảm",
    "Nội dung lăng mạ hoặc xúc phạm",
    "Hành vi quấy rối hoặc bắt nạt",
    "Hành động nguy hại hoặc nguy hiểm",
    "Thông tin sai lệch hoặc gây hiểu lầm",
    "Spam hoặc lừa đảo"
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px", background: "#212121", borderRadius: "12px", padding: "20px", color: "#fff" }}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Báo cáo vi phạm video</h3>
          <button className="close-btn" onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {reasons.map((r) => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer" }}>
              <input
                type="radio"
                name="reportReason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                style={{ accentColor: "#3ea6ff" }}
              />
              <span>{r}</span>
            </label>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
            <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", padding: "8px 16px" }}>
              Hủy
            </button>
            <button type="submit" style={{ background: "#3ea6ff", border: "none", color: "#0f0f0f", fontWeight: "600", borderRadius: "18px", padding: "8px 20px", cursor: "pointer" }}>
              Tiếp tục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==========================================================================
   KEYBOARD SHORTCUTS MODAL
   ========================================================================== */
export const KeyboardShortcutsModal = ({ onClose }) => {
  const shortcuts = [
    { key: "k / Phím cách", desc: "Phát / Tạm dừng" },
    { key: "j", desc: "Tua lùi lại 10 giây" },
    { key: "l", desc: "Tua nhanh 10 giây" },
    { key: "← / →", desc: "Tua lùi / tiến 5 giây" },
    { key: "↑ / ↓", desc: "Tăng / Giảm âm lượng" },
    { key: "m", desc: "Tắt / Bật tiếng" },
    { key: "f", desc: "Toàn màn hình" },
    { key: "t", desc: "Chế độ rạp chiếu phim" },
    { key: "i", desc: "Trình thu nhỏ (Miniplayer)" },
    { key: "c", desc: "Bật / Tắt phụ đề" },
    { key: "0 - 9", desc: "Nhảy đến 0% - 90% thời lượng video" },
    { key: "Shift + >", desc: "Tăng tốc độ phát" },
    { key: "Shift + <", desc: "Giảm tốc độ phát" },
    { key: "Shift + N", desc: "Chuyển sang video tiếp theo" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px", background: "#212121", borderRadius: "12px", padding: "24px", color: "#fff" }}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600" }}>Phím tắt bàn phím</h3>
          <button className="close-btn" onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
          {shortcuts.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              <span style={{ color: "#aaa", fontSize: "13px" }}>{s.desc}</span>
              <kbd style={{ background: "#333", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", color: "#fff" }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
