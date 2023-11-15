import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import AdmZip from 'adm-zip';
import cors from 'cors';
import fs from 'fs';
import { promisify } from 'util';
import { loadDocs, dropDocs } from "./store.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
mongoose.connect('mongodb://localhost:27017/mern_zip_upload', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const File = mongoose.model('File', {
  filename: String,
  content: Buffer,
});

const reloadDocs = async () => {
    await dropDocs();
    await loadDocs();
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();
    
        const fileContents = [];
    
        for (const entry of zipEntries) {
          const entryContent = entry.getData();
          const entryFileName = entry.entryName;
    
          // Only save files with a .md extension to the database
          if (entryFileName.endsWith('.md')) {
            const filePath = `files/${entryFileName.replaceAll(' ', '-')}`;
            const writeFile = promisify(fs.writeFile);
            await writeFile(filePath, entryContent);

            // Check if a file with the same filename already exists
            const existingFile = await File.findOne({ filename: entryFileName });
            if (existingFile) {
                // Update the content of the existing file or handle it as needed
                existingFile.content = entryContent;
                await existingFile.save();
            } else {
                // Create a new file and save it to the collection
                const newFile = new File({
                    filename: entryFileName,
                    content: entryContent,
                });
                await newFile.save();
            }
    
            // Optionally, you can push the content to an array to send back to the client
            fileContents.push({
              filename: entryFileName,
              content: entryContent.toString('utf8'), // Convert buffer to string if necessary
            });
          }
        }

      await reloadDocs();
  
      // Send the file contents back to the client if needed
      res.status(200).json({ fileContents });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.get('/files/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const file = await File.findOne({ filename });
  
      if (!file) {
        return res.status(404).send('File not found');
      }
  
      res.status(200).json({ content: file.content.toString('utf8') });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.delete('/files/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const deletedFile = await File.findOneAndDelete({ filename });
  
      if (!deletedFile) {
        return res.status(404).send('File not found');
      }
  
      await reloadDocs();
      res.status(200).send(`File ${filename} removed successfully`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.delete('/files', async (req, res) => {
    try {
      await File.deleteMany(); // Remove all files from the database
      await reloadDocs();
      res.status(200).send('All files removed successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

// New endpoint to retrieve file contents from the database
app.get('/files', async (req, res) => {
  try {
    const files = await File.find();
    const fileContents = files.map((file) => ({
      filename: file.filename,
      content: file.content.toString('utf8'), // Convert buffer to string if necessary
    }));

    res.status(200).json({ fileContents });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/files-store', async (req, res) => {
    try {
      const files = await File.find();
      const fileContents = files.map((file) => ({
        filename: file.filename,
        content: file.content.toString('utf8'), // Convert buffer to string if necessary
      }));
  
      for (let i=0; i<files.length; i++) {
        const file = files[i];
        const fileContents = file.content.toString('utf8');
        const filePath = `files/${file.filename.replaceAll(' ', '-')}`;
        const writeFile = promisify(fs.writeFile);
        await writeFile(filePath, fileContents);
      }
      res.status(200).json({ fileContents });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
