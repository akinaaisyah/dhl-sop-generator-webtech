import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  Upload,
  Wrench,
  FileText,
  AlertCircle,
  Users,
  CheckCircle,
  Clock,
  Tag,
  User,
  ChevronRight,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import "./App.css";
import logo from "./assets/DHL-Logo-PNG-Images-HD.png";
import dhlBg from "./assets/dhl-background.png";

function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [article, setArticle] = useState(null);
  const [articles, setArticles] = useState([]);

  const [search, setSearch] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [sortOption, setSortOption] = useState("recent");
  const [showArticles, setShowArticles] = useState(false);

  const fetchArticles = async () => {
    const res = await axios.get("http://localhost:5000/api/articles");
    setArticles(res.data);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const generateSOP = async () => {
    if (!file && !text.trim()) {
      alert("No file uploaded or text entered.");
      return;
    }

    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else {
      formData.append("text", text);
    }

    try {
      const res = await axios.post("http://localhost:5000/api/generate", formData);
      setArticle(res.data);
      await fetchArticles();
      setSearch("");
    } catch (error) {
      console.error(error);
      alert("Failed to generate SOP.");
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      const keyword = search.trim();

      setSearchHistory((prev) => {
        const updated = [keyword, ...prev.filter((item) => item !== keyword)];
        return updated.slice(0, 5);
      });

      setShowHistory(true);
    }
  };

  const updateArticleStatus = async (id, newStatus) => {
    await axios.patch(`http://localhost:5000/api/articles/${id}/status`, {
      status: newStatus,
      updatedBy: "Editor",
    });

    await fetchArticles();
  };

  const deleteArticle = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this article?");
    if (!confirmDelete) return;

    await axios.delete(`http://localhost:5000/api/articles/${id}`);
    await fetchArticles();
  };

  const filteredArticles = articles
    .filter((item) => {
      const keyword = search.toLowerCase();

      return (
        item.title.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        (item.tags && item.tags.join(" ").toLowerCase().includes(keyword)) ||
        (item.status && item.status.toLowerCase().includes(keyword))
      );
    })
    .sort((a, b) => {
      if (sortOption === "alphabetical") {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const getArticleIcon = (category) => {
    if (category?.toLowerCase().includes("upload")) return <Upload size={24} />;
    if (category?.toLowerCase().includes("onboarding")) return <Users size={24} />;
    return <FileText size={24} />;
  };

  const getStatusIcon = (status) => {
    if (status === "Published") return <CheckCircle size={14} />;
    if (status === "Reviewed") return <Clock size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <img src={logo} className="logo" />

          <h1>DHL Knowledge Article Generator</h1>
          <p>Transform messy operational input into clean SOP and KB articles.</p>
        </div>

        <div className="hero-visual">
          <img src={dhlBg} alt="DHL Background" />
        </div>
      </header>
      <section className="top-grid">
        <div className="card input-card">
          <h2>Raw Input</h2>
          <div className="title-line"></div>

          <textarea
            placeholder="Paste Teams message, email, or messy notes here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <label className="file-box">
            <Paperclip size={18} />
            <span>Choose File</span>
            <input
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <small>{file ? file.name : "No file chosen"}</small>
          </label>

          <button className="generate-btn" onClick={generateSOP}>
            <Wrench size={20} />
            Generate SOP
          </button>
        </div>

        <div className="card article-card">
          <h2>Generated Knowledge Article</h2>
          <div className="title-line"></div>

          {!article && <p className="empty">No article generated yet.</p>}

          {article && (
            <div className="article">
              <h3>{article.title}</h3>

              <div className="meta-box">
                <div>
                  <FileText size={16} />
                  <strong>Category:</strong> {article.category}
                </div>

                {article.status && (
                  <div>
                    <CheckCircle size={16} />
                    <strong>Status:</strong> {article.status}
                  </div>
                )}

                {article.creator && (
                  <div>
                    <User size={16} />
                    <strong>Creator:</strong> {article.creator}
                  </div>
                )}

                {article.tags && (
                  <div>
                    <Tag size={16} />
                    <strong>Tags:</strong> {article.tags.join(", ")}
                  </div>
                )}
              </div>

              <div className="article-two-col">
                <div>
                  <h4>
                    <AlertCircle size={18} />
                    Symptoms
                  </h4>
                  <ul>
                    {article.symptoms.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>
                    <Wrench size={18} />
                    Resolution Steps
                  </h4>
                  <ol>
                    {article.steps.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="escalation">
                <h4>
                  <Users size={18} />
                  Escalation
                </h4>
                <p>{article.escalation}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card kb-card">
        <h2>Search Knowledge Base</h2>
        <div className="title-line"></div>

        <div className="search-row">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />

            <input
              className="search"
              placeholder="Search article e.g. AUTH_401, POD, printer..."
              value={search}
              onFocus={() => setShowHistory(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowHistory(true);
              }}
              onKeyDown={handleSearchKeyDown}
            />

            {showHistory && searchHistory.length > 0 && (
              <div className="search-history">
                {searchHistory.map((item, index) => (
                  <div
                    className="history-item"
                    key={index}
                    onMouseDown={() => {
                      setSearch(item);
                      setShowHistory(false);
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="toggle-btn"
            onClick={() => setShowArticles(!showArticles)}
          >
            {showArticles ? "Hide Articles" : "Show Articles"}
            {showArticles ? <ChevronUp size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {(showArticles || search.trim() !== "") && (
          <>
            <div className="sort-row">
              <label>Sort by:</label>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="recent">Recent Upload</option>
                <option value="alphabetical">Alphabetical A-Z</option>
              </select>
            </div>

            <div className="article-list">
              {filteredArticles.map((item) => (
                <div
                  className="saved"
                  key={item.id}
                  onClick={() => setArticle(item)}
                >
                  <div className="saved-icon">
                    {getArticleIcon(item.category)}
                  </div>

                  <div className="saved-main">
                    <h3>{item.title}</h3>
                    <p>{item.category}</p>

                    {item.tags && (
                      <span className="tag-line">
                        <Tag size={14} />
                        {item.tags.join(", ")}
                      </span>
                    )}
                  </div>

                  <div className={`status-pill ${item.status?.toLowerCase() || "draft"}`}>
                    {getStatusIcon(item.status)}
                    {item.status || "Draft"}
                  </div>

                  <select
                    className="status-select"
                    value={item.status || "Draft"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateArticleStatus(item.id, e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Published">Published</option>
                  </select>

                  <button
                    className="delete-mini"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteArticle(item.id);
                    }}
                  >
                    Delete
                  </button>

                  <ChevronRight size={20} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default App;