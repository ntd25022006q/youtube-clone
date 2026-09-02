import React, { useState, useEffect, useContext, useRef } from "react";
import { X, Copy, Check, Mic, Film, ChevronDown } from "lucide-react";
import { YoutubeContext, getFallbackAvatar } from "../context/YoutubeContext";
import "./components.css";

/* ==========================================================================
   SHARE MODAL
   ========================================================================== */
export const ShareModal = ({ video, onClose }) => {
  const [copied, setCopied] = useState(false);
  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(videoUrl).catch(() => {});
    } else {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = videoUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
