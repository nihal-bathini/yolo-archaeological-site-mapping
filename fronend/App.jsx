import { useState } from "react";
import axios from "axios";

export default function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("vegetation");

  const API_URL = "http://127.0.0.1:8000";

  // background images
  const backgroundImage =
    type === "vegetation"
      ? "https://st.focusedcollection.com/23619988/i/650/focused_266529980-stock-photo-rows-lush-green-vegetation-scenic.jpg" // forest
      : "https://platthillnursery.com/wp-content/uploads/2021/04/platt-hill-beginners-guide-garden-soil-healthy-turned-soil.jpg"; // soil

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setOutput(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setOutput(null);
    }
  };

  const handlePredict = async () => {
    if (!image) {
      alert("Please upload an image first!");
      return;
    }

    setLoading(true);
    setOutput(null);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const endpoint =
        type === "vegetation"
          ? `${API_URL}/predict/vegetation`
          : `${API_URL}/predict/soil`;

      const res = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setOutput(res.data);
    } catch (error) {
      console.error("Prediction failed:", error);
      alert("Prediction failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "#333",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* semi-transparent overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(255, 255, 255, 0.75)",
          zIndex: 0,
        }}
      ></div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1000px",
          margin: "auto",
          padding: "40px 20px",
          textAlign: "center",
          flexGrow: 1,
        }}
      >
        <h2><b>🌿Vegetation and Soil Analyzer</b></h2>
        <p style={{ color: "#050505ff" }}><b>Upload an image and get prediction</b></p>

        {/* Type Selector */}
        <div style={{ marginTop: "20px" }}>
          <label style={{ fontWeight: "bold" }}>
            <input
              type="radio"
              name="type"
              value="vegetation"
              checked={type === "vegetation"}
              onChange={() => setType("vegetation")}
            />{" "}
            Vegetation
          </label>
          &nbsp;&nbsp;&nbsp;
          <label style={{ fontWeight: "bold" }}>
            <input
              type="radio"
              name="type"
              value="soil"
              checked={type === "soil"}
              onChange={() => setType("soil")}
            />{" "}
            Soil
          </label>
        </div>

        {/* Upload Box */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: "2px dashed #888",
            borderRadius: "12px",
            padding: "30px",
            marginTop: "25px",
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.85)",
            cursor: "pointer",
            transition: "0.3s",
          }}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <p style={{ color: "#333", fontSize: "16px", margin: 0 }}>
            <b>Choose a file</b> or drag & drop it here
          </p>
        </div>

        {/* Predict Button */}
        <div style={{ marginTop: "25px" }}>
          <button
            onClick={handlePredict}
            disabled={loading}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              padding: "12px 30px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            {loading ? "Processing..." : "Run Prediction"}
          </button>
        </div>

        {/* Input & Output side by side */}
        {(preview || output) && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              marginTop: "40px",
              flexWrap: "wrap",
              gap: "40px",
            }}
          >
            {/* Input Image */}
            {preview && (
              <div style={{ textAlign: "center" }}>
                <h3><b> Input Image</b></h3>
                <img
                  src={preview}
                  alt="Uploaded"
                  style={{
                    maxWidth: "400px",
                    borderRadius: "8px",
                    boxShadow: "0 0 15px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            )}

            {/* Output Image */}
            {output && (output.annotated_png_b64 || output.overlay_png_b64) && (
              <div style={{ textAlign: "center" }}>
                <h3> <b>Output Image</b></h3>
                <img
                  src={`data:image/png;base64,${
                    output.annotated_png_b64 || output.overlay_png_b64
                  }`}
                  alt="Result"
                  style={{
                    maxWidth: "400px",
                    borderRadius: "8px",
                    boxShadow: "0 0 15px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Result Box in center */}
        {output && (
          <div
            style={{
              marginTop: "40px",
              marginInline: "auto",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "25px",
              borderRadius: "12px",
              maxWidth: "600px",
              boxShadow: "0 0 15px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ textAlign: "center" }}> <b>Prediction Results</b></h3>
            <hr />
            {type === "soil" && output.boxes && output.boxes.length > 0 && (
              <div style={{ textAlign: "center", lineHeight: "1.8" }}>
                <p>
                  <b>Label:</b> {output.boxes[0].label}
                </p>
                <p>
                  <b>Confidence:</b>{" "}
                  {(output.boxes[0].conf * 100).toFixed(2)}%
                </p>
              </div>
            )}
            {type === "vegetation" && (
              <div style={{ textAlign: "center", lineHeight: "1.8" }}>
                <p>
                  <b>Coverage:</b> {output.coverage_pct?.toFixed(2)}%
                </p>
                <p>
                  <b>Segments:</b> {output.segments}
                </p>
                <p>
                  <b>Processing Time:</b> {output.processingTime}s
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Section */}
      <footer
        style={{
          textAlign: "center",
          padding: "15px 10px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderTop: "1px solid rgba(0,0,0,0.1)",
          zIndex: 2,
          position: "relative",
        }}
      >
        <p style={{ margin: 0, color: "#333", fontSize: "14px" }}>
          <b>A project developed as part of Infosys Springboard Internship 6.0</b>
          <br />
          <b>Nihal Bathini</b>
        </p>
      </footer>
    </div>
  );
}
