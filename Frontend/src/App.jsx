import "./App.css";
import { useState } from "react";
import axios from "axios";

export default function App() {
  const [input, setInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const PF = process.env.REACT_APP_PUBLIC_FOLDER;

  const handleChange = (e) => {
    setInput(e.target.value);
  };

  const handleClick = async (e) => {
    e.preventDefault();
    setDisabled(true);
    console.log("Download clicked for:", input);
    const res = await axios.post(`/?url=${input}`);
    const downloadURL = `${PF}download/${res.data.videoId}`;
    window.open(downloadURL, "_blank");
    setDisabled(false);
  };

  return (
    <>
      <div className="main">
        <h1>
          Download your favorite YouTube video at the highest quality
        </h1>
        <div className="link">
          <input
            type="text"
            placeholder="Enter the link"
            value={input}
            onChange={handleChange}
          />
          <button disabled={disabled} onClick={handleClick}>Download</button>
        </div>
      </div>
    </>
  );
}
