import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import logo from "./assets/DHL-Logo-PNG-Images-HD.png";


function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [article, setArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sortOption, setSortOption] = useState("recent");

  const fetchArticles = async () => {
    const res = await axios.get("http://localhost:5000/api/articles");
    setArticles(res.data);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const generateSOP = async () => {
  // validation
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
    const res = await axios.post(
      "http://localhost:5000/api/generate",
      formData
    );

    setArticle(res.data);

    // refresh articles
    fetchArticles();

    // clear search
    setSearch("");

  } catch (error) {
    console.error(error);
    alert("Failed to generate SOP.");
  }
};

  const handleSearchChange = (value) => {
    setSearch(value);
    setShowHistory(true);
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

  const selectHistoryItem = (item) => {
    setSearch(item);
    setShowHistory(false);
  };

  const updateArticleStatus = async (id, newStatus) => {
  await axios.patch(
    `http://localhost:5000/api/articles/${id}/status`,
    {
      status: newStatus,
      updatedBy: "Editor",
    }
  );

  fetchArticles();
};

const deleteArticle = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this article?"
  );

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

  return (
    <div className="page">
      <header>
        <div className="header-top">
          <img src={logo} className="logo" />
        </div>

        <h1>DHL Knowledge Article Generator</h1>

        <p>Transform messy operational input into clean SOP and KB articles.</p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Raw Input</h2>

          <textarea
            placeholder="Paste Teams message, email, or messy notes here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button onClick={generateSOP}>Generate SOP</button>
        </div>

        <div className="card">
          <h2>Generated Knowledge Article</h2>

          {!article && <p className="empty">No article generated yet.</p>}

          {article && (
            <div className="article">
              <h3>{article.title}</h3>

              <p>
                <strong>Category:</strong> {article.category}
              </p>

              {article.status && (
                <p>
                  <strong>Status:</strong> {article.status}
                </p>
              )}

              {article.creator && (
                <p>
                  <strong>Creator:</strong> {article.creator}
                </p>
              )}

              {article.tags && (
                <p>
                  <strong>Tags:</strong> {article.tags.join(", ")}
                </p>
              )}

              <h4>Symptoms</h4>
              <ul>
                {article.symptoms.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <h4>Resolution Steps</h4>
              <ol>
                {article.steps.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>

              <h4>Escalation</h4>
              <p>{article.escalation}</p>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Search Knowledge Base</h2>

        <div className="search-wrapper">
          <input
            className="search"
            placeholder="Search article e.g. AUTH_401, POD, printer..."
            value={search}
            onFocus={() => setShowHistory(true)}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />

          {showHistory && searchHistory.length > 0 && (
            <div className="search-history">
              {searchHistory.map((item, index) => (
                <div
                  className="history-item"
                  key={index}
                  onMouseDown={() => selectHistoryItem(item)}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sort-row">
          <label>Sort by: </label>

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
          <div className="saved" key={item.id}>
            <h3>{item.title}</h3>

            <p>{item.category}</p>

            <div className="status-row">
              <label>Status: </label>

              <select
                value={item.status || "Draft"}
                onChange={(e) =>
                  updateArticleStatus(item.id, e.target.value)
                }
              >
                <option value="Draft">Draft</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Published">Published</option>
              </select>
            </div>

            {item.tags && <p>Tags: {item.tags.join(", ")}</p>}

            <button
              className="delete-btn"
              onClick={() => deleteArticle(item.id)}
            >
              Delete Article
            </button>
          </div>
        ))}
      </div>
      </section>
    </div>
  );
}

export default App;