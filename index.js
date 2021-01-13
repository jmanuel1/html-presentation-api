const express = require('express');
const app = express();
const port = 4000;

const { Presentation, Slide, Text, HTML } = require('./model');

app.get('/presentation/create', async (req, res) => {
  const presentation = new Presentation();
  await presentation.persist();
  res.send(presentation);
});

app.get('/slide/create', async (req, res) => {
  const presentation = await Presentation.lookup(req.query.presentationID);
  const justBefore = req.query.justBefore;
  const slide = new Slide();
  presentation.insertSlideJustBefore(slide, justBefore);
  await presentation.persist();
  res.send(slide);
});

app.get('/text/replace', async (req, res) => {
  const { justBefore, justAfter, presentationID, text } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  const textObject = new Text(text);
  presentation.replaceTextBetween(textObject, justBefore, justAfter);
  await presentation.persist();
  res.send(textObject);
});

app.get('/presentation/export/html', async (req, res) => {
  const { presentationID } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  res.send(presentation.toHTML());
});

app.patch('/html/replace', async (req, res) => {
  const { justBefore, justAfter, presentationID, html } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  const htmlObject = new HTML(html);
  presentation.replaceHTMLBetween(htmlObject, justBefore, justAfter);
  await presentation.persist();
  res.send(htmlObject);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
