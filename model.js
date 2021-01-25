const { generateID } = require('./id');
const { store, load, del } = require('./db');

exports.Presentation = class Presentation {
  constructor(cursor = { justBefore: generateID(), justAfter: generateID() }) {
    this._presentationID = generateID();
    this._presentationCursor = cursor;
    function factory(children, cursor) {
      return { slides: children, cursor };
    }
    this.openTag = new ContentArray.Tag(true, factory, 'Presentation', this._presentationCursor);
    this._contentArray = new ContentArray(this.openTag, this.openTag.toCloseTag());
  }

  get _slides() {
    const slides = this._contentArray.toTree().slides;
    return slides;
  }

  set _slides(slides) {
    const i = this._contentArray.cursorToIndex(this._presentationCursor.justBefore);
    const j = this._contentArray.cursorToIndex(this._presentationCursor.justAfter);
    this._contentArray.replaceNodesBetweenIndicesWithin(slides, i, j, this.openTag);
    console.log({ contentArray: this._contentArray });
  }

  insertSlideJustBefore(slide, justBefore) {
    const index = this._contentArray.cursorToIndex(justBefore);
    this._contentArray.insertNodeWithoutNestingAtIndexWithin(slide, index, this.openTag);
  }

  replaceTextBetween(text, justBefore, justAfter) {
    const i = this._contentArray.cursorToIndex(justBefore);
    const j = this._contentArray.cursorToIndex(justAfter);
    this._contentArray.replaceNodesBetweenIndicesWithin([text], i, j, new exports.Slide().openTag);
  }

  replaceHTMLBetween(html, justBefore, justAfter) {
    const i = this._contentArray.cursorToIndex(justBefore);
    const j = this._contentArray.cursorToIndex(justAfter);
    this._contentArray.replaceNodesBetweenIndicesWithin([text], i, j, new exports.Slide().openTag);
  }

  getHTMLBetween(justBefore, justAfter) {
    const i = this._contentArray.cursorToIndex(justBefore);
    const j = this._contentArray.cursorToIndex(justAfter);
    return this._contentArray.getElementsBetweenIndices(i, j).map(elementToHTML).reduce((a, b) => a + b, '');
  }

  getTextBetween(justBefore, justAfter) {
    const i = this._contentArray.cursorToIndex(justBefore);
    const j = this._contentArray.cursorToIndex(justAfter);
    return this._contentArray.getElementsBetweenIndices(i, j).map(elementToText).reduce((a, b) => a + b, '');
  }

  setName(name) {
    this._name = name;
  }

  getSlideAtIndex(index) {
    return this._slides[index];
  }

  deleteSlidesBetween(justBefore, justAfter) {
    const i = this._contentArray.cursorToIndex(justBefore);
    const j = this._contentArray.cursorToIndex(justAfter);
    return this._contentArray.deleteNodesWithTagBetweenIndices(new exports.Slide().openTag, i, j);
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
    const presentation = new Presentation(obj.presentationCursor);
    for (let prop of ['presentationID', 'slides', 'name']) {
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

  toInnerContentArray() {
    return this._contentArray.slice(1, -1);
  }
}

function elementToHTML(element) {
  const open = {
    'Presentation': `    <html>
          <head>
            <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/reveal.min.css'>
            <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/theme/beige.min.css'>
          </head>
          <body>
            <div class='reveal'>
              <div class='slides'>`,
    'Slide': '<section>',
    'HTML': '',
    'Text': ''
  }
  const close = {
    'Presentation': `          </div>
            </div>
            <script src='https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.1.0/reveal.js'></script>
            <script>Reveal.initialize()</script>
          </body>
        </html>`,
    'Slide': '</section>',
    'HTML': '',
    'Text': ''
  }
  if (element instanceof ContentArray.Tag) {
    if (element.isOpenTag) {
      return open[element.name];
    } else {
      return close[element.name];
    }
  } else {
    // FIXME: Process text to be HTML friendly
    return element;
  }
}

function elementToText(element) {
  const open = {
    'Presentation': '',
    'Slide': '',
    'HTML': '',
    'Text': ''
  }
  const close = {
    'Presentation': '',
    'Slide': '',
    'HTML': '',
    'Text': ''
  }
  if (element instanceof ContentArray.Tag) {
    if (element.isOpenTag) {
      return open[element.name];
    } else {
      return close[element.name];
    }
  } else {
    // FIXME: Extract text from HTML
    return element;
  }
}

exports.Slide = class Slide {
  constructor(cursor = {
    justBefore: generateID(),
    justAfter: generateID()
  }) {
    this._slideCursor = cursor;
    this._contentChildren = [];
    function factory(children, cursor) {
      const slide = new Slide();
      slide._slideCursor = cursor;
      slide._contentChildren = children;
      return slide;
    }
    this.openTag = new ContentArray.Tag(true, factory, 'Slide', this._slideCursor);
  }

  toJSON() {
    return {
      _type: 'slide',
      slideCursor: this._slideCursor,
      contentChildren: this._contentChildren
    };
  }

  static fromJSON(obj) {
    const slide = new Slide(obj.slideCursor);
    for (let prop of ['contentChildren']) {
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

  toInnerContentArray() {
    return ContentArray.fromNodes(this._contentChildren);
  }
}

exports.Text = class Text {
  constructor(text, cursor = {
      justBefore: generateID(),
      justAfter: generateID()
    }) {
    this._cursor = cursor;
    this._text = text;
    function factory(children, cursor) {
      const text = new Text(children.join(''));
      text._cursor = cursor;
      return text;
    }
    this.openTag = new ContentArray.Tag(true, factory, 'Text', this._cursor);
  }

  toJSON() {
    return { _type: 'text', ...this._cursor, text: this._text };
  }

  static fromJSON(obj) {
    const text = new Text({ justBefore: obj.justBefore, justAfter: obj.justAfter });
    for (let prop of ['text']) {
      text[`_${prop}`] = obj[prop] === undefined ? text[`_${prop}`] : obj[prop];
    }
    return text;
  }

  toHTML() {
    // FIXME: Sanitize since this isn't meant to generate HTML.
    return this._text;
  }

  toInnerContentArray() {
    return new ContentArray(this._text);
  }
}

exports.HTML = class HTML {
  constructor(html, cursor = {
    justBefore: generateID(),
    justAfter: generateID()
  }) {
    this._cursor = cursor;
    this._html = html;
    function factory(children, cursor) {
      const html = new HTML(children.join(''));
      html._cursor = cursor;
      return html;
    }
    this.openTag = new ContentArray.Tag(true, factory, 'HTML', this._cursor);
  }

  toJSON() {
    return { _type: 'html', ...this._cursor, html: this._html };
  }

  static fromJSON(obj) {
    const html = new HTML(obj.html, { justBefore: obj.justBefore, justAfter: obj.justAfter });
    return html;
  }

  toHTML() {
    return this._html;
  }

  toInnerContentArray() {
    return new ContentArray(this._html);
  }
}

class ContentArray extends Array {
  /* Indices into this array representation the position just to the left of the element of that index. */

  static fromNodes(nodes) {
    const groupedElements = nodes.map(node => [node.openTag, ...node.toInnerContentArray(), node.openTag.toCloseTag()]);
    console.log({ groupedElements });
    return groupedElements.reduce((a, b) => a.concat(b), []);
  }

  cursorToIndex(singleCursor) {
    console.log(this.map(e => ({e, cursor: e._cursor})));
    for (let i = 0; i < this.length; i++) {
      const element = this[i];
      if (element instanceof ContentArray.Tag) {
        if (element.isOpenTag && element.getCursor().justBefore === singleCursor) {
          return i;
        } else if (!element.isOpenTag && element.getCursor().justAfter === singleCursor) {
          return i + 1;
        }
      }
    }
    throw new Error(`Cursor ${singleCursor} not found`);
  }

  toTree() {
    const nodes = [];
    const tagStack = [];
    for (let element of this) {
      if (element instanceof ContentArray.Tag) {
        if (element.isOpenTag) {
          tagStack.push({ tag: element, index: nodes.length });
        } else {
          const { tag, index } = tagStack[tagStack.length - 1];
          if (element.matches(tag)) {
            const node = tag.factory(nodes.slice(index), element.getCursor());
            nodes.splice(index, nodes.length, node);
            tagStack.pop();
          } else {
            throw new Error(`Invalid ContentArray: open tag ${tag.name} does not match close tag ${element.name}`);
          }
        }
      } else {
        nodes.push(element);
      }
    }
    if (tagStack.length) {
      throw new Error(`Invalid ContentArray: tags ${tagStack} are unclosed`);
    }
    return nodes;
  }

  insertNodeWithoutNestingAtIndexWithin(node, index, enclosingTag) {
    const tag = node.openTag;
    let otherTag = null;

    if (!this.getTagAroundIndexLikeTag(index, tag)) {
      if (!this.getTagAroundIndexLikeTag(index + 1, tag)) {
        if (!this.getTagAroundIndexLikeTag(index - 1, tag)) {
          throw new Error(`${index} is not within or adjacent to a ${enclosingTag.name}`);
        } else {
          index--;
        }
      } else {
        index++;
      }
    }

    if (otherTag = this.getTagAroundIndexLikeTag(index, tag)) {
      this.splice(index, 0, otherTag.withJustAfter(generateID()).toCloseTag(), tag, ...node.toInnerContentArray(), tag.toCloseTag(), otherTag.withJustBefore(generateID()));
    } else {
      this.splice(index, 0, tag, ...node.toInnerContentArray(), tag.toCloseTag());
    }
  }

  replaceNodesBetweenIndicesWithin(nodes, before, after, enclosingTag) {
    let actualEnclosingTag = null;
    while (!(actualEnclosingTag = this.getTagAroundIndexLikeTag(before, enclosingTag))) {
      console.log({ before, actualEnclosingTag });
      before++;
      if (before >= this.length) {
        throw new Error(`range given is not in a ${enclosingTag.name}`);
      }
    }
    let t = null;
    while (!(t = this.getTagAroundIndexLikeTag(after, enclosingTag)) || !actualEnclosingTag.matches(t.toCloseTag())) {
      console.log({ after, t });
      after--;
      if (after < before) {
        throw new Error(`range given is not in a ${enclosingTag.name}`);
      }
    }
    const elements = ContentArray.fromNodes(nodes);
    this.splice(before, after - before, ...elements);
  }

  // getNodesBetweenIndices(before, after) {
  //   const slice = this.slice(before, after);
  //   const repairedSlice = [...slice];
  //   const leftWrapper = [], rightWrapper = [];
  //   let stack = [];
  //   for (let element of slice) {
  //     if (element instanceof ContentArray.Tag) {
  //       if (element.isOpenTag) {
  //         stack.push(element);
  //       } else {
  //         if (stack.length && stack[stack.length - 1].matches(element)) {
  //           stack.pop();
  //         } else {
  //           leftWrapper.push(element.withJustAfter(generateID()));
  //           repairedSlice.unshift(element.toOpenTag().withJustBefore(generateID()));
  //         }
  //       }
  //     }
  //   }
  //   while (stack.length) {
  //     const tag = stack.pop();
  //
  //   }
  // }

  getElementsBetweenIndices(before, after) {
    return this.slice(before, after);
  }

  deleteNodesWithTagBetweenIndices(tag, before, after) {
    const elementsKept = [];
    const stack = [];
    let tempElements = [];
    function inTag() {
      return stack.some(t => t.isLike(tag));
    }
    for (let element of this.slice(before, after)) {
      if (element instanceof ContentArray.Tag) {
        if (element.isOpenTag) {
          stack.push(element);
        } else {
          if (stack.length && stack[stack.length - 1].matches(element)) {
            stack.pop();
            if (!inTag()) {
              tempElements = [];
            }
          }
        }
      }
      if (inTag()) {
        tempElements.push(element);
      } else {
        elementsKept.push(element);
      }
    }
    if (inTag()) {
      elementsKept = elementsKept.concat(tempElements);
    }

    this.splice(before, after - before, elementsKept);

    // while (!(this[before] instanceof ContentArray.Tag) || !this[before].isLike(tag) || !this[before].isOpenTag) {
    //   before++;
    // }
    // before--;
    // while (!actualEnclosingTag.matches(this.getTagAroundIndexLikeTag(after, enclosingTag))) {
    //   after--;
    // }
  }

  getTagAroundIndexLikeTag(index, tag) {
    const stack = [];
    for (let element of this.slice(0, index)) {
      if (element instanceof ContentArray.Tag && element.isLike(tag)) {
        if (element.isOpenTag) {
          stack.push(element);
        } else {
          stack.pop();
        }
      }
    }
    return stack.length ? stack[stack.length - 1] : null;
  }
}

ContentArray.Tag = class Tag {
  constructor(isOpenTag, factory, name, cursor) {
    this.isOpenTag = isOpenTag;
    this.factory = factory;
    this.name = name;
    this._cursor = cursor;
  }

  matches(otherTag) {
    return (this.isOpenTag ^ otherTag.isOpenTag)
      && this.name === otherTag.name
      && this._cursor.justBefore === otherTag._cursor.justBefore
      && this._cursor.justAfter === otherTag._cursor.justAfter;
  }

  withJustAfter(justAfter) {
    return new Tag(this.isOpenTag, this.factory, this.name, { ...this._cursor, justAfter });
  }

  withJustBefore(justBefore) {
    return new Tag(this.isOpenTag, this.factory, this.name, { ...this._cursor, justBefore });
  }

  toCloseTag() {
    return new Tag(false, this.factory, this.name, this._cursor);
  }

  isLike(otherTag) {
    return this.name === otherTag.name;
  }

  getCursor() {
    return this._cursor;
  }
};
