
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const ARTICLES_FILE = "articles.json";

function readArticles() {
  if (!fs.existsSync(ARTICLES_FILE)) return [];
  return JSON.parse(fs.readFileSync(ARTICLES_FILE, "utf8"));
}

function writeArticles(articles) {
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
}

function saveArticle(article) {
  const articles = readArticles();

  const alreadyExists = articles.some(
    (item) =>
      item.title === article.title &&
      item.rawText.trim() === article.rawText.trim()
  );

  if (!alreadyExists) {
    articles.push(article);
    writeArticles(articles);
  }

  return article;
}

function generateSOP(rawText, creator = "Editor") {
  const lower = rawText.toLowerCase();

  let title = "Generated Knowledge Article";
  let category = "General Operations";
  let tags = ["general"];
  let symptoms = [];
  let steps = [];
  let escalation =
    "Escalate to supervisor or IT support if the issue is not resolved.";

  if (lower.includes("auth_401") || lower.includes("not authorized")) {
    title = "AUTH_401 - User Not Authorized to Access Module";
    category = "System Access Issue";
    tags = ["AUTH_401", "access", "AD group"];
    symptoms = [
      "User cannot access the required system module.",
      "System displays AUTH_401 or unauthorized access error."
    ];
    steps = [
      "Check the user's AD group access.",
      "Confirm the user is assigned to OPS_FWD_ROLE.",
      "Ask the user to logout and login again.",
      "Retry accessing the module."
    ];
  } else if (lower.includes("pod") || lower.includes("file size too large")) {
    title = "POD Upload Failed Due to Large File Size";
    category = "Document Upload Issue";
    tags = ["POD", "upload", "file size"];
    symptoms = ["POD upload fails.", "System shows file size too large."];
    steps = [
      "Compress the POD image before uploading.",
      "Use JPEG format instead of PNG.",
      "Upload the compressed file.",
      "Refresh the screen twice after upload."
    ];
  } else if (lower.includes("label") || lower.includes("printer")) {
    title = "Label Not Printing Properly";
    category = "Printer Issue";
    tags = ["label", "printer", "toner"];
    symptoms = [
      "Shipping label does not print correctly.",
      "Printed label is blurred or incomplete."
    ];
    steps = [
      "Restart the printer service.",
      "Clear the printer queue.",
      "Reprint the label.",
      "If the label is still blurred, replace the toner."
    ];
  } else if (lower.includes("invalid routing code")) {
    title = "Shipment Error - Invalid Routing Code";
    category = "Shipment Processing Issue";
    tags = ["routing", "shipment", "country code"];
    symptoms = [
      "Shipment is stuck during processing.",
      "System displays Invalid Routing Code."
    ];
    steps = [
      "Refresh the shipment data.",
      "Logout from the system.",
      "Login again.",
      "Reprocess the shipment.",
      "Check that the country code is MY, not SG.",
      "If the issue persists, raise an IT ticket with screenshot."
    ];
  } else if (lower.includes("postcode") || lower.includes("address")) {
    title = "Customer Address Invalid Due to Missing Postcode";
    category = "Booking Validation Issue";
    tags = ["address", "postcode", "booking"];
    symptoms = [
      "Customer address validation fails.",
      "Postcode is missing or incorrect."
    ];
    steps = [
      "Add the postcode manually.",
      "Revalidate the customer address.",
      "Save the updated address.",
      "Continue the booking process."
    ];
  } else if (lower.includes("new staff") || lower.includes("ad account")) {
    title = "New Staff System Access Setup";
    category = "User Onboarding";
    tags = ["new staff", "AD account", "SAP"];
    symptoms = [
      "New staff cannot access required systems.",
      "SAP or email access is not ready."
    ];
    steps = [
      "Create AD account.",
      "Provide email access.",
      "Assign SAP and CW1 role.",
      "Share SOP folder access.",
      "Follow up if SAP request approval is delayed."
    ];
  } else {
    tags = ["general", "knowledge base"];
    symptoms = [
      "Raw operational information received from chat, email, document, or screenshot."
    ];
    steps = [
      "Review the raw information.",
      "Identify the main issue.",
      "Extract the resolution steps.",
      "Validate the steps with the responsible team.",
      "Save as a standardized knowledge article."
    ];
  }

  return {
    id: Date.now(),
    title,
    category,
    tags,
    creator,
    status: "Draft",
    rawText,
    symptoms,
    steps,
    escalation,
    history: [
      {
        status: "Draft",
        updatedBy: creator,
        updatedAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

app.post("/api/generate", upload.single("file"), async (req, res) => {
  try {
    let rawText = "";
    const creator = req.body.creator || "Editor";

    if (req.file) {
      const filePath = req.file.path;
      const fileName = req.file.originalname.toLowerCase();

      if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ path: filePath });
        rawText = result.value;
      } else if (fileName.endsWith(".pdf")) {
        const pdfBuffer = fs.readFileSync(filePath);
        const result = await pdfParse(pdfBuffer);
        rawText = result.text;
      } else {
        rawText = fs.readFileSync(filePath, "utf8");
      }
    } else {
      rawText = req.body.text || "";
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: "Raw input cannot be empty." });
    }

    const article = generateSOP(rawText, creator);
    saveArticle(article);

    res.json(article);
  } catch (error) {
    console.error("Generate SOP error:", error);
    res.status(500).json({ error: "Failed to generate SOP article." });
  }
});

app.get("/api/articles", (req, res) => {
  res.json(readArticles());
});
// status update code here
app.patch("/api/articles/:id/status", (req, res) => {
  const articles = readArticles();
  const articleId = Number(req.params.id);
  const { status, updatedBy } = req.body;

  const allowedStatuses = ["Draft", "Reviewed", "Published"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const article = articles.find((item) => item.id === articleId);

  if (!article) {
    return res.status(404).json({ error: "Article not found." });
  }

  if (!article.history) {
    article.history = [];
  }

  article.status = status;
  article.updatedAt = new Date().toISOString();

  article.history.push({
    status,
    updatedBy: updatedBy || "Editor",
    updatedAt: new Date().toISOString()
  });

  writeArticles(articles);

  res.json(article);
});



app.delete("/api/articles/:id", (req, res) => {
  const articles = readArticles();
  const articleId = Number(req.params.id);

  const updatedArticles = articles.filter((item) => item.id !== articleId);

  if (articles.length === updatedArticles.length) {
    return res.status(404).json({ error: "Article not found." });
  }

  writeArticles(updatedArticles);

  res.json({ message: "Article deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});