import React, { useContext } from "react";
import { mockCategories } from "../data/mockData";
import { YoutubeContext } from "../context/YoutubeContext";
import "./components.css";

const CategoryBar = () => {
  const { selectedCategory, setSelectedCategory, setActiveVideo } = useContext(YoutubeContext);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setActiveVideo(null); // Go back to feed if we were watching a video
  };

  return (
    <div className="category-bar">
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
  );
};

export default CategoryBar;
