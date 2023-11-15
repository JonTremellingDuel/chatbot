// client/src/FileViewer.js
import React from 'react';
import ReactMarkdown from 'react-markdown';

const FileViewer = ({ fileContents }) => {
  return (
    <div>
      <h2>File Contents</h2>
      <ReactMarkdown>{fileContents}</ReactMarkdown>
    </div>
  );
};

export default FileViewer;
