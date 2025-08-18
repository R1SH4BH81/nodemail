import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [status, setStatus] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });
  const [message, setMessage] = useState("");
  const [startIndex, setStartIndex] = useState(0);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 50;

  const loadContacts = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:4000/load-contacts", {
        startIndex: parseInt(startIndex, 10) || 0,
      });
      setMessage(res.data.message);
      fetchStatus();
    } catch (err) {
      console.error("Load contacts failed", err);
      setMessage("Failed to load contacts.");
    }
  };

  const sendMails = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:4000/send", {
        startIndex: parseInt(startIndex, 10) || 0,
        limit: 500,
      });
      setMessage(res.data.message);
      fetchStatus();
    } catch (err) {
      console.error("Send failed", err);
      setMessage("Failed to send mails.");
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:4000/status");
      // filter out skipped
      const filtered = res.data.progress.filter((s) => s.status !== "skipped");
      setStatus(filtered);
      setSummary(res.data.summary);
    } catch (err) {
      console.error("Status fetch failed", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // pagination logic
  const indexOfLast = currentPage * contactsPerPage;
  const indexOfFirst = indexOfLast - contactsPerPage;
  const currentContacts = status.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(status.length / contactsPerPage);

  return (
    <div className="container">
      <h1>Email Sender Dashboard</h1>

      <input
        type="number"
        value={startIndex}
        onChange={(e) => setStartIndex(e.target.value)}
        placeholder="Start Index"
        className="input"
      />
      <button onClick={loadContacts} className="upload">
        Load Contacts
      </button>
      <button onClick={sendMails} className="send">
        Send Mails
      </button>

      {message && <p className="message">{message}</p>}

      <div className="progress">
        <h2>Progress</h2>
        <p>Total: {summary.total}</p>
        <p>Sent: {summary.sent}</p>
        <p>Failed: {summary.failed}</p>
        <p>Pending: {summary.pending}</p>

        <ul>
          {currentContacts.map((s, idx) => (
            <li key={idx}>
              <span>({s.email})</span>
              <span
                className={
                  s.status === "sent"
                    ? "status-sent"
                    : s.status === "failed"
                    ? "status-failed"
                    : "status-pending"
                }
              >
                {s.status}
              </span>
            </li>
          ))}
        </ul>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
