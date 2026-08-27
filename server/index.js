const express = require("express");
// const nodemailer = require("nodemailer");
// const fs = require("fs");
// const pdf = require("pdf-parse");
// const cors = require("cors");
const xlsx = require("xlsx");

const app = express();
app.use(cors()); // allow all origins to avoid CORS mismatch
app.use(express.json());

let contactsAll = []; // full list
let progress = []; // per-index status
let selectedStartIndex = 0; // chosen start

// Gmail transporter (App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rishabhmishra.81e@gmail.com",
    pass: "wiua lqzm bgwq",
  },
});

// helper: clamp
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

// Load contacts and mark < start as skipped, >= start as pending
app.post("/load-contacts", async (req, res) => {
  try {
    const rawStart = Number(req.body?.startIndex ?? 0);

    // Read Excel file
    const workbook = xlsx.readFile("./contact.xlsx");
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON (header row should be: Name | Email | Title | Company)
    const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    contactsAll = [];
    for (const row of jsonData) {
      const name = row.Name?.trim();
      const email = row.Email?.trim();
      const company = row.Company?.trim();

      if (name && email && company) {
        contactsAll.push({ name, email, company });
        console.log("Parsed contact:", { name, email, company });
      }
    }

    selectedStartIndex = clamp(rawStart, 0, contactsAll.length);

    // build progress statuses aligned to contactsAll
    progress = contactsAll.map((c, idx) => ({
      ...c,
      status: idx < selectedStartIndex ? "skipped" : "pending",
    }));

    res.json({
      total: contactsAll.length,
      startIndex: selectedStartIndex,
      message: `Loaded ${contactsAll.length} contacts. Will send from index ${selectedStartIndex}.`,
    });
  } catch (err) {
    console.error("Error reading contacts.xlsx:", err);
    res.status(500).json({ message: "Could not read contacts.xlsx" });
  }
});

// Send from selected index (or override) with 500/day cap
app.post("/send", async (req, res) => {
  const bodyStart = Number(req.body?.startIndex);
  const startIdx = Number.isFinite(bodyStart)
    ? clamp(bodyStart, 0, contactsAll.length)
    : selectedStartIndex;

  const cap = clamp(Number(req.body?.limit ?? 500), 1, 500);

  let sentCount = 0;
  for (let i = startIdx; i < contactsAll.length && sentCount < cap; i++) {
    if (progress[i].status !== "pending") continue; // skip already sent/failed/skipped

    try {
      const body = `
Dear ${contactsAll[i].name},

I hope this message finds you well. I am reaching out to explore opportunities at ${contactsAll[i].company}. 
As an aspiring Full Stack Developer with hands-on experience in scalable applications, automation, and cloud systems, I believe my background aligns with your talent requirements.

Key highlights from my experience:
- Led development of a scalable gaming platform at JKC Softwares, managing 1,000+ concurrent users with 99.9% uptime.
- Built and optimized a cryptocurrency exchange app at Webwise Media, improving API efficiency and app performance by 20%.
- Automated backend workflows reducing operational workload by 25% through Python and RESTful API pipelines.
- Developed ERP and real-time stock management systems using the MERN stack, boosting efficiency by 40%.

I hold AWS Cloud Foundations and Cloud Security certifications and bring proficiency in Python, JavaScript, Node.js, React, Django, and cloud-native architectures.

I have attached my CV for your review. I would welcome the opportunity to contribute my skills to ${contactsAll[i].company} and discuss how I can add value to your team.

Best regards,
Rishabh Mishra
rishabhmishra.81e@gmail.com | +91-9608333415
LinkedIn: https://www.linkedin.com/in/r1shabh81
Portfolio: https://rishabhcv.vercel.app/
`;

      await transporter.sendMail({
        from: "rishabhmishra.81e@gmail.com",
        to: contactsAll[i].email,
        subject: "Application for Opportunities",
        text: body,
        attachments: [
          {
            filename: "Rishabh_Mishra_cv.pdf",
            path: "./Rishabh_Mishra_cv.pdf",
          },
        ],
      });

      progress[i].status = "sent";
      sentCount++;
    } catch (err) {
      console.error("Mail failed idx", i, err);
      progress[i].status = "failed";
    }
  }

  res.json({
    done: true,
    message: `Sent ${sentCount} emails starting from index ${startIdx}. (cap 500)`,
    startIndexUsed: startIdx,
    sentThisRun: sentCount,
  });
});

// Status with counts
app.get("/status", (req, res) => {
  const sent = progress.filter((p) => p.status === "sent").length;
  const failed = progress.filter((p) => p.status === "failed").length;
  const pending = progress.filter((p) => p.status === "pending").length;
  const skipped = progress.filter((p) => p.status === "skipped").length;

  // next index to send (first pending)
  const nextIndex = progress.findIndex((p) => p.status === "pending");

  res.json({
    progress,
    summary: {
      total: progress.length,
      sent,
      failed,
      pending,
      skipped,
      startIndex: selectedStartIndex,
      nextIndex,
    },
  });
});

app.listen(4000, "0.0.0.0", () => console.log("Server running on port 4000"));
