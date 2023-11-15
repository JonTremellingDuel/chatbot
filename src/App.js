import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function App() {
  const [file, setFile] = useState(null);
  const [fileContents, setFileContents] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:3001/upload', formData);
      alert('Files uploaded successfully');
      await fetchFileContents();
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert('Error uploading files');
    }
  };

  const fetchFileContents = async () => {
    try {
      const response = await axios.get('http://localhost:3001/files');
      setFileContents(response.data.fileContents);
    } catch (error) {
      console.error(error);
    }
  };

  const openFileInNewTab = async (fileName) => {
    try {
      const response = await axios.get(`http://localhost:3001/files/${fileName}`);
      const content = response.data.content;

      const newTab = window.open();
      newTab.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>body { font-family: 'Arial, sans-serif'; }</style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
    } catch (error) {
      console.error(error);
      alert('Error fetching file content');
    }
  };

  const handleFileClick = (fileName) => {
    openFileInNewTab(fileName);
    setSelectedFile(null); // Clear selected file
  };

  const handleRemoveFile = async (fileName) => {
    try {
      setLoading(true);
      await axios.delete(`http://localhost:3001/files/${fileName}`);
      alert(`File ${fileName} removed successfully`);
      await fetchFileContents();
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert('Error removing file');
    }
  };

  const handleRemoveAll = async () => {
    try {
      setLoading(true);
      await axios.delete('http://localhost:3001/files');
      alert('All files removed successfully');
      await fetchFileContents();
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert('Error removing all files');
    }
  };

  useEffect(() => {
    fetchFileContents();
  }, []); // Fetch file contents on component mount

  return (
    <div>
      <h1>MERN Zip Upload</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      <h2>File Names</h2>
      <ul>
        {fileContents.map((file, index) => (
          <li key={index}>
            <span onClick={() => handleFileClick(file.filename)}>
              {file.filename}
            </span>{' '}
            <button onClick={() => handleRemoveFile(file.filename)} disabled={loading}>Remove</button>
          </li>
        ))}
      </ul>

      <button onClick={handleRemoveAll} disabled={loading}>Remove All</button>

      {selectedFile && (
        <div>
          <ReactMarkdown>{fileContents.find((file) => file.filename === selectedFile)?.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;
