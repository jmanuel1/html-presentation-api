const express = require('express');
const app = express();
const port = 4000;

const { Presentation, Slide, Text, HTML } = require('./model');


// middleware

app.use(async (req, res, next) => {
  req.presentation = await Presentation.lookup(req.query.presentationID) || null;
  next();
});

app.post('/presentation/create', async (req, res) => {
  const presentation = new Presentation();
  await presentation.persist();
  res.send(presentation);
});

app.get('/presentation/export/html', async (req, res) => {
  const { presentationID } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  res.send(presentation.toHTML());
});

app.patch('/presentation/title/update', async (req, res) => {
  const presentation = await Presentation.lookup(req.query.presentationID);
  presentation.setName(req.query.name);
  await presentation.persist();
  res.status(204);
});

app.delete('/presentation/delete', async (req, res) => {
  const { presentationID } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  await presentation.delete();
  res.status(204);
});

app.patch('/slide/create', async (req, res) => {
  const presentation = await Presentation.lookup(req.query.presentationID);
  const justBefore = req.query.justBefore;
  const slide = new Slide();
  presentation.insertSlideJustBefore(slide, justBefore);
  await presentation.persist();
  res.send(slide);
});

app.get('/slide', async (req, res) => {
  const { presentationID } = req.query;
  const index = +req.query.index;
  const presentation = Presentation.lookup(presentationID);
  const slide = presentation.getSlideAtIndex(index);
  res.send(slide);
});

app.patch('/slide/delete', async (req, res) => {
  const { justBefore, justAfter } = req.query;
  req.presentation.deleteSlidesBetween(justBefore, justAfter);
  await req.presentation.persist();
  res.status(204);
});

app.patch('/text/replace', async (req, res) => {
  const { justBefore, justAfter, presentationID, text } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  const textObject = new Text(text);
  presentation.replaceTextBetween(textObject, justBefore, justAfter);
  await presentation.persist();
  res.send(textObject);
});

app.get('/text', async (req, res) => {
  const { justBefore, justAfter } = req.query;
  const text = req.presentation.getTextBetween(justBefore, justAfter);
  res.send(text);
});

app.patch('/html/replace', async (req, res) => {
  const { justBefore, justAfter, presentationID, html } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  const htmlObject = new HTML(html);
  presentation.replaceHTMLBetween(htmlObject, justBefore, justAfter);
  await presentation.persist();
  res.send(htmlObject);
});

app.get('/html', async (req, res) => {
  const { presentationID, justBefore, justAfter } = req.query;
  const presentation = await Presentation.lookup(presentationID);
  const html = presentation.getHTMLBetween(justBefore, justAfter);
  res.send(html);
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
