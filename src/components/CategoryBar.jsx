import React, { useContext, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockCategories } from "../data/mockData";
import { YoutubeContext } from "../context/YoutubeContext";
import "./components.css";

const CategoryBar = () => {
  const { selectedCategory, handleCategorySelect } = useContext(YoutubeContext);
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -300 : 300;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleCategoryClick = (category) => {
    handleCategorySelect(category);
  };

  return (
    <div className="category-bar-container">
      {showLeftArrow && (
        <div className="category-arrow-wrapper left">
          <button 
            className="category-arrow-btn" 
            onClick={() => handleScroll("left")}
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      )}

      <div 
        className="category-bar" 
        ref={scrollContainerRef}
        onScroll={checkScroll}
        onWheel={handleWheel}
      >
        {mockCategories.map((category) => (
          <button
            key={category}
            className={`category-pill ${selectedCategory === category ? "active" : ""}`}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {showRightArrow && (
        <div className="category-arrow-wrapper right">
          <button 
            className="category-arrow-btn" 
            onClick={() => handleScroll("right")}
            aria-label="Cuộn sang phải"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryBar;

