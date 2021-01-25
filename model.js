const { generateID } = require('./id');
const { store, load, del } = require('./db');

exports.Presentation = class Presentation {
  constructor() {
    this._presentationID = generateID();
    this._presentationCursor = {
      justBefore: generateID(),
      justAfter: generateID()
    };
    this._slides = [];
  }

  insertSlideJustBefore(slide, justBefore) {
    if (justBefore === this._presentationCursor.justBefore) {
      this._slides.unshift(slide);
    } else if (justBefore === this._presentationCursor.justAfter) {
      this._slides.push(slide);
    } else {
      throw new Error('not implemented');
    }
  }

  replaceTextBetween(text, justBefore, justAfter) {
    let targetSlide = null;
    for (let slide of this._slides) {
      if (justBefore === slide.justBefore) {
        targetSlide = slide;
        break;
      }
    }
    if (targetSlide === null || justAfter !== targetSlide.justAfter) {
      throw new Error('not implemented');
    }
    return targetSlide.replaceTextBetween(text, justBefore, justAfter);
  }

  replaceHTMLBetween(html, justBefore, justAfter) {
    let targetSlide = null;
    for (let slide of this._slides) {
      if (justBefore === slide.justBefore) {
        targetSlide = slide;
        break;
      }
    }
    if (targetSlide === null || justAfter !== targetSlide.justAfter) {
      throw new Error('not implemented');
    }
    return targetSlide.replaceHTMLBetween(html, justBefore, justAfter);
  }

  getHTMLBetween(justBefore, justAfter) {
    // TODO: Create a locator function
    let targetSlide = null;
    for (let slide of this._slides) {
      if (justBefore === slide.justBefore) {
        targetSlide = slide;
        break;
      }
    }
    if (targetSlide === null || justAfter !== targetSlide.justAfter) {
      throw new Error('not implemented');
    }
    const html = targetSlide.getHTMLBetween(justBefore, justAfter);
    return `<section>${html}</section>`;
  }

  getTextBetween(justBefore, justAfter) {
    throw new Error('TODO');
  }

  setName(name) {
    this._name = name;
  }

  getSlideAtIndex(index) {
    return this._slides[index];
  }

  deleteSlidesBetween(justBefore, justAfter) {
    throw new Error('TODO');
  }

  static async lookup(fromID) {
    return await load(fromID, Presentation._deserialize);
  }

  async persist() {
    await store({ [this._presentationID]: this });
  }

  async delete() {
    await del(this._presentationID);
  }

  toJSON() {
    return {
      _type: 'presentation',
      presentationID: this._presentationID,
      presentationCursor: this._presentationCursor,
      slides: this._slides,
      name: this._name
    };
  }

  static _deserialize(key, value) {
    // TODO: Register types into here.
    const type = {
      'presentation': Presentation,
      'slide': exports.Slide,
      'text': exports.Text,
      'html': exports.HTML
    };
    if (value._type === undefined) {
      return value;
    }
    if (type[value._type] === undefined) {
      throw new Error(`Don't know how to deserialize '${value._type}' from JSON.`);
    }
    return type[value._type].fromJSON(value);
  }

  static fromJSON(obj) {
    const presentation = new Presentation();
    for (let prop of ['presentationID', 'presentationCursor', 'slides', 'name']) {
      presentation[`_${prop}`] = obj[prop] === undefined ? presentation[`_${prop}`] : obj[prop];
    }
    return presentation;
  }

  toHTML() {
    return `
    <html>
      <head>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/reveal.min.css'>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/theme/beige.min.css'>
      </head>
      <body>
        <div class='reveal'>
          <div class='slides'>
            ${this._slidesToHTML()}
          </div>
        </div>
        <script src='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/reveal.js'></script>
        <script>Reveal.initialize()</script>
      </body>
    </html>`;
  }

  _slidesToHTML() {
    return this._slides.map(slide => slide.toHTML()).reduce((a, b) => a + b, '');
  }
}

exports.Slide = class Slide {
  constructor() {
    this._slideCursor = {
      justBefore: generateID(),
      justAfter: generateID()
    }
    this._contentChildren = [];
  }

  replaceTextBetween(text, justBefore, justAfter) {
    // FIXME: Check cursors
    this._contentChildren = [text];
  }

  replaceHTMLBetween(html, justBefore, justAfter) {
    // FIXME: Check cursors
    this._contentChildren = [html];
  }

  getHTMLBetween(justBefore, justAfter) {
    // FIXME XXX: Check cursors!!!
    const html = this._contentChildrenToHTML();
    return html;
  }

  toJSON() {
    return {
      _type: 'slide',
      slideCursor: this._slideCursor,
      contentChildren: this._contentChildren
    };
  }

  static fromJSON(obj) {
    const slide = new Slide();
    for (let prop of ['slideCursor', 'contentChildren']) {
      slide[`_${prop}`] = obj[prop] === undefined ? slide[`_${prop}`] : obj[prop];
    }
    return slide;
  }

  toHTML() {
    return `
    <section>
      ${this._contentChildrenToHTML()}
    </section>`;
  }

  _contentChildrenToHTML() {
    const html = this._contentChildren
      .map(child => child.toHTML())
      .reduce((a, b) => a + b, '');
    return html;
  }

  get justBefore() {
    return this._slideCursor.justBefore;
  }

  get justAfter() {
    return this._slideCursor.justAfter;
  }
}

exports.Text = class Text {
  constructor(text) {
    this._cursor = {
      justBefore: generateID(),
      justAfter: generateID()
    };
    this._text = text;
  }

  toJSON() {
    return { _type: 'text', ...this._cursor, text: this._text };
  }

  static fromJSON(obj) {
    const text = new Text();
    for (let prop of ['text']) {
      text[`_${prop}`] = obj[prop] === undefined ? text[`_${prop}`] : obj[prop];
    }
    text._cursor = { justBefore: obj.justBefore, justAfter: obj.justAfter };
    return text;
  }

  toHTML() {
    // FIXME: Sanitize since this isn't meant to generate HTML.
    return this._text;
  }
}

exports.HTML = class HTML {
  constructor(html) {
    this._cursor = {
      justBefore: generateID(),
      justAfter: generateID()
    };
    this._html = html;
  }

  toJSON() {
    return { _type: 'html', ...this._cursor, html: this._html };
  }

  static fromJSON(obj) {
    const html = new HTML();
    for (let prop of ['html']) {
      if (obj[prop] === undefined) {
        console.warn(`HTML JSON missing property ${prop}`);
      } else {
        html[`_${prop}`] = obj[prop];
      }
    }
    html._cursor = { justBefore: obj.justBefore, justAfter: obj.justAfter };
    return html;
  }

  toHTML() {
    return this._html;
  }
}
